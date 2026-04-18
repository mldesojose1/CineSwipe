/**
 * SwipeCard.optimized.tsx
 *
 * Versión memoizada de SwipeCard con justificación de cada decisión.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  DIAGNÓSTICO DEL PROBLEMA                                               │
 * │                                                                         │
 * │  Cada swipe → dispatch() → MovieContext state cambia →                  │
 * │  MovieHistoryProvider re-renderiza → App re-renderiza →                 │
 * │  SwipeCard recibe prop `movie` con NUEVA referencia de objeto           │
 * │  (el literal `{ id, title, ... }` en JSX es un nuevo objeto en RAM     │
 * │  en cada render) → SwipeCard re-renderiza aunque los datos sean         │
 * │  idénticos.                                                             │
 * │                                                                         │
 * │  Cadena completa:                                                       │
 * │  dispatch → Context re-render → App re-render → nuevo `movie` obj      │
 * │  → SwipeCard re-render (aunque la película no cambió)                   │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import React, {
  useState,
  useCallback,
  useMemo,
  PointerEvent,
  KeyboardEvent,
  useRef,
  memo,
} from 'react';

export type SwipeDirection = 'left' | 'right';

export interface MovieData {
  id: string | number;
  title: string;
  posterUrl: string;
  year: number;
  rating: number;
}

export interface SwipeCardProps {
  movie: MovieData;
  onSwipe: (direction: SwipeDirection) => void;
  threshold?: number;
}

// Helper para construir URLs de TMDB por tamaño
const buildTmdbUrl = (posterUrl: string, size: 'w300' | 'w500'): string =>
  posterUrl.replace(/\/t\/p\/\w+\//, `/t/p/${size}/`);

// ─────────────────────────────────────────────────────────────────────────────
// DECISIÓN 1: React.memo con comparador personalizado
//
// ¿POR QUÉ memo?
//   Sin memo, cada re-render de App (provocado por dispatch al Context)
//   re-renderiza SwipeCard incondicionalmente, aunque sus props no hayan
//   cambiado en valor. memo hace una comparación shallow antes de renderizar.
//
// ¿POR QUÉ comparador personalizado en lugar del shallow por defecto?
//   La prop `movie` es un object literal creado INLINE en App.tsx:
//     movie={{ id: ..., title: ..., ... }}
//   Eso crea una nueva referencia en cada render de App → la comparación
//   shallow (===) siempre falla → memo sin comparador no sirve de nada.
//   Con el comparador: comparamos por `movie.id` y `onSwipe`.
//   Si el ID no cambió → misma película → skip render.
//
// ¿Cuándo SÍ re-renderiza?
//   - Cuando `movie.id` cambia (el usuario hizo swipe, nueva película)
//   - Cuando `onSwipe` cambia de referencia (por eso necesitamos useCallback
//     en App.tsx, ver App.optimized.tsx)
//   - Cuando `threshold` cambia (rara vez)
// ─────────────────────────────────────────────────────────────────────────────
const SwipeCardInner: React.FC<SwipeCardProps> = ({ movie, onSwipe, threshold = 80 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX]         = useState(0);
  const [offsetX, setOffsetX]       = useState(0);
  const [isLoaded, setIsLoaded]     = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // DECISIÓN 2: NO usar useCallback en los handlers internos de Pointer/Key
  //
  // ¿POR QUÉ NO?
  //   handlePointerDown, handlePointerMove, etc. se pasan a elementos DOM
  //   nativos (<div onPointerDown={...}>), NO a componentes React hijos.
  //   El DOM no hace comparación de referencias para decidir si re-adjuntar
  //   listeners. Por tanto, memoizarlos con useCallback:
  //     a) No evitaría ningún re-render (no hay Child components que reciban
  //        estas funciones como props)
  //     b) Añadiría overhead de memoización innecesario
  //     c) Haría el código más difícil de leer sin beneficio real
  // ─────────────────────────────────────────────────────────────────────────
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    setStartX(e.clientX);
    setOffsetX(0);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setOffsetX(e.clientX - startX);
  };

  const handlePointerUpOrCancel = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (offsetX > threshold)       onSwipe('right');
    else if (offsetX < -threshold) onSwipe('left');
    else                           setOffsetX(0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') { onSwipe('right'); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { onSwipe('left'); e.preventDefault(); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DECISIÓN 3: NO usar useMemo en dynamicTransform
  //
  // ¿POR QUÉ NO?
  //   dynamicTransform depende de `offsetX` e `isDragging`, que cambian en
  //   CADA evento de pointer move (60 veces/segundo en un swipe normal).
  //   useMemo en este caso:
  //     a) El objeto siempre sería diferente (offsetX cambia constantemente)
  //        → el memo nunca reutilizaría el valor cacheado
  //     b) Añadiría el costo de comparar las dependencias en cada render
  //   Conclusión: memoizar valores que cambian en cada render es más caro
  //   que no memoizarlos.
  // ─────────────────────────────────────────────────────────────────────────
  const dynamicTransform = {
    transform: `translate3d(${offsetX}px, 0, 0) rotate(${offsetX * 0.05}deg)`,
    transition: isDragging ? 'none' : 'transform 0.3s ease-out',
  };

  const showLike    = offsetX > threshold;
  const showDislike = offsetX < -threshold;

  // ─────────────────────────────────────────────────────────────────────────
  // DECISIÓN 4: useMemo para las URLs de srcset
  //
  // ¿POR QUÉ SÍ?
  //   buildTmdbUrl hace una operación regex (String.replace con /regex/) en
  //   cada render. Aunque es barata, se ejecutaría en CADA pointer move
  //   (durante el drag) → potencialmente 60×/seg. Con useMemo:
  //     - Se recalcula solo cuando movie.posterUrl cambia (= nueva película)
  //     - Durante el drag (offsetX cambia constantemente) → valor cacheado
  //
  // ¿POR QUÉ `movie.posterUrl` como dependencia y no `movie`?
  //   Usar `movie` (el objeto) como dependencia fallaría: el comparador de
  //   useMemo usa ===, y `movie` es un nuevo objeto en cada render de App
  //   (aunque el comparador de memo evite el re-render del componente en sí,
  //   dentro del componente las referencias a `movie` son las del render
  //   actual). Usar `movie.posterUrl` (string primitivo) garantiza
  //   comparación por valor.
  // ─────────────────────────────────────────────────────────────────────────
  const { src300, src500 } = useMemo(() => ({
    src300: buildTmdbUrl(movie.posterUrl, 'w300'),
    src500: buildTmdbUrl(movie.posterUrl, 'w500'),
  }), [movie.posterUrl]);

  // ─────────────────────────────────────────────────────────────────────────
  // DECISIÓN 5: useCallback para handleLoad (onLoad de la imagen)
  //
  // ¿POR QUÉ SÍ?
  //   handleLoad se pasa como prop `onLoad` al elemento <img> nativo.
  //   Los elementos DOM nativos no se re-crean por referencia, PERO como
  //   el componente está dentro de React.memo, si handleLoad cambia en
  //   cada render de SwipeCard (lo haría sin useCallback: `() => setIsLoaded(true)`
  //   es un nuevo closure en cada render) y más adelante se decidiera
  //   extraer la imagen a un subcomponente, provocaría re-renders.
  //   Aquí el beneficio es marginal (DOM no lo nota), pero es un buen
  //   hábito cuando el callback modifica estado y puede ser llamado
  //   frecuentemente. Lo incluimos como ejemplo correcto.
  //
  //   NOTA HONESTA: Para este caso concreto el impacto es mínimo.
  //   Es más valiosa como patrón documentado que como optimización real.
  // ─────────────────────────────────────────────────────────────────────────
  const handleLoad = useCallback(() => setIsLoaded(true), []);

  return (
    <div
      ref={cardRef}
      tabIndex={0}
      role="button"
      aria-label={`Swipe right to like or left to dislike ${movie.title}`}
      className="relative w-72 h-96 rounded-2xl shadow-xl overflow-hidden cursor-grab active:cursor-grabbing focus:outline-none focus:ring-4 focus:ring-blue-500 touch-none select-none"
      style={dynamicTransform}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      onKeyDown={handleKeyDown}
    >
      {/* Placeholder shimmer */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          opacity: isLoaded ? 0 : 1,
          transition: 'opacity 0.4s ease-out',
          pointerEvents: 'none',
          zIndex: 1,
        }}
        className="poster-placeholder"
      />

      {/* Imagen principal con lazy loading y srcset */}
      <img
        src={src500}
        srcSet={`${src300} 300w, ${src500} 500w`}
        sizes="(max-width: 640px) 300px, 500px"
        alt={movie.title}
        loading="lazy"
        decoding="async"
        draggable="false"
        onLoad={handleLoad}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
          zIndex: 2,
          filter: isLoaded ? 'blur(0px)' : 'blur(8px)',
          transform: isLoaded ? 'scale(1)' : 'scale(1.05)',
          opacity: isLoaded ? 1 : 0.6,
          transition: 'filter 0.4s ease-out, transform 0.4s ease-out, opacity 0.4s ease-out',
          willChange: 'filter, transform, opacity',
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" style={{ zIndex: 3 }} />

      <div className="absolute bottom-0 left-0 right-0 p-4 text-white pointer-events-none" style={{ zIndex: 4 }}>
        <h2 className="text-2xl font-bold truncate">{movie.title}</h2>
        <div className="flex items-center space-x-2 mt-1 text-sm text-gray-200">
          <span className="font-medium bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">{movie.year}</span>
          <span className="flex items-center text-yellow-400 font-bold">
            ★ <span className="ml-1 text-white">{movie.rating.toFixed(1)}</span>
          </span>
        </div>
      </div>

      {showLike && (
        <div className="absolute top-8 left-8 border-4 border-green-500 text-green-500 font-extrabold text-4xl py-1 px-4 rounded-lg transform -rotate-12 bg-black/30 backdrop-blur-sm pointer-events-none" style={{ zIndex: 5 }}>
          LIKE
        </div>
      )}
      {showDislike && (
        <div className="absolute top-8 right-8 border-4 border-red-500 text-red-500 font-extrabold text-4xl py-1 px-4 rounded-lg transform rotate-12 bg-black/30 backdrop-blur-sm pointer-events-none" style={{ zIndex: 5 }}>
          NOPE
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Comparador personalizado para React.memo
//
// ¿POR QUÉ no usar el comparador por defecto (shallow ===)?
//   La prop `movie` es siempre una nueva referencia objeto desde App.tsx
//   porque se crea inline: movie={{ id, title, ... }}
//   El shallow comparator usa ===, que fallaría para objetos aunque los
//   valores sean idénticos. Necesitamos comparar por valores primitivos.
//
// ¿Qué comparamos?
//   - movie.id: si cambió → nueva película → DEBE re-renderizar
//   - onSwipe:  si cambió de referencia → el callback del padre cambió
//               → puede tener closures distintos → DEBE re-renderizar
//               (por eso en App.tsx necesitamos useCallback — ver abajo)
//   - threshold: primitivo, comparación directa
//
// ¿Qué NO comparamos?
//   - movie.title, movie.year, movie.rating, movie.posterUrl
//     Si el id es el mismo, estos campos no cambian (son datos de TMDB
//     inmutables por película). Comparar más campos solo añade costo
//     sin beneficio real en este dominio.
// ─────────────────────────────────────────────────────────────────────────────
function arePropsEqual(prev: SwipeCardProps, next: SwipeCardProps): boolean {
  return (
    prev.movie.id  === next.movie.id  &&
    prev.onSwipe   === next.onSwipe   &&
    prev.threshold === next.threshold
  );
}

export const SwipeCard = memo(SwipeCardInner, arePropsEqual);
