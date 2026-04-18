import { useState, useCallback, useMemo } from 'react';
import { SwipeCard, SwipeDirection } from '../components/movie/SwipeCard';
import { useMovies } from '../hooks/useMovies';
import { useMovieActions } from '../context/MovieContext';

const App = () => {
  const { movies, loading, error, loadMore } = useMovies();
  const dispatch = useMovieActions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [btnActive, setBtnActive] = useState<'left' | 'right' | null>(null);

  // ─── useCallback: LA pieza crítica para que React.memo en SwipeCard funcione ──
  // Sin useCallback, handleSwipe es una nueva función en cada render de App.
  // React.memo compara `onSwipe` con ===  →  siempre falla → SwipeCard
  // re-renderiza igualmente, anulando cualquier memoización en SwipeCard.
  // Con useCallback: la referencia es estable mientras las dependencias no cambien.
  //
  // Dependencias: movies, currentIndex, loadMore, dispatch
  //   - dispatch: estable (React garantiza que useReducer dispatch no cambia)
  //   - loadMore: viene de useCallback dentro de useMovies → también estable
  //   - movies, currentIndex: cambian solo cuando hay nuevos datos o swipe
  //     → en ese caso SÍ queremos una nueva función (tiene nuevos datos)
  const handleSwipe = useCallback((direction: SwipeDirection) => {
    const movie = movies[currentIndex];
    if (!movie) return;

    setBtnActive(direction === 'right' ? 'right' : 'left');
    setTimeout(() => setBtnActive(null), 300);

    if (direction === 'right') {
      dispatch({ type: 'SWIPE_RIGHT', payload: movie });
    } else {
      dispatch({ type: 'SWIPE_LEFT', payload: movie });
    }

    setCurrentIndex(prev => prev + 1);

    if (currentIndex >= movies.length - 2) {
      loadMore();
    }
  }, [movies, currentIndex, loadMore, dispatch]);

  const currentMovie = movies[currentIndex];
  const hasMovie = movies.length > 0 && currentIndex < movies.length;

  // ─── useMemo: evita crear un nuevo objeto `movie` en cada render ───────────
  // El problema raíz: `movie={{ id, title, ... }}` inline en JSX crea un nuevo
  // objeto en CADA render de App, aunque los valores sean idénticos.
  // React.memo en SwipeCard compara la prop `movie` con ===:
  //   nuevo objeto !== objeto anterior  →  siempre re-renderiza.
  // Con useMemo: el mismo objeto en RAM mientras currentMovie.id no cambie.
  //
  // Dependencias primitivas (NO el objeto `currentMovie` completo):
  //   Usar `currentMovie` como dependencia fallaría igual que el problema
  //   original: cada fetch recrea el array → nueva referencia de objeto.
  //   Usamos los campos primitivos individuales como dependencias
  //   para una comparación por valor real.
  const movieProp = useMemo(() => {
    if (!currentMovie) return null;
    return {
      id:        currentMovie.id,
      title:     currentMovie.title,
      posterUrl: currentMovie.poster_path
        ? `https://image.tmdb.org/t/p/w500${currentMovie.poster_path}`
        : 'https://via.placeholder.com/500x750?text=No+Poster',
      year:      new Date(currentMovie.release_date).getFullYear(),
      rating:    currentMovie.vote_average,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentMovie?.id,          // Cambia solo al hacer swipe (nueva película)
    currentMovie?.poster_path, // Siempre ligado al id, pero explícito
    currentMovie?.vote_average // Podría actualizarse si TMDB cambia el score
  ]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #0f1923 0%, #1a2535 60%, #0f1923 100%)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* App title */}
      <h1
        style={{
          fontSize: '2.2rem',
          fontWeight: 900,
          marginBottom: '1.5rem',
          background: 'linear-gradient(90deg, #a78bfa, #ec4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.5px',
        }}
      >
        CineSwipe
      </h1>

      {/* RECOMENDACIÓN badge */}
      {hasMovie && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '14px',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#9ca3af',
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 6px #22c55e',
              display: 'inline-block',
            }}
          />
          Recomendación
        </div>
      )}

      {/* Card area */}
      <div style={{ position: 'relative', width: 288, height: 384 }}>
        {loading && !hasMovie ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              fontSize: '0.9rem',
            }}
          >
            Cargando películas...
          </div>
        ) : error ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              fontWeight: 700,
              border: '2px dashed #ef4444',
              borderRadius: 16,
              padding: 16,
              textAlign: 'center',
              fontSize: '0.85rem',
            }}
          >
            {error}
          </div>
        ) : hasMovie && currentMovie ? (
          <SwipeCard
            key={currentMovie.id}
            movie={movieProp!}   // Referencia estable via useMemo
            onSwipe={handleSwipe} // Referencia estable via useCallback
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              fontSize: '0.9rem',
            }}
          >
            No hay más películas para ti hoy 🎬
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {hasMovie && (
        <div
          style={{
            display: 'flex',
            gap: '28px',
            marginTop: '28px',
            alignItems: 'center',
          }}
        >
          {/* Dislike — X */}
          <button
            id="btn-dislike"
            aria-label="No me gusta"
            onClick={() => handleSwipe('left')}
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: '2px solid #ef4444',
              background: btnActive === 'left' ? '#ef444433' : 'transparent',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
              transform: btnActive === 'left' ? 'scale(0.9)' : 'scale(1)',
              boxShadow:
                btnActive === 'left'
                  ? '0 0 18px #ef444466'
                  : '0 2px 12px #00000040',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 16px #ef444455';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 12px #00000040';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Like — Heart */}
          <button
            id="btn-like"
            aria-label="Me gusta"
            onClick={() => handleSwipe('right')}
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: '2px solid #22c55e',
              background: btnActive === 'right' ? '#22c55e33' : 'transparent',
              color: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
              transform: btnActive === 'right' ? 'scale(0.9)' : 'scale(1)',
              boxShadow:
                btnActive === 'right'
                  ? '0 0 18px #22c55e66'
                  : '0 2px 12px #00000040',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 16px #22c55e55';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 12px #00000040';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
        </div>
      )}

      {/* Hint */}
      <p
        style={{
          marginTop: '20px',
          color: '#4b5563',
          fontSize: '0.75rem',
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        Arrastra la tarjeta o usa los botones
      </p>
    </div>
  );
};

export default App;
