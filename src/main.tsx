import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { MovieHistoryProvider } from './context/MovieContext'
import { isTMDBDiscoverResponse } from './types/tmdb.types'

// ─────────────────────────────────────────────────────────────────────────────
// PREFETCH ANTICIPADO — se ejecuta ANTES de que React monte
//
// ¿Por qué aquí y no en index.html?
//   La clave VITE_TMDB_KEY es una variable de entorno que Vite inyecta
//   en tiempo de build mediante static replacement (import.meta.env.*).
//   Un <script> raw en index.html no tiene acceso a esa sustitución.
//   main.tsx es el primer archivo procesado por Vite → aquí sí funciona.
//
// ¿Por qué antes de ReactDOM.createRoot()?
//   El browser parsea y ejecuta este módulo de forma secuencial.
//   El fetch() se lanza inmediatamente al evaluar el módulo, sin esperar
//   a que React monte. Esto maximiza el solapamiento temporal:
//
//   t=0ms  │ main.tsx se evalúa → fetch() lanzado
//   t=50ms │ React bundle parseado → createRoot() ejecutado
//   t=100ms│ App monta → useMovies corre → ya hay datos en sessionStorage ✅
//   t=800ms│ (sin prefetch) primera respuesta de red llega
// ─────────────────────────────────────────────────────────────────────────────

// Constantes que deben coincidir EXACTAMENTE con las de useMovies.ts
// (misma clave de cache → mismo formato → zero coordinación en runtime)
const PREFETCH_CACHE_KEY = 'cineswipe_cache_page=1&genreId=&year=';
const PREFETCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutos, igual que useMovies

function hasFreshCache(): boolean {
  try {
    const raw = sessionStorage.getItem(PREFETCH_CACHE_KEY);
    if (!raw) return false;
    const { timestamp } = JSON.parse(raw);
    return Date.now() - timestamp < PREFETCH_CACHE_TTL;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// window.__cineswipe_prefetch__: Promise global para deduplicación
//
// Problema que resuelve:
//   Si el prefetch NO termina antes de que useMovies corra (red lenta),
//   el hook no encontraría datos en sessionStorage y lanzaría su propio
//   fetch → 2 requests simultáneos a TMDB (desperdicio + posible rate limit).
//
//   Solución: useMovies comprueba si esta Promise existe antes de decidir
//   hacer su propio fetch. Si existe, espera a que termine, luego re-verifica
//   sessionStorage. El contrato público del hook (parámetros / retorno) NO cambia.
//
// Por qué window y no una variable de módulo:
//   useMovies.ts y main.tsx son módulos distintos. Compartir una variable
//   de módulo requeriría un import circular o un módulo compartido adicional.
//   window es el singleton del browser → zero coupling entre módulos.
// ─────────────────────────────────────────────────────────────────────────────
declare global {
  interface Window {
    __cineswipe_prefetch__: Promise<unknown> | null;
  }
}

const apiKey = import.meta.env.VITE_TMDB_KEY;

if (apiKey && !hasFreshCache()) {
  // Lanza el fetch sin await, almacena la Promise para que useMovies la atienda
  window.__cineswipe_prefetch__ = fetch(
    'https://api.themoviedb.org/3/discover/movie' +
    '?include_adult=false&include_video=false&language=en-US&page=1',
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        accept: 'application/json',
      },
    }
  )
    .then(res => {
      if (!res.ok) throw new Error(`Prefetch failed: ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (isTMDBDiscoverResponse(data)) {
        // Escribe con el mismo esquema que useMovies: { timestamp, data }
        sessionStorage.setItem(
          PREFETCH_CACHE_KEY,
          JSON.stringify({ timestamp: Date.now(), data })
        );
      }
      return data;
    })
    .catch(() => null) // Fallo silencioso: useMovies hará el fetch normal
    .finally(() => {
      // Limpiar después de resolverse para no bloquear GC
      window.__cineswipe_prefetch__ = null;
    });
} else {
  window.__cineswipe_prefetch__ = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// React mount — DESPUÉS del prefetch iniciado (pero sin await: no bloquea)
// ─────────────────────────────────────────────────────────────────────────────
const App = lazy(() => import('./app/App'))

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MovieHistoryProvider>
      <Suspense
        fallback={
          <div
            style={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(160deg, #0f1923 0%, #1a2535 60%, #0f1923 100%)',
              color: '#6b7280',
              fontSize: '0.9rem',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Cargando CineSwipe...
          </div>
        }
      >
        <App />
      </Suspense>
    </MovieHistoryProvider>
  </React.StrictMode>,
)
