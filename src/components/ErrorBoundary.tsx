import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
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
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro não tratado:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 20px',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'var(--panel-bg, #ffffff)',
            borderRadius: '24px',
            padding: '32px 24px',
            border: '1px solid var(--panel-border, rgba(0,0,0,0.08))',
            boxShadow: 'var(--shadow-md, 0 4px 14px rgba(0,0,0,0.06))',
            maxWidth: '380px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: '#fee2e2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem'
            }}>
              ⚠️
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main, #0f172a)', margin: 0 }}>
              {this.props.fallbackTitle || 'Ops! Algo deu errado nesta tela'}
            </h3>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748b)', margin: 0, lineHeight: 1.45 }}>
              Não conseguimos montar os componentes deste módulo no momento. Toque no botão abaixo para tentar recarregar.
            </p>

            <button
              type="button"
              className="btn-pwa-primary"
              onClick={this.handleReload}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '12px',
                fontWeight: 800,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>🔄</span> Recarregar Tela
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
