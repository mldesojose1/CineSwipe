import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMovies } from '../useMovies';
import * as useTMDBCacheMock from '../useTMDBCache';

vi.mock('../useTMDBCache', () => ({
    useTMDBCache: vi.fn()
}));

const mockGetCacheKey = vi.fn();
const mockGetCachedData = vi.fn();
const mockSaveToCache = vi.fn();

describe('useMovies', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_TMDB_KEY', 'fake_key');
        vi.mocked(useTMDBCacheMock.useTMDBCache).mockReturnValue({
            getCacheKey: mockGetCacheKey,
            getCachedData: mockGetCachedData,
            saveToCache: mockSaveToCache
        });

        // Default mock behavior
        mockGetCacheKey.mockReturnValue('test-cache-key');
        mockGetCachedData.mockReturnValue(null);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
        delete (window as any).__cineswipe_prefetch__;
    });

    it('debe iniciar en loading y resolver la respuesta correctamente', async () => {
        const mockResponse = {
            page: 1,
            results: [{ id: 1, title: 'Movie 1' }],
            total_pages: 5,
            total_results: 100
        };

        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockResponse)
        }));

        const { result } = renderHook(() => useMovies());
        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.movies).toEqual(mockResponse.results);
        expect(result.current.error).toBeNull();
        expect(mockSaveToCache).toHaveBeenCalledWith('test-cache-key', mockResponse);
    });

    it('debe extraer datos desde la caché sin llamar al fetch', async () => {
        const cachedData = {
            page: 1,
            results: [{ id: 99, title: 'Cached Movie' }],
            total_pages: 2,
            total_results: 40
        };

        mockGetCachedData.mockReturnValue(cachedData);
        const fetchSpy = vi.fn();
        vi.stubGlobal('fetch', fetchSpy);

        const { result } = renderHook(() => useMovies());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(result.current.movies).toEqual(cachedData.results);
    });

    it('debe manejar errores de fetch correctamente (ej. error 401 api key)', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 401
        }));

        const { result } = renderHook(() => useMovies());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe('Invalid TMDB API Key.');
        expect(result.current.movies).toEqual([]);
    });

    it('debe cancelar exitosamente la petición fetch cuando se desmonta (AbortController)', async () => {
        let abortSignal: AbortSignal | null = null;
        vi.stubGlobal('fetch', vi.fn().mockImplementation((_url, options) => {
            abortSignal = options.signal;
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => resolve({ ok: true, json: () => ({}) }), 5000);
                if (options.signal) {
                    options.signal.addEventListener('abort', () => {
                        clearTimeout(timeout);
                        const err = new Error('AbortError');
                        err.name = 'AbortError';
                        reject(err);
                    });
                }
            });
        }));

        const { result, unmount } = renderHook(() => useMovies());
        expect(result.current.loading).toBe(true);

        unmount(); // Unmount dispara AbortController

        await waitFor(() => {
            expect(abortSignal?.aborted).toBe(true);
        });

        expect(result.current.error).toBeNull();
    });
});
