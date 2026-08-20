import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred in the system.";
      let hasFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed && parsed.error) {
            errorMessage = parsed.error;
            hasFirestoreError = true;
          }
        }
      } catch (e) {
        // Not a JSON error message, use the default string
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
          <Card className="max-w-md w-full glass-card border-destructive/20 neon-border shadow-[0_0_30px_rgba(239,68,68,0.15)]">
            <CardHeader className="text-center pb-2">
              <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-xl uppercase tracking-widest text-destructive">System Alert</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-6 text-sm">{errorMessage}</p>
              
              {hasFirestoreError && errorMessage.includes('permission') && (
                <p className="text-xs text-yellow-500 mb-6 bg-yellow-500/10 p-3 rounded-md border border-yellow-500/20">
                  Access denied. Please ensure you have the correct permissions or are authenticated to view this data.
                </p>
              )}

              <Button 
                onClick={() => window.location.href = '/'}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground uppercase tracking-wider relative group overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
                <span className="relative flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Reset Connection
                </span>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
