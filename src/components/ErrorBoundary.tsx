'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-[#151516] p-8 text-center shadow-xl">
          <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-xs text-zinc-400 max-w-md mb-6">
            An unexpected error occurred in this section of the system. 
            {this.state.error?.message && (
              <span className="block mt-2 font-mono text-[10px] text-red-400 p-2 bg-zinc-950 rounded">
                {this.state.error.message}
              </span>
            )}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-black hover:bg-yellow-500"
          >
            <RotateCcw size={14} />
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
