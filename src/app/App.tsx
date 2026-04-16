import React, { useState } from 'react';
import { SwipeCard, SwipeDirection } from '../components/movie/SwipeCard';
import { useMovies } from '../hooks/useMovies';
import { useMovieActions } from '../context/MovieContext';

const App = () => {
  // Uses our brand new API Hook (Will connect properly now that you placed the env key)
  const { movies, loading, error, loadMore } = useMovies();
  const dispatch = useMovieActions();
  
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSwipe = (direction: SwipeDirection) => {
    const movie = movies[currentIndex];
    
    // Save locally
    if (direction === 'right') {
      dispatch({ type: 'SWIPE_RIGHT', payload: movie });
      console.log(`Liked: ${movie.title}`);
    } else {
      dispatch({ type: 'SWIPE_LEFT', payload: movie });
      console.log(`Disliked: ${movie.title}`);
    }

    // Go to next movie
    setCurrentIndex(prev => prev + 1);

    // Naive fetch more when running out
    if (currentIndex >= movies.length - 2) {
      loadMore();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        CineSwipe
      </h1>
      
      <div className="relative w-72 h-96">
        {loading && currentIndex >= movies.length ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            Cargando películas...
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex p-4 text-center items-center justify-center text-red-500 font-bold border-2 border-red-500 rounded-2xl border-dashed">
            {error}
          </div>
        ) : movies.length > 0 && currentIndex < movies.length ? (
          // Notice we pass key, to re-render component freshly when movie changes
          <SwipeCard 
            key={movies[currentIndex].id}
            movie={{
              id: movies[currentIndex].id,
              title: movies[currentIndex].title,
              posterUrl: movies[currentIndex].poster_path 
                ? `https://image.tmdb.org/t/p/w500${movies[currentIndex].poster_path}`
                : 'https://via.placeholder.com/500x750?text=No+Poster',
              year: new Date(movies[currentIndex].release_date).getFullYear(),
              rating: movies[currentIndex].vote_average
            }}
            onSwipe={handleSwipe}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            No hay más películas para ti hoy.
          </div>
        )}
      </div>
      
      <p className="mt-8 text-gray-400 text-sm">
        Haz swipe a la ⬅️ Izquierda o ➡️ Derecha
        <br/>
        O usa las flechas del teclado
      </p>
    </div>
  );
};

export default App;
