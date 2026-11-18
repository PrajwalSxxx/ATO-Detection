import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error?.response?.status === 401) return false
        if (error?.response?.status === 403) return false
        if (error?.response?.status === 404) return false
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#FFFFFF',
              color: '#161616',
              border: '1.5px solid #161616',
              borderRadius: '8px',
              boxShadow: '3px 3px 0 0 #161616',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
            },
          }}
          richColors
        />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
