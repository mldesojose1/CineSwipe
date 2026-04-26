import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useMoviePagination } from '../useMoviePagination';

describe('useMoviePagination', () => {
    it('debe inicializar con la página 1 y hasMore en true', () => {
        const { result } = renderHook(() => useMoviePagination(undefined, undefined));
        expect(result.current.page).toBe(1);
        expect(result.current.hasMore).toBe(true);
    });

    it('debe incrementar la página cuando se llama a loadMore y hasMore es true', () => {
        const { result } = renderHook(() => useMoviePagination());
        act(() => {
            result.current.loadMore();
        });
        expect(result.current.page).toBe(2);
    });

    it('NO debe incrementar la página si hasMore es false', () => {
        const { result } = renderHook(() => useMoviePagination());
        act(() => {
            result.current.updateHasMore(false);
        });
        act(() => {
            result.current.loadMore();
        });
        expect(result.current.page).toBe(1);
    });

    it('debe resetear la paginación a la página 1 al cambiar las dependencias de género o año', () => {
        const { result, rerender } = renderHook(
            ({ genreId, year }) => useMoviePagination(genreId, year),
            { initialProps: { genreId: 28, year: 2023 } }
        );

        act(() => {
            result.current.loadMore(); // Page 2
        });
        expect(result.current.page).toBe(2);

        // Cambio de género
        rerender({ genreId: 12, year: 2023 });
        expect(result.current.page).toBe(1);
        expect(result.current.hasMore).toBe(true);
    });
});
