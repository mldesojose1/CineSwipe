export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  adult?: boolean;
  backdrop_path?: string | null;
  original_language?: string;
  original_title?: string;
  popularity?: number;
  video?: boolean;
  vote_count?: number;
}

export interface TMDBDiscoverResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

/**
 * Type guard to validate that incoming data shape matches TMDBDiscoverResponse
 */
export const isTMDBDiscoverResponse = (data: unknown): data is TMDBDiscoverResponse => {
  if (typeof data !== 'object' || data === null) return false;
  const record = data as Record<string, unknown>;
  return (
    typeof record.page === 'number' &&
    Array.isArray(record.results) &&
    typeof record.total_pages === 'number' &&
    typeof record.total_results === 'number'
  );
};
