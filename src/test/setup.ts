import '@testing-library/jest-dom'

// Mock de sessionStorage para tests de useMovies
const sessionStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = value },
        removeItem: (key: string) => { delete store[key] },
        clear: () => { store = {} },
    }
})()
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })