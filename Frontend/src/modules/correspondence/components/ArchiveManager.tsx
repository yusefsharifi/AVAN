import { useState, useMemo } from 'react';
import {
  Archive, QrCode, ArrowLeftRight, FileText, AlertTriangle,
  CheckCircle2, Package, Scan, BarChart3, X, ChevronLeft,
} from 'lucide-react';
import { useArchiveStore, selectShelfOccupancy } from '../store/useArchiveStore';
import type { ArchiveShelf } from '../store/useArchiveStore';

// ── Tab types ─────────────────────────────────────────────────────────────────
type ArchiveTab = 'map' | 'scan' | 'movements' | 'report';

const TABS: { id: ArchiveTab; label: string; icon: typeof Archive }[] = [
  { id: 'map',       label: 'نقشه آرشیو',       icon: Archive },
  { id: 'scan',      label: 'اسکن و دریافت',     icon: Scan },
  { id: 'movements', label: 'ردیابی جابجایی',    icon: ArrowLeftRight },
  { id: 'report',    label: 'گزارش آرشیو',       icon: BarChart3 },
];

// ── Occupancy colour ──────────────────────────────────────────────────────────
function occupancyColor(pct: number) {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-amber-400';
  if (pct >= 40) return 'bg-blue-400';
  return 'bg-emerald-400';
}

function occupancyBorder(pct: number) {
  if (pct >= 90) return 'border-red-300';
  if (pct >= 70) return 'border-amber-300';
  if (pct >= 40) return 'border-blue-300';
  return 'border-emerald-300';
}

// ── Shelf detail modal ────────────────────────────────────────────────────────
function ShelfModal({ shelf, onClose }: { shelf: ArchiveShelf; onClose: () => void }) {
  const pct = selectShelfOccupancy(shelf);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-5 w-96 max-h-[70vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()} dir="rtl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Archive className="w-4 h-4 text-accent" />
            {shelf.nameFa}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 bg-secondary rounded-full h-2">
            <div className={`h-2 rounded-full ${occupancyColor(pct)}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-bold text-foreground">{shelf.letters.length}/{shelf.capacity}</span>
        </div>
        <div className="flex-1 overflow-auto space-y-1.5">
          {shelf.letters.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">این جایگاه خالی است</p>
          ) : shelf.letters.map(l => (
            <div key={l.barcode} className="bg-secondary/50 rounded-lg px-3 py-2 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-foreground">{l.barcode}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(l.receivedAt).toLocaleDateString('fa-IR')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ArchiveManager() {
  const { shelves, movements, pendingScans, receiveBarcode, moveLetter, dispatchLetter } = useArchiveStore();
  const [activeTab, setActiveTab] = useState<ArchiveTab>('map');
  const [selectedShelf, setSelectedShelf] = useState<ArchiveShelf | null>(null);

  // Scan tab state
  const [scanInput, setScanInput] = useState('');
  const [targetShelf, setTargetShelf] = useState(shelves[0]?.id ?? '');
  const [scanActor, setScanActor] = useState('نگهبان آرشیو');
  const [scanResult, setScanResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Move tab state
  const [moveBarcode, setMoveBarcode] = useState('');
  const [moveToShelf, setMoveToShelf] = useState(shelves[0]?.id ?? '');
  const [moveReason, setMoveReason] = useState('');
  const [moveResult, setMoveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Stats
  const totalLetters = useMemo(() => shelves.reduce((n, s) => n + s.letters.length, 0), [shelves]);
  const totalCapacity = useMemo(() => shelves.reduce((n, s) => n + s.capacity, 0), [shelves]);
  const overloadedShelves = useMemo(() => shelves.filter(s => selectShelfOccupancy(s) >= 90), [shelves]);

  // Group shelves by row
  const rows = useMemo(() => {
    const map: Record<string, ArchiveShelf[]> = {};
    shelves.forEach(s => {
      const row = s.id.split('-')[0];
      if (!map[row]) map[row] = [];
      map[row].push(s);
    });
    return map;
  }, [shelves]);

  function handleScan() {
    if (!scanInput.trim()) return;
    const ok = receiveBarcode(scanInput.trim(), targetShelf, scanActor);
    if (ok) {
      setScanResult({ ok: true, msg: `بارکد ${scanInput} با موفقیت در ${shelves.find(s => s.id === targetShelf)?.nameFa} ثبت شد.` });
      setScanInput('');
    } else {
      setScanResult({ ok: false, msg: `خطا: بارکد نامعتبر یا جایگاه پر است.` });
    }
  }

  function handleMove() {
    if (!moveBarcode.trim() || !moveReason.trim()) return;
    const ok = moveLetter(moveBarcode.trim(), moveToShelf, scanActor, moveReason);
    if (ok) {
      setMoveResult({ ok: true, msg: `نامه ${moveBarcode} به ${shelves.find(s => s.id === moveToShelf)?.nameFa} منتقل شد.` });
      setMoveBarcode(''); setMoveReason('');
    } else {
      setMoveResult({ ok: false, msg: 'خطا: بارکد یافت نشد یا جابجایی ممکن نیست.' });
    }
  }

  const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent";
  const selectCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header stats */}
      <div className="border-b border-border px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Archive className="w-4 h-4 text-accent" />
          <span className="text-sm font-bold text-foreground">مدیریت آرشیو فیزیکی</span>
        </div>
        <div className="flex items-center gap-4 mr-auto text-xs">
          <span className="text-muted-foreground">مجموع نامه‌ها: <strong className="text-foreground">{totalLetters.toLocaleString('fa-IR')}</strong></span>
          <span className="text-muted-foreground">ظرفیت کل: <strong className="text-foreground">{totalCapacity.toLocaleString('fa-IR')}</strong></span>
          <span className="text-muted-foreground">در انتظار اسکن: <strong className="text-amber-500">{pendingScans.length}</strong></span>
          {overloadedShelves.length > 0 && (
            <span className="flex items-center gap-1 text-red-500">
              <AlertTriangle className="w-3 h-3" />
              {overloadedShelves.length} جایگاه پر
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border px-4 flex gap-0 flex-shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4">

        {/* ── TAB: Archive map ─────────────────────────────────────────────── */}
        {activeTab === 'map' && (
          <div>
            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 text-[10px]">
              {[
                { label: 'کمتر از ۴۰٪', color: 'bg-emerald-400' },
                { label: '۴۰–۷۰٪', color: 'bg-blue-400' },
                { label: '۷۰–۹۰٪', color: 'bg-amber-400' },
                { label: 'بیش از ۹۰٪', color: 'bg-red-500' },
              ].map(item => (
                <span key={item.label} className="flex items-center gap-1.5 text-muted-foreground">
                  <span className={`w-3 h-3 rounded ${item.color}`} />
                  {item.label}
                </span>
              ))}
            </div>

            {/* Shelf grid by row */}
            {Object.entries(rows).map(([row, rowShelves]) => (
              <div key={row} className="mb-4">
                <div className="text-[10px] text-muted-foreground font-bold mb-2 flex items-center gap-2">
                  <span className="bg-secondary px-2 py-0.5 rounded">ردیف {row}</span>
                  <span>{rowShelves.length} جایگاه</span>
                </div>
                <div className="grid grid-cols-9 gap-1.5">
                  {rowShelves.map(shelf => {
                    const pct = selectShelfOccupancy(shelf);
                    return (
                      <button
                        key={shelf.id}
                        onClick={() => setSelectedShelf(shelf)}
                        title={`${shelf.nameFa}\n${shelf.letters.length}/${shelf.capacity} (${pct}%)`}
                        className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-105 hover:shadow-sm ${occupancyBorder(pct)}`}
                        style={{ background: `rgba(${pct >= 90 ? '239,68,68' : pct >= 70 ? '251,191,36' : pct >= 40 ? '96,165,250' : '52,211,153'},0.12)` }}
                      >
                        <span className={`w-2 h-2 rounded-full ${occupancyColor(pct)}`} />
                        <span className="text-[8px] font-mono text-foreground/70">{shelf.id}</span>
                        <span className="text-[8px] text-muted-foreground">{pct}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB: Scan & receive ──────────────────────────────────────────── */}
        {activeTab === 'scan' && (
          <div className="max-w-md space-y-4">
            <h3 className="text-sm font-bold text-foreground">اسکن و دریافت نامه فیزیکی</h3>
            <p className="text-xs text-muted-foreground">بارکد نامه (با پیشوند LTR-) را اسکن یا تایپ کنید.</p>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">بارکد نامه</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scanInput}
                  onChange={e => { setScanInput(e.target.value); setScanResult(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleScan()}
                  placeholder="LTR-000001"
                  className={inputCls + " flex-1 font-mono"}
                  dir="ltr"
                />
                <button onClick={handleScan} className="bg-accent text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-accent/90 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5" />
                  ثبت
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">جایگاه مقصد</label>
              <select value={targetShelf} onChange={e => setTargetShelf(e.target.value)} className={selectCls}>
                {shelves.map(s => (
                  <option key={s.id} value={s.id}>{s.nameFa} ({s.letters.length}/{s.capacity})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">نام عامل</label>
              <input type="text" value={scanActor} onChange={e => setScanActor(e.target.value)} className={inputCls} />
            </div>

            {scanResult && (
              <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${scanResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {scanResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {scanResult.msg}
              </div>
            )}

            {/* Pending scans */}
            {pendingScans.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold text-foreground mb-2">در انتظار اسکن فیزیکی</p>
                <div className="space-y-1.5">
                  {pendingScans.map(id => (
                    <div key={id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <span className="text-xs font-mono text-amber-800">{id}</span>
                      <button
                        onClick={() => { setScanInput(`LTR-${id.slice(-6)}`); setScanResult(null); }}
                        className="text-[10px] text-accent font-medium hover:underline"
                      >
                        پر کردن خودکار
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Movements ──────────────────────────────────────────────── */}
        {activeTab === 'movements' && (
          <div>
            <div className="grid grid-cols-2 gap-4 max-w-2xl mb-5">
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-foreground">جابجایی نامه</h4>
                <input type="text" value={moveBarcode} onChange={e => { setMoveBarcode(e.target.value); setMoveResult(null); }}
                  placeholder="LTR-000001" className={inputCls + " font-mono"} dir="ltr" />
                <select value={moveToShelf} onChange={e => setMoveToShelf(e.target.value)} className={selectCls}>
                  {shelves.map(s => <option key={s.id} value={s.id}>{s.nameFa}</option>)}
                </select>
                <input type="text" value={moveReason} onChange={e => setMoveReason(e.target.value)}
                  placeholder="دلیل جابجایی..." className={inputCls} />
                <button onClick={handleMove} className="w-full bg-accent text-white py-2 rounded-lg text-xs font-bold hover:bg-accent/90 transition-colors">
                  ثبت جابجایی
                </button>
                {moveResult && (
                  <div className={`flex items-center gap-2 p-2 rounded-lg text-xs ${moveResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {moveResult.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {moveResult.msg}
                  </div>
                )}
              </div>

              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-foreground">ارسال خارج از آرشیو</h4>
                <input type="text" id="dispatch-barcode" placeholder="LTR-000001" className={inputCls + " font-mono"} dir="ltr" />
                <input type="text" id="dispatch-reason" placeholder="دلیل ارسال..." className={inputCls} />
                <button
                  onClick={() => {
                    const bc = (document.getElementById('dispatch-barcode') as HTMLInputElement)?.value;
                    const rs = (document.getElementById('dispatch-reason') as HTMLInputElement)?.value;
                    if (bc && rs) dispatchLetter(bc.trim(), scanActor, rs.trim());
                  }}
                  className="w-full bg-red-500/10 text-red-600 border border-red-200 py-2 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors"
                >
                  خروج از آرشیو
                </button>
              </div>
            </div>

            {/* Movement log */}
            <h4 className="text-xs font-bold text-foreground mb-3">تاریخچه جابجایی‌ها</h4>
            {movements.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">هیچ جابجایی ثبت نشده است.</p>
            ) : (
              <div className="space-y-1.5">
                {[...movements].reverse().map(m => (
                  <div key={m.id} className="bg-card border border-border rounded-lg px-4 py-2.5 flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {m.fromShelfId === null
                        ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">دریافت</span>
                        : m.toShelfId === null
                        ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">ارسال</span>
                        : <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">جابجایی</span>
                      }
                    </div>
                    <span className="font-mono text-xs text-foreground">{m.barcode}</span>
                    <span className="text-xs text-muted-foreground flex-1">
                      {m.fromShelfId ?? '—'} <ChevronLeft className="w-3 h-3 inline rotate-180" /> {m.toShelfId ?? '—'}
                    </span>
                    <span className="text-xs text-muted-foreground">{m.reason}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{new Date(m.timestamp).toLocaleDateString('fa-IR')}</span>
                    <span className="text-[10px] text-muted-foreground">{m.actor}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Report ─────────────────────────────────────────────────── */}
        {activeTab === 'report' && (
          <div className="max-w-2xl space-y-5">
            <h3 className="text-sm font-bold text-foreground">گزارش وضعیت آرشیو</h3>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'نامه‌های بایگانی شده', value: totalLetters, icon: Package, color: 'text-blue-600' },
                { label: 'جایگاه‌های پر', value: overloadedShelves.length, icon: AlertTriangle, color: 'text-red-500' },
                { label: 'در انتظار اسکن', value: pendingScans.length, icon: Scan, color: 'text-amber-500' },
              ].map(item => (
                <div key={item.label} className="bg-card border border-border rounded-xl p-4 text-center">
                  <item.icon className={`w-5 h-5 mx-auto mb-2 ${item.color}`} />
                  <p className="text-lg font-bold text-foreground">{item.value.toLocaleString('fa-IR')}</p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>

            <div>
              <h4 className="text-xs font-bold text-foreground mb-2">جایگاه‌های بحرانی (بیش از ۹۰٪ اشغال)</h4>
              {overloadedShelves.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <CheckCircle2 className="w-4 h-4" />
                  هیچ جایگاه بحرانی وجود ندارد.
                </div>
              ) : overloadedShelves.map(s => (
                <div key={s.id} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-1.5">
                  <span className="text-xs text-red-800 font-medium">{s.nameFa}</span>
                  <span className="text-xs font-bold text-red-600">{s.letters.length}/{s.capacity}</span>
                </div>
              ))}
            </div>

            <div>
              <h4 className="text-xs font-bold text-foreground mb-2">نامه‌های بدون نسخه فیزیکی</h4>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-xs text-amber-800">
                <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />
                {pendingScans.length > 0
                  ? `${pendingScans.length.toLocaleString('fa-IR')} نامه در انتظار دریافت نسخه فیزیکی هستند.`
                  : 'تمام نامه‌ها دارای نسخه فیزیکی هستند.'
                }
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Shelf modal */}
      {selectedShelf && (
        <ShelfModal shelf={selectedShelf} onClose={() => setSelectedShelf(null)} />
      )}
    </div>
  );
}
