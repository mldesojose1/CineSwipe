import { useState, useEffect, useRef, useCallback } from 'react';
import { TMDBMovie, TMDBDiscoverResponse, isTMDBDiscoverResponse } from '../types/tmdb.types';

export interface UseMoviesOptions {
  genreId?: string | number;
  year?: string | number;
}

export interface UseMoviesReturn {
  movies: TMDBMovie[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

const CACHE_PREFIX = 'cineswipe_cache_';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Custom hook to fetch discover movies from TMDB API v3.
 * Supports pagination, genre/year filtering, and session storage caching (5 min TTL).
 * 
 * @param {UseMoviesOptions} options - Optional filters for the query (genreId, year).
 * @returns {UseMoviesReturn} Object containing movies data, loading state, error state, and pagination handler.
 */
export const useMovies = (options: UseMoviesOptions = {}): UseMoviesReturn => {
  const [movies, setMovies] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // References to track stable filter values across dependency array triggers
  const genreRef = useRef(options.genreId);
  const yearRef = useRef(options.year);
  
  // Abort controller reference to cancel pending requests on unmount or re-fetch
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset page and internal refs if externally passed filters change
  useEffect(() => {
    if (options.genreId !== genreRef.current || options.year !== yearRef.current) {
      setMovies([]);
      setPage(1);
      setHasMore(true);
      setError(null);
      genreRef.current = options.genreId;
      yearRef.current = options.year;
    }
  }, [options.genreId, options.year]);

  useEffect(() => {
    const cacheParams = {
      page: page.toString(),
      genreId: genreRef.current?.toString() || '',
      year: yearRef.current?.toString() || ''
    };
    const cacheKey = `${CACHE_PREFIX}${new URLSearchParams(cacheParams).toString()}`;

    // 1. Check valid cache on sessionStorage before fetching
    const cachedItem = sessionStorage.getItem(cacheKey);
    if (cachedItem) {
      try {
        const parsedCache = JSON.parse(cachedItem);
        const { timestamp, data } = parsedCache;
        const isExpired = Date.now() - timestamp > CACHE_TTL_MS;

        if (!isExpired && isTMDBDiscoverResponse(data)) {
          setMovies(prev => page === 1 ? data.results : [...prev, ...data.results]);
          setHasMore(page < data.total_pages);
          setLoading(false);
          return;
        } else {
          sessionStorage.removeItem(cacheKey);
        }
      } catch (err) {
        sessionStorage.removeItem(cacheKey);
      }
    }

    // 2. Setup tracking for unmounted component
    let isMounted = true;
    
    const fetchMovies = async () => {
      setLoading(true);
      setError(null);
      
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        // As requested: key loaded from env, strictly not hardcoded
        const apiKey = import.meta.env.VITE_TMDB_KEY;
        
        if (!apiKey) {
          throw new Error("Missing TMDB API Key. Please configure VITE_TMDB_KEY in your .env file.");
        }

        const url = new URL('https://api.themoviedb.org/3/discover/movie');
        url.searchParams.append('include_adult', 'false');
        url.searchParams.append('include_video', 'false');
        url.searchParams.append('language', 'en-US');
        url.searchParams.append('page', page.toString());
        
        if (genreRef.current) {
          url.searchParams.append('with_genres', genreRef.current.toString());
        }
        if (yearRef.current) {
          url.searchParams.append('primary_release_year', yearRef.current.toString());
        }

        const response = await fetch(url.toString(), {
          headers: {
            // Using Authorization Bearer instead of ?api_key= for modern security
            Authorization: `Bearer ${apiKey}`,
            accept: 'application/json'
          },
          signal: abortController.signal
        });

        // Error handling as requested
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Unauthorized [401]: TMDB API Key is invalid or expired.');
          } else if (response.status === 404) {
            throw new Error('Not Found [404]: Endpoints or requested TMDB resource does not exist.');
          } else if (response.status === 429) {
            throw new Error('Rate Limit Exceeded [429]: Too many requests. Please wait a moment.');
          }
          throw new Error(`An error occurred: Status ${response.status}`);
        }

        const data = await response.json();

        // 3. Type Guard validation on API data
        if (!isTMDBDiscoverResponse(data)) {
          throw new Error('Invalid TMDB API response format.');
        }

        if (isMounted) {
          // 4. Update state and Session Storage Cache
          sessionStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: data
          }));

          setMovies(prev => page === 1 ? data.results : [...prev, ...data.results]);
          setHasMore(page < data.total_pages);
        }

      } catch (err: any) {
        // Do not update error state if the reason was intentional abort
        if (err.name !== 'AbortError' && isMounted) {
          setError(err.message || 'Unknown error fetching movies.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMovies();

    // 5. Cleanup function
    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort(); // Cancel ongoing fetch
      }
    };
  }, [page, options.genreId, options.year]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  return { movies, loading, error, hasMore, loadMore };
};
