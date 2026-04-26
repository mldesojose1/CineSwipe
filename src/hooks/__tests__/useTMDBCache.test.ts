import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useTMDBCache } from '../useTMDBCache';
import type { TMDBDiscoverResponse } from '../../types/tmdb.types';

describe('useTMDBCache', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        sessionStorage.clear();
    });

    it('debe generar la clave de caché correcta mediante getCacheKey', () => {
        const { result } = renderHook(() => useTMDBCache());
        const key1 = result.current.getCacheKey(1);
        expect(key1).toBe('cineswipe_cache_page=1&genreId=&year=');

        const key2 = result.current.getCacheKey(2, 28, 2023);
        expect(key2).toBe('cineswipe_cache_page=2&genreId=28&year=2023');
    });

    it('debe escribir en el sessionStorage correctamente con saveToCache', () => {
        const { result } = renderHook(() => useTMDBCache());
        vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));

        // Ignorando el tipado estricto para simular la data mínima para el test
        const mockData: TMDBDiscoverResponse = { page: 1, results: [], total_pages: 1, total_results: 0 };
        result.current.saveToCache('test_key', mockData);

        const item = sessionStorage.getItem('test_key');
        expect(item).not.toBeNull();

        if (item) {
            const parsed = JSON.parse(item);
            expect(parsed.timestamp).toBe(Date.now());
            expect(parsed.data).toEqual(mockData);
        }
    });

    it('debe recuperar datos válidos del sessionStorage mediante getCachedData', () => {
        vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
        const mockData: TMDBDiscoverResponse = { page: 1, results: [], total_pages: 1, total_results: 0 };
        sessionStorage.setItem('test_key_valid', JSON.stringify({
            timestamp: Date.now(),
            data: mockData
        }));

        const { result } = renderHook(() => useTMDBCache());
        const cached = result.current.getCachedData('test_key_valid');
        expect(cached).toEqual(mockData);
    });

    it('debe descartar y limpiar datos del sessionStorage si superan el TTL (5 min)', () => {
        const pastTime = new Date('2026-01-01T09:50:00Z').getTime(); // Hace 10 minutos
        const mockData: TMDBDiscoverResponse = { page: 1, results: [], total_pages: 1, total_results: 0 };
        sessionStorage.setItem('test_key_expired', JSON.stringify({
            timestamp: pastTime,
            data: mockData
        }));

        // Simular que el tiempo actual es 10:00:00Z
        vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));

        const { result } = renderHook(() => useTMDBCache());
        const cached = result.current.getCachedData('test_key_expired');

        expect(cached).toBeNull();
        // Debe haber limpiado la key expirada
        expect(sessionStorage.getItem('test_key_expired')).toBeNull();
    });
});
