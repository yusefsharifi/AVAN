import { useState } from 'react';
import { useCorrespondenceStore } from './store';
import { useKeyboardShortcuts } from './hooks';
import { LetterList } from './components/LetterList';
import { LetterDetail } from './components/LetterDetail';
import { ComposeWizard } from './components/ComposeWizard';
import { AuditLogViewer } from './components/AuditLogViewer';
import { NotificationCenter } from './components/NotificationCenter';
import { FileText, Plus, Keyboard } from 'lucide-react';

export function CorrespondenceScreen() {
  const { view, setView, selectedLetter, selectLetter, setComposeMode, getLetterStats } = useCorrespondenceStore();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const stats = getLetterStats();

  useKeyboardShortcuts({
    onNewLetter: () => setComposeMode('new'),
    onEscape: () => { selectLetter(null); setShowNotifications(false); },
    onHelp: () => setShowShortcuts(s => !s),
  });

  return (
    <div className="h-full flex flex-col bg-background" dir="rtl">
      {/* Top Bar */}
      <header className="border-b border-border px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            <h1 className="text-sm font-bold text-foreground">دبیرخانه الکترونیک</h1>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="px-2 py-0.5 rounded-full bg-secondary">{stats.total} نامه</span>
            {stats.pending > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{stats.pending} در انتظار</span>}
            {stats.overdue > 0 && <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700">{stats.overdue} سررسید گذشته</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowShortcuts(s => !s)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="میانبرها">
            <Keyboard className="w-4 h-4" />
          </button>
          <button onClick={() => setShowNotifications(s => !s)} className="relative p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center">۳</span>
          </button>
          <button onClick={() => setComposeMode('new')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors">
            <Plus className="w-3.5 h-3.5" /><span>نامه جدید</span>
          </button>
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Letter List */}
        <div className={`${selectedLetter || view === 'compose' ? 'w-[380px]' : 'flex-1'} border-l border-border flex flex-col transition-all duration-300`}>
          <LetterList
            onSelect={(letter) => selectLetter(letter.id)}
            onCompose={() => setComposeMode('new')}
          />
        </div>

        {/* Right Panel - Detail/Compose */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {view === 'list' && !selectedLetter && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-lg font-semibold text-muted-foreground">یک نامه را انتخاب کنید</p>
                <p className="text-sm text-muted-foreground/70 mt-1">یا نامه جدیدی ایجاد کنید</p>
              </div>
            </div>
          )}
          {view === 'detail' && selectedLetter && (
            <LetterDetail letterId={selectedLetter.id} onBack={() => selectLetter(null)} />
          )}
          {view === 'compose' && (
            <ComposeWizard onBack={() => { selectLetter(null); setView('list'); }} onSubmit={() => { selectLetter(null); setView('list'); }} />
          )}
          {view === 'audit' && <AuditLogViewer onBack={() => setView('list')} />}
        </div>
      </div>

      {/* Notification Panel */}
      {showNotifications && (
        <NotificationCenter onClose={() => setShowNotifications(false)} />
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowShortcuts(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-6 w-96 z-50" dir="rtl">
            <h3 className="text-base font-bold text-foreground mb-4">میانبرهای صفحه‌کلید</h3>
            <div className="space-y-2">
              {[{ key: 'N', desc: 'نامه جدید' }, { key: '/', desc: 'جستجو' }, { key: 'Esc', desc: 'بستن' }, { key: 'S', desc: 'ذخیره' }, { key: 'R', desc: 'پاسخ' }, { key: 'F', desc: 'بایگانی' }, { key: 'A', desc: 'تأیید' }, { key: '?', desc: 'راهنما' }].map(s => (
                <div key={s.key} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                  <span className="text-xs text-muted-foreground">{s.desc}</span>
                  <kbd className="px-2 py-1 rounded bg-background border border-border text-xs font-mono font-bold text-foreground">{s.key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
