import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './index.css'
import { MovieHistoryProvider } from './context/MovieContext'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MovieHistoryProvider>
      <App />
    </MovieHistoryProvider>
  </React.StrictMode>,
)
