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

// ─── Componente interno (sin exportar) ─────────────────────────────────────
// Se envuelve en memo() al final del archivo con comparador personalizado
const SwipeCardInner: React.FC<SwipeCardProps> = ({ movie, onSwipe, threshold = 80 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  // Handlers de pointer/key: NO se memoizan con useCallback porque
  // se asignan a elementos DOM nativos. El DOM no compara referencias
  // de funciones → memoizarlos añade costo sin evitar ningún re-render.
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
    if (offsetX > threshold) onSwipe('right');
    else if (offsetX < -threshold) onSwipe('left');
    else setOffsetX(0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') { onSwipe('right'); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { onSwipe('left'); e.preventDefault(); }
  };

  // dynamicTransform: NO se memoiza — depende de offsetX que cambia
  // 60×/seg durante el drag → useMemo nunca reutilizaría el valor
  const dynamicTransform = {
    transform: `translate3d(${offsetX}px, 0, 0) rotate(${offsetX * 0.05}deg)`,
    transition: isDragging ? 'none' : 'transform 0.3s ease-out',
  };

  const showLike = offsetX > threshold;
  const showDislike = offsetX < -threshold;

  // useMemo para URLs: regex se ejecutaría 60×/seg sin memoización
  // Se recalcula solo cuando posterUrl cambia (= nueva película)
  const { src300, src500 } = useMemo(() => ({
    src300: buildTmdbUrl(movie.posterUrl, 'w300'),
    src500: buildTmdbUrl(movie.posterUrl, 'w500'),
  }), [movie.posterUrl]);

  // useCallback para handleLoad: función estable, buena práctica
  // aunque el impacto en DOM nativo sea marginal
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

      {/* Imagen sin lazy loading, con alta prioridad para mejorar LCP + srcset + blur-up */}
      <img
        src={src500}
        srcSet={`${src300} 300w, ${src500} 500w`}
        sizes="(max-width: 640px) 300px, 500px"
        alt={movie.title}
        fetchPriority="high"
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

      <div
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"
        style={{ zIndex: 3 }}
      />

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

// ─── React.memo con comparador personalizado ──────────────────────────────
// Sin comparador: memo usa ===, que falla para el objeto `movie` (siempre
// nueva referencia desde App.tsx aunque los valores sean idénticos).
// Con comparador: solo re-renderiza cuando cambia el ID de la película.
function arePropsEqual(prev: SwipeCardProps, next: SwipeCardProps): boolean {
  return (
    prev.movie.id === next.movie.id &&
    prev.onSwipe === next.onSwipe &&
    prev.threshold === next.threshold
  );
}

export const SwipeCard = memo(SwipeCardInner, arePropsEqual);
