import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import './index.css'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'

// Initialize PostHog once
if (!posthog.__loaded) {
  posthog.init(
    import.meta.env.VITE_PUBLIC_POSTHOG_KEY,
    {
      api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
      loaded: (posthog) => {
        if (import.meta.env.DEV) posthog.debug()
      }
    }
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PostHogProvider client={posthog}>
        <App />
      </PostHogProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
