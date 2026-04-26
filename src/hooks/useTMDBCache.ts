import { useCallback } from 'react';
import { TMDBDiscoverResponse, isTMDBDiscoverResponse } from '../types/tmdb.types';

const CACHE_PREFIX = 'cineswipe_cache_';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export const useTMDBCache = () => {
    const getCacheKey = useCallback((page: number, genreId?: string | number, year?: string | number) => {
        const params = new URLSearchParams({
            page: page.toString(),
            genreId: genreId?.toString() || '',
            year: year?.toString() || ''
        });
        return `${CACHE_PREFIX}${params.toString()}`;
    }, []);

    const getCachedData = useCallback((key: string): TMDBDiscoverResponse | null => {
        const item = sessionStorage.getItem(key);
        if (!item) return null;
        try {
            const { timestamp, data } = JSON.parse(item);
            if (Date.now() - timestamp > CACHE_TTL_MS) {
                sessionStorage.removeItem(key);
                return null;
            }
            return isTMDBDiscoverResponse(data) ? data : null;
        } catch {
            sessionStorage.removeItem(key);
            return null;
        }
    }, []);

    const saveToCache = useCallback((key: string, data: TMDBDiscoverResponse) => {
        sessionStorage.setItem(key, JSON.stringify({
            timestamp: Date.now(),
            data
        }));
    }, []);

    return { getCacheKey, getCachedData, saveToCache };
};
