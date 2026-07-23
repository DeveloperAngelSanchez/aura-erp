import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md text-center shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto">
              <span className="text-rose-600 text-xl font-bold">!</span>
            </div>
            <h2 className="text-base font-bold text-slate-900">Algo salió mal</h2>
            <p className="text-xs text-slate-500">Ocurrió un error inesperado. Recarga la página para continuar.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
