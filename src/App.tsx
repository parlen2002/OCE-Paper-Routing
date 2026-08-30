import React, { useEffect } from 'react';
import { StoreProvider, useStore } from './lib/store';
import { Login } from './components/Login';
import { Shell } from './components/Shell';
import { Board } from './components/Board';
import { Dashboard } from './components/Dashboard';
import { DocDrawer } from './components/DocDrawer';
import { NewDocModal } from './components/NewDocModal';
import { ActivityPage, DivisionsPage, DocumentsPage, UsersPage } from './components/Pages';
import { Toasts } from './components/ui';
import { I } from './components/icons';

function ImageViewer() {
  const { ui, setViewer } = useStore();
  if (!ui.viewer) return null;
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-ink-950/90 backdrop-blur-sm" onClick={() => setViewer(null)} />
      <figure className="anim-pop relative max-h-full">
        <img
          src={ui.viewer}
          alt="Attachment full view"
          className="max-h-[86vh] max-w-full rounded-lg border border-ink-600 object-contain shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]"
        />
        <button
          onClick={() => setViewer(null)}
          className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full border border-ink-600 bg-ink-850 text-mist-200 shadow-lg transition hover:border-redx-500 hover:text-redx-400"
          title="Close"
        >
          <I n="x" className="h-4 w-4" sw={2.2} />
        </button>
      </figure>
    </div>
  );
}

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
    user.role === 'division' && (ui.page === 'dashboard' || ui.page === 'users') ? 'board' : ui.page;

  return (
    <>
      <Shell>
        {page === 'dashboard' && <Dashboard />}
        {page === 'board' && <Board />}
        {page === 'documents' && <DocumentsPage />}
        {page === 'divisions' && <DivisionsPage />}
        {page === 'activity' && <ActivityPage />}
        {page === 'users' && <UsersPage />}
      </Shell>
      <DocDrawer />
      <NewDocModal />
      <ImageViewer />
      <Toasts />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  );
}
