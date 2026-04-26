import { useState, useCallback, useRef, useEffect } from 'react';

export const useMoviePagination = (genreId?: string | number, year?: string | number) => {
    const [page, setPage] = useState<number>(1);
    const [hasMore, setHasMore] = useState<boolean>(true);

    const genreRef = useRef(genreId);
    const yearRef = useRef(year);

    // Reiniciar la paginación cuando el filtro cambia
    useEffect(() => {
        if (genreId !== genreRef.current || year !== yearRef.current) {
            genreRef.current = genreId;
            yearRef.current = year;
            setPage(1);
            setHasMore(true);
        }
    }, [genreId, year]);

    const loadMore = useCallback(() => {
        setPage(prev => {
            if (hasMore) return prev + 1;
            return prev;
        });
    }, [hasMore]);

    const updateHasMore = useCallback((more: boolean) => {
        setHasMore(more);
    }, []);

    return {
        page,
        hasMore,
        loadMore,
        updateHasMore
    };
};
