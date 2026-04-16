import React, { useState, PointerEvent, KeyboardEvent, useRef } from 'react';

export type SwipeDirection = 'left' | 'right';

export interface MovieData {
  id: string | number;
  title: string;
  posterUrl: string;
  year: number;
  rating: number;
}

export interface SwipeCardProps {
  /** The movie data to display */
  movie: MovieData;
  /** Callback fired when a swipe passes the threshold */
  onSwipe: (direction: SwipeDirection) => void;
  /** Swipe distance required in pixels to trigger an action (default: 80) */
  threshold?: number;
}

/**
 * SwipeCard Component
 * Displays a movie poster with title, year, and rating.
 * Supports drag gestures via Pointer Events and keyboard fallback (Left/Right arrows).
 */
export const SwipeCard: React.FC<SwipeCardProps> = ({ movie, onSwipe, threshold = 80 }) => {
  // --- State for gesture logic ---
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  
  // Reference for the card to manage focus (keyboard support)
  const cardRef = useRef<HTMLDivElement>(null);

  // --- Handlers: Pointer Events ---
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // Only accept primary pointer (left click / single touch)
    if (!e.isPrimary) return;
    
    // Capture the pointer to continue receiving events even if the pointer moves outside the card
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    setIsDragging(true);
    setStartX(e.clientX);
    setOffsetX(0);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const currentOffsetX = e.clientX - startX;
    setOffsetX(currentOffsetX);
  };

  const handlePointerUpOrCancel = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    // Evaluate if the swipe passed the action threshold
    if (offsetX > threshold) {
      onSwipe('right');
    } else if (offsetX < -threshold) {
      onSwipe('left');
    } else {
      // Reset position if threshold not met
      setOffsetX(0);
    }
  };

  // --- Handlers: Keyboard Accessibility ---
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      onSwipe('right');
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      onSwipe('left');
      e.preventDefault();
    }
  };

  // --- Derived Values for UI ---
  // Calculate rotation based on offset (subtle rotation: max ~15deg)
  const rotation = offsetX * 0.05; 
  
  // Dynamic styles for transform (allowed inline as per instructions because it's dynamic state, NOT static layout)
  const dynamicTransform = {
    transform: `translate3d(${offsetX}px, 0, 0) rotate(${rotation}deg)`,
    transition: isDragging ? 'none' : 'transform 0.3s ease-out'
  };

  // Determine indicator visibility
  const showLike = offsetX > threshold;
  const showDislike = offsetX < -threshold;

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
      {/* Background Image */}
      <img
        src={movie.posterUrl}
        alt={movie.title}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable="false"
      />

      {/* Gradient Overlay for Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

      {/* Movie Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white pointer-events-none">
        <h2 className="text-2xl font-bold truncate">{movie.title}</h2>
        <div className="flex items-center space-x-2 mt-1 text-sm text-gray-200">
          <span className="font-medium bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">
            {movie.year}
          </span>
          <span className="flex items-center text-yellow-400 font-bold">
            ★ <span className="ml-1 text-white">{movie.rating.toFixed(1)}</span>
          </span>
        </div>
      </div>

      {/* Like Indicator Overlay */}
      {showLike && (
        <div className="absolute top-8 left-8 border-4 border-green-500 text-green-500 font-extrabold text-4xl py-1 px-4 rounded-lg transform -rotate-12 bg-black/30 backdrop-blur-sm pointer-events-none transition-opacity">
          LIKE
        </div>
      )}

      {/* Dislike Indicator Overlay */}
      {showDislike && (
        <div className="absolute top-8 right-8 border-4 border-red-500 text-red-500 font-extrabold text-4xl py-1 px-4 rounded-lg transform rotate-12 bg-black/30 backdrop-blur-sm pointer-events-none transition-opacity">
          NOPE
        </div>
      )}
    </div>
  );
};

/* --- USAGE EXAMPLE --- 
 * 
 * import { SwipeCard, SwipeDirection, MovieData } from './SwipeCard';
 * 
 * const ExampleContainer = () => {
 *   const movie: MovieData = {
 *     id: 1,
 *     title: "Dune: Part Two",
 *     posterUrl: "https://example.com/dune-poster.jpg",
 *     year: 2024,
 *     rating: 8.8
 *   };
 * 
 *   const handleSwipe = (direction: SwipeDirection) => {
 *     console.log(`User swiped ${direction} on movie ID: ${movie.id}`);
 *     // Handle logic to change movie or track the like/dislike status
 *   };
 * 
 *   return (
 *     <div className="flex items-center justify-center min-h-screen bg-gray-900">
 *       <SwipeCard movie={movie} onSwipe={handleSwipe} />
 *     </div>
 *   );
 * };
 */
