import { useState, useEffect, useRef, useCallback } from 'react';
import { TMDBMovie, isTMDBDiscoverResponse } from '../types/tmdb.types';
import { useTMDBCache } from './useTMDBCache';
import { useMoviePagination } from './useMoviePagination';

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

interface MoviesState {
  data: TMDBMovie[];
  loading: boolean;
  error: string | null;
}

// ─── Hook implementation ──────────────────────────────────────────────────

export const useMovies = (options: UseMoviesOptions = {}): UseMoviesReturn => {
  const [state, setState] = useState<MoviesState>({
    data: [],
    loading: true,
    error: null,
  });

  const { page, hasMore, loadMore, updateHasMore } = useMoviePagination(options.genreId, options.year);
  const { getCacheKey, getCachedData, saveToCache } = useTMDBCache();

  const genreRef = useRef(options.genreId);
  const yearRef = useRef(options.year);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reiniciar el estado base de los datos si los filtros cambian
  useEffect(() => {
    if (options.genreId !== genreRef.current || options.year !== yearRef.current) {
      genreRef.current = options.genreId;
      yearRef.current = options.year;
      setState({
        data: [],
        loading: true,
        error: null,
      });
    }
  }, [options.genreId, options.year]);

  const fetchMovies = useCallback(async (currentPage: number, isMounted: boolean) => {
    const currentGenre = genreRef.current;
    const currentYear = yearRef.current;
    const cacheKey = getCacheKey(currentPage, currentGenre, currentYear);

    // 1. Wait for prefetch if applicable (only page 1, no filters)
    if (currentPage === 1 && !currentGenre && !currentYear) {
      const prefetch = (window as any).__cineswipe_prefetch__;
      if (prefetch) await prefetch;
    }

    if (!isMounted) return;

    // 2. Try cache
    const cached = getCachedData(cacheKey);
    if (cached) {
      setState(prev => ({
        ...prev,
        data: currentPage === 1 ? cached.results : [...prev.data, ...cached.results],
        loading: false,
      }));
      updateHasMore(currentPage < cached.total_pages);
      return;
    }

    // 3. Fetch from API
    setState(prev => ({ ...prev, loading: true, error: null }));

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const apiKey = import.meta.env.VITE_TMDB_KEY;
      if (!apiKey) throw new Error("Missing TMDB API Key.");

      const url = new URL('https://api.themoviedb.org/3/discover/movie');
      url.searchParams.append('include_adult', 'false');
      url.searchParams.append('language', 'en-US');
      url.searchParams.append('page', currentPage.toString());
      if (currentGenre) url.searchParams.append('with_genres', currentGenre.toString());
      if (currentYear) url.searchParams.append('primary_release_year', currentYear.toString());

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}`, accept: 'application/json' },
        signal: abortController.signal
      });

      if (!response.ok) {
        const errorMap: Record<number, string> = {
          401: 'Invalid TMDB API Key.',
          404: 'Endpoint not found.',
          429: 'Rate limit exceeded. Please wait.'
        };
        throw new Error(errorMap[response.status] || `Error: ${response.status}`);
      }

      const data = await response.json();
      if (!isTMDBDiscoverResponse(data)) throw new Error('Invalid response format.');

      if (isMounted) {
        saveToCache(cacheKey, data);
        setState(prev => ({
          ...prev,
          data: currentPage === 1 ? data.results : [...prev.data, ...data.results],
          loading: false
        }));
        updateHasMore(currentPage < data.total_pages);
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || !isMounted) return;
      setState(prev => ({ ...prev, error: err.message, loading: false }));
    }
  }, [getCacheKey, getCachedData, saveToCache, updateHasMore]);

  useEffect(() => {
    let isMounted = true;
    fetchMovies(page, isMounted);

    return () => {
      isMounted = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [page, options.genreId, options.year, fetchMovies]);

  const handleLoadMore = useCallback(() => {
    if (!state.loading && hasMore) {
      loadMore();
    }
  }, [state.loading, hasMore, loadMore]);

  return {
    movies: state.data,
    loading: state.loading,
    error: state.error,
    hasMore,
    loadMore: handleLoadMore
  };
};
