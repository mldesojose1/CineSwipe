import React, { createContext, useContext, useReducer, useEffect, useMemo, ReactNode } from 'react';
import { TMDBMovie } from '../types/tmdb.types';

// ==========================================
// 1. Types & Interfaces
// ==========================================

export type SwipeActionType = 'SWIPE_RIGHT' | 'SWIPE_LEFT';

export interface SwipeRecord {
  movie: Pick<TMDBMovie, 'id' | 'title' | 'poster_path'>; // Keeping only essential data
  action: SwipeActionType;
  timestamp: number;
}

export interface MovieHistoryState {
  history: SwipeRecord[];
  isInitialized: boolean;
}

export type MovieHistoryAction =
  | { type: 'HYDRATE'; payload: SwipeRecord[] }
  | { type: 'SWIPE_RIGHT'; payload: TMDBMovie }
  | { type: 'SWIPE_LEFT'; payload: TMDBMovie }
  | { type: 'UNDO_LAST' }
  | { type: 'CLEAR_HISTORY' };

export type MovieHistoryDispatch = React.Dispatch<MovieHistoryAction>;

// Constants
const MAX_HISTORY = 50;
const STORAGE_KEY = 'cineswipe_history_v1';

// ==========================================
// 2. Pure Reducer
// ==========================================

export const movieHistoryReducer = (state: MovieHistoryState, action: MovieHistoryAction): MovieHistoryState => {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, history: action.payload, isInitialized: true };

    case 'SWIPE_RIGHT':
    case 'SWIPE_LEFT': {
      const record: SwipeRecord = {
        // Reduce payload footprint for localStorage efficiency
        movie: {
          id: action.payload.id,
          title: action.payload.title,
          poster_path: action.payload.poster_path
        },
        action: action.type,
        timestamp: Date.now()
      };

      const newHistory = [...state.history, record];
      // FIFO: Ensure maximum length of 50
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift(); 
      }
      return { ...state, history: newHistory };
    }

    case 'UNDO_LAST': {
      if (state.history.length === 0) return state;
      const historyCopy = [...state.history];
      historyCopy.pop(); // Remove the most recent swipe
      return { ...state, history: historyCopy };
    }

    case 'CLEAR_HISTORY':
      return { ...state, history: [] };

    default:
      return state;
  }
};

// ==========================================
// 3. Context Creation (Separated Read/Write)
// ==========================================

const initialState: MovieHistoryState = { history: [], isInitialized: false };

const MovieHistoryStateContext = createContext<MovieHistoryState | undefined>(undefined);
const MovieHistoryDispatchContext = createContext<MovieHistoryDispatch | undefined>(undefined);

// ==========================================
// 4. Provider Component
// ==========================================

interface ProviderProps {
  children: ReactNode;
}

export const MovieHistoryProvider: React.FC<ProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(movieHistoryReducer, initialState);

  // Phase 1: LocalStorage Rehydration
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        dispatch({ type: 'HYDRATE', payload: Array.isArray(parsed) ? parsed : [] });
      } else {
        dispatch({ type: 'HYDRATE', payload: [] });
      }
    } catch {
      dispatch({ type: 'HYDRATE', payload: [] });
    }
  }, []);

  // Phase 2: React to State changes and Persist
  useEffect(() => {
    // We only write to LocalStorage AFTER initialization, otherwise we might overwrite existing data with initialized []
    if (state.isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
    }
  }, [state.history, state.isInitialized]);

  // Memoizing Context values to prevent unnecessary re-renders in children
  // (state is recreated only if history length/obj changes. dispatch is functionally stable by React, but memoized per guidelines)
  const stateContextValue = useMemo(() => state, [state]);
  const dispatchContextValue = useMemo(() => dispatch, [dispatch]);

  return (
    <MovieHistoryStateContext.Provider value={stateContextValue}>
      <MovieHistoryDispatchContext.Provider value={dispatchContextValue}>
        {children}
      </MovieHistoryDispatchContext.Provider>
    </MovieHistoryStateContext.Provider>
  );
};

// ==========================================
// 5. Custom Hooks
// ==========================================

/** Hook for Reading the Movie History State */
export const useMovieHistory = (): MovieHistoryState => {
  const context = useContext(MovieHistoryStateContext);
  if (context === undefined) {
    throw new Error('useMovieHistory must be used within a MovieHistoryProvider');
  }
  return context;
};

/** Hook for Dispatching Movie History Actions (Write-only, no re-renders on state change) */
export const useMovieActions = (): MovieHistoryDispatch => {
  const context = useContext(MovieHistoryDispatchContext);
  if (context === undefined) {
    throw new Error('useMovieActions must be used within a MovieHistoryProvider');
  }
  return context;
};
