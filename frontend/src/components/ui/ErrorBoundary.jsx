import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center text-danger mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-text-primary mb-1">
            Component Rendering Error
          </h2>
          <p className="text-xs text-text-secondary max-w-md mb-4 font-mono">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Reload View
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
