import React, { useEffect } from 'react';
import { StoreProvider, useStore } from './lib/store';
import { Login } from './components/Login';
import { Shell } from './components/Shell';
import { Board } from './components/Board';
import { Dashboard } from './components/Dashboard';
import { DocDrawer } from './components/DocDrawer';
import { NewDocModal } from './components/NewDocModal';
import { ActivityPage, DivisionsPage, DocumentsPage, UsersPage } from './components/Pages';
import { LogsPage } from './components/LogsPage';
import { ReportModal } from './components/ReportModal';
import { AttachmentViewer } from './components/AttachmentViewer';
import { Toasts } from './components/ui';
import { I } from './components/icons';

function AppInner() {
  const { user, ui, closeDrawer, setNewOpen, setViewer } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (ui.viewer) setViewer(null);
      else if (ui.newOpen) setNewOpen(false);
      else if (ui.drawerId) closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ui.viewer, ui.newOpen, ui.drawerId, closeDrawer, setNewOpen, setViewer]);

  if (!user) {
    return (
      <>
        <Login />
        <Toasts />
      </>
    );
  }

  const page =
    user.role === 'division' && (ui.page === 'dashboard' || ui.page === 'users' || ui.page === 'userlogs' || ui.page === 'activity')
      ? 'board'
      : ui.page;

  return (
    <>
      <Shell>
        {page === 'dashboard' && <Dashboard />}
        {page === 'board' && <Board />}
        {page === 'documents' && <DocumentsPage />}
        {page === 'divisions' && <DivisionsPage />}
        {page === 'activity' && user.role !== 'division' && <ActivityPage />}
        {page === 'users' && <UsersPage />}
        {page === 'userlogs' && user.role !== 'division' && <LogsPage />}
      </Shell>
      <DocDrawer />
      <NewDocModal />
      <ReportModal />
      <AttachmentViewer />
      <Toasts />
    </>
  );
}

interface EBState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { error: null };

  static getDerivedStateFromError(error: Error): EBState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-ink-950 p-6">
          <div className="w-full max-w-xl rounded-lg border border-redx-500/40 bg-ink-900 p-7 shadow-2xl">
            <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.26em] text-redx-400">
              CEO Flow — runtime fault
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-wide text-mist-50">
              Something broke the floor
            </h1>
            <p className="mt-3 rounded-md border border-ink-600 bg-ink-850 p-3 font-mono text-[11.5px] leading-relaxed text-mist-300">
              {this.state.error.message}
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-mist-500">
              The interface crashed, but your paperwork data is safe in local storage. Reload to
              resume; if the fault repeats, clear the stored data to reseed the demo office.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={() => window.location.reload()}>
                <I n="refresh" className="h-4 w-4" sw={2.2} />
                Reload app
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  try {
                    localStorage.removeItem('ppc-ceoflow-v3');
                  } catch {
                    /* ignore */
                  }
                  window.location.reload();
                }}
              >
                <I n="trash" className="h-4 w-4" />
                Clear data & reseed
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <AppInner />
      </StoreProvider>
    </ErrorBoundary>
  );
}
