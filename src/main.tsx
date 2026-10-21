import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import { initAnalytics } from './lib/analytics'
import { AuthProvider } from './lib/auth'
import { config } from './lib/config'
import './index.css'

initAnalytics()
const Router = config.hashRouter ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <Router>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Router>
    </HelmetProvider>
  </React.StrictMode>,
)
