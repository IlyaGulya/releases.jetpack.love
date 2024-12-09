import React from 'react'
import ReactDOM from 'react-dom/client'
import {BrowserRouter} from 'react-router'
import App from './App.tsx'
import './index.css'
import posthog from 'posthog-js'
import {PostHogProvider} from 'posthog-js/react'

const POSTHOG_TOKEN = import.meta.env.VITE_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST

// Initialize PostHog only if token is available
if (!POSTHOG_TOKEN) {
  console.warn('[PostHog] Token not found. Analytics will be disabled. Please check your environment variables.')
} else if (!posthog.__loaded) {
  posthog.init(
    POSTHOG_TOKEN,
    {
      api_host: POSTHOG_HOST,
      loaded: (posthog) => {
        if (import.meta.env.DEV) posthog.debug()
      },
    },
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PostHogProvider client={posthog}>
        <App/>
      </PostHogProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
