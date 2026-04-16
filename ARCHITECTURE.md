# CineSwipe — Architecture Document

> Stack: **React 18 · Vite · TypeScript · Tailwind CSS**  
> State: **React Context + useReducer** (no external state library)  
> Convention: max **3 levels** of folder depth · hooks ≠ components

---

## 1. Folder Tree

```
CineSwipe/
├── public/                        # Static assets served as-is
│   └── favicon.svg
│
├── src/
│   ├── app/                       # App bootstrap & providers
│   │   ├── App.tsx                # Root component, router outlet
│   │   └── providers.tsx          # Wraps app with all Context providers
│   │
│   ├── assets/                    # Design tokens & media
│   │   ├── fonts/                 # Self-hosted font files
│   │   └── images/                # Static images / placeholders
│   │
│   ├── components/                # Pure presentational UI
│   │   ├── common/                # Reusable atomic components
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Icon.tsx
│   │   │   └── Spinner.tsx
│   │   ├── layout/                # Page-level structural components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── PageWrapper.tsx
│   │   ├── movie/                 # Movie-domain display components
│   │   │   ├── MovieCard.tsx      # Static card (poster + info)
│   │   │   ├── SwipeCard.tsx      # Animated swipeable wrapper
│   │   │   ├── MovieDetail.tsx    # Expanded movie modal/panel
│   │   │   └── LikeDislikeOverlay.tsx
│   │   └── search/                # Search & filter display components
│   │       ├── SearchBar.tsx
│   │       ├── GenreFilter.tsx
│   │       └── YearRangePicker.tsx
│   │
│   ├── context/                   # Global state (Context + useReducer)
│   │   ├── MovieContext.tsx       # Context definition + Provider
│   │   ├── movieReducer.ts        # Pure reducer function
│   │   └── movieActions.ts        # Action type constants & creators
│   │
│   ├── hooks/                     # Custom hooks — business logic layer
│   │   ├── useMovies.ts           # Fetches & caches movie list
│   │   ├── useSwipe.ts            # Touch/pointer gesture detection
│   │   ├── useFilters.ts          # Genre + year filter state
│   │   ├── useLikedMovies.ts      # Persists liked list to localStorage
│   │   └── useMovieDetail.ts      # Fetches single movie details
│   │
│   ├── pages/                     # Route-level page components
│   │   ├── DiscoverPage.tsx       # Main swipe discovery view
│   │   ├── LikedPage.tsx          # User's saved/liked movies
│   │   └── SearchPage.tsx         # Browse by genre & year
│   │
│   ├── services/                  # External API communication
│   │   ├── api.ts                 # Fetch base client + interceptors
│   │   ├── movieService.ts        # Movie-related endpoints (TMDB)
│   │   └── endpoints.ts           # URL constants
│   │
│   ├── types/                     # Shared TypeScript interfaces
│   │   ├── movie.types.ts         # Movie, Genre, Cast, etc.
│   │   ├── filter.types.ts        # FilterState, SortOption
│   │   └── context.types.ts       # Action union types, ContextState
│   │
│   └── utils/                     # Pure helper functions
│       ├── formatDate.ts
│       ├── truncateText.ts
│       └── classNames.ts          # Tailwind class merge utility
│
├── index.html                     # Vite entry HTML
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── .env.example                   # VITE_TMDB_API_KEY=
└── ARCHITECTURE.md
```

---

## 2. Module Responsibilities

| Módulo | Responsabilidad | Archivos clave |
|---|---|---|
| **app/** | Bootstrap de la aplicación; compone providers y router | `App.tsx`, `providers.tsx` |
| **assets/** | Recursos estáticos (fuentes, imágenes) sin lógica | `fonts/`, `images/` |
| **components/common/** | Componentes atómicos reutilizables sin estado propio | `Button.tsx`, `Badge.tsx`, `Spinner.tsx` |
| **components/layout/** | Estructura visual de página (header, footer, wrapper) | `Header.tsx`, `PageWrapper.tsx` |
| **components/movie/** | Presentación de tarjetas y gestos visuales de película | `SwipeCard.tsx`, `MovieCard.tsx`, `LikeDislikeOverlay.tsx` |
| **components/search/** | Controles de búsqueda, filtro de género y rango de año | `SearchBar.tsx`, `GenreFilter.tsx`, `YearRangePicker.tsx` |
| **context/** | Estado global de películas y filtros mediante `useReducer` | `MovieContext.tsx`, `movieReducer.ts`, `movieActions.ts` |
| **hooks/** | Lógica de negocio desacoplada de la UI (fetch, gestos, persistencia) | `useMovies.ts`, `useSwipe.ts`, `useFilters.ts`, `useLikedMovies.ts` |
| **pages/** | Composición de vistas completas a nivel de ruta | `DiscoverPage.tsx`, `LikedPage.tsx`, `SearchPage.tsx` |
| **services/** | Comunicación HTTP con TMDB; centraliza URLs y cliente base | `api.ts`, `movieService.ts`, `endpoints.ts` |
| **types/** | Interfaces y tipos TypeScript compartidos por toda la app | `movie.types.ts`, `filter.types.ts`, `context.types.ts` |
| **utils/** | Funciones puras auxiliares (formateo, strings, clases CSS) | `formatDate.ts`, `truncateText.ts`, `classNames.ts` |

---

## 3. Data Flow Diagram

```mermaid
flowchart TD
    subgraph External["External"]
        TMDB["TMDB API"]
    end

    subgraph Services["services/"]
        API["api.ts\n(HTTP client)"]
        MS["movieService.ts\n(endpoints)"]
    end

    subgraph State["context/ — Global State"]
        CTX["MovieContext\n(React.createContext)"]
        RED["movieReducer\n(pure function)"]
        ACT["movieActions\n(action creators)"]
    end

    subgraph Logic["hooks/ — Business Logic"]
        HM["useMovies\n(fetch + cache)"]
        HF["useFilters\n(genre · year)"]
        HS["useSwipe\n(gesture detection)"]
        HL["useLikedMovies\n(localStorage)"]
    end

    subgraph UI["pages/ + components/ — Presentation"]
        DP["DiscoverPage"]
        SP["SearchPage"]
        LP["LikedPage"]
        SC["SwipeCard"]
        SB["SearchBar"]
        GF["GenreFilter"]
        YP["YearRangePicker"]
    end

    TMDB -->|JSON response| MS
    MS --> API
    API -->|typed data| HM

    HM -->|dispatch SET_MOVIES| ACT
    HF -->|dispatch SET_FILTERS| ACT
    HS -->|dispatch LIKE / DISLIKE| ACT
    HL -->|dispatch LOAD_LIKED| ACT

    ACT --> RED
    RED -->|next state| CTX

    CTX -->|movies[]| HM
    CTX -->|filters| HF
    CTX -->|likedIds[]| HL

    HM -->|movies[]| DP
    HF -->|activeFilters| SP
    HS -->|swipeDirection| SC
    HL -->|likedMovies[]| LP

    DP --> SC
    SP --> SB
    SP --> GF
    SP --> YP
```

---

## 4. Naming Conventions

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes React | `PascalCase` + `.tsx` | `SwipeCard.tsx` |
| Custom hooks | `camelCase` con prefijo `use` + `.ts` | `useSwipe.ts` |
| Context / Reducer | `PascalCase` para Context, `camelCase` para reducer fn | `MovieContext.tsx` / `movieReducer.ts` |
| Tipos e interfaces | `PascalCase` con sufijo de dominio | `MovieDetail`, `FilterState` |
| Action constants | `SCREAMING_SNAKE_CASE` | `SET_MOVIES`, `LIKE_MOVIE` |
| Utilidades | `camelCase` + `.ts` | `formatDate.ts` |
| Variables Tailwind custom | prefijo `cine-` en `tailwind.config.ts` | `text-cine-accent` |
| Archivos de servicio | `camelCase` + sufijo `Service` | `movieService.ts` |

---

## 5. Decisiones de Diseño

- **Context + useReducer sobre Redux/Zustand**: la app tiene un único dominio (películas) con transiciones de estado predecibles; un reducer local es suficiente y elimina dependencias externas.
- **Hooks como capa de lógica**: cada hook encapsula un único concern (fetch, gestos, filtros, persistencia) haciendo los componentes puramente presentacionales y más fáciles de testear.
- **Máximo 3 niveles de profundidad**: evita sobre-ingeniería en una app de dominio único. Dentro de `components/` se categoriza solo a nivel de dominio (`common/`, `layout/`, `movie/`, `search/`).
- **`services/` centralizado**: toda comunicación HTTP pasa por `api.ts`. Cambiar de TMDB a otro proveedor solo requiere editar `endpoints.ts` y `movieService.ts`.
