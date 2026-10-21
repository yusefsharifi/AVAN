import { useState } from "react";
import { ChevronLeft, Download, Printer, Filter, Archive } from "lucide-react";
import { LETTERS_V2, LetterV2 } from "@/entities/letter";
import { PersianTable, Column } from "@/shared/components/ui/PersianTable";
import { useArchiveStore } from "@/modules/correspondence/store/useArchiveStore";

const DIRECTION_LABELS: Record<string, string> = { incoming: "ورودی", outgoing: "خروجی", internal: "داخلی" };
const TYPE_LABELS: Record<string, string> = { official: "رسمی", memo: "یادداشت", circular: "بخشنامه", report: "گزارش", instruction: "دستورالعمل", request: "درخواست", response: "پاسخ" };
const CLASSIFICATION_LABELS: Record<string, string> = { unclassified: "عادی", confidential: "محرمانه", restricted: "محرمانه خیلی" };
const STATUS_LABELS: Record<string, string> = {
  draft: "پیش‌نویس", "pending-approval": "در انتظار تأیید", approved: "تأیید شده",
  sent: "ارسال شده", dispatched: "ارسال شده", archived: "بایگانی شده",
};

interface RegistryBookProps {
  onBack: () => void;
  onSelectLetter: (letter: LetterV2) => void;
}

export function RegistryBook({ onBack, onSelectLetter }: RegistryBookProps) {
  const [yearFilter, setYearFilter] = useState("1403");
  const [typeFilter, setTypeFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");

  const { shelves } = useArchiveStore();

  // Build a quick map: letterId → shelfId
  const letterArchiveMap = new Map<string, string>();
  shelves.forEach(shelf => {
    shelf.letters.forEach(l => {
      letterArchiveMap.set(l.letterId, shelf.id);
      // also index by barcode suffix
      letterArchiveMap.set(l.barcode, shelf.id);
    });
  });

  const filtered = LETTERS_V2.filter((l) => {
    const matchYear = l.registryYear.toString() === yearFilter;
    const matchType = !typeFilter || l.type === typeFilter;
    const matchDir = !directionFilter || l.direction === directionFilter;
    return matchYear && matchType && matchDir;
  });

  const columns: Column<LetterV2>[] = [
    {
      key: "registryNumber", header: "شماره ثبت", sortable: true, width: "130px",
      render: (l) => <span className="font-mono text-xs font-bold text-foreground">{l.registryNumber}</span>,
    },
    {
      key: "createdAt", header: "تاریخ ثبت", sortable: true, width: "100px",
      render: (l) => <span className="text-xs font-mono text-muted-foreground">{l.createdAt}</span>,
    },
    {
      key: "direction", header: "جهت", width: "70px",
      render: (l) => (
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
          l.direction === "incoming" ? "bg-blue-50 text-blue-700" : l.direction === "outgoing" ? "bg-emerald-50 text-emerald-700" : "bg-secondary text-muted-foreground"
        }`}>{DIRECTION_LABELS[l.direction]}</span>
      ),
    },
    {
      key: "type", header: "نوع", width: "80px",
      render: (l) => <span className="text-xs text-muted-foreground">{TYPE_LABELS[l.type]}</span>,
    },
    {
      key: "classification", header: "طبقه‌بندی", width: "80px",
      render: (l) => <span className="text-[10px] text-muted-foreground">{CLASSIFICATION_LABELS[l.classification]}</span>,
    },
    {
      key: "subject", header: "موضوع", sortable: true,
      render: (l) => (
        <div>
          <p className="text-xs font-medium text-foreground truncate max-w-xs">{l.subject}</p>
          <p className="text-[10px] text-muted-foreground">{l.sender} - {l.senderOrg}</p>
        </div>
      ),
    },
    {
      key: "recipients", header: "گیرندگان",
      render: (l) => <span className="text-[10px] text-muted-foreground">{l.recipients.map((r) => r.name).join("، ")}</span>,
    },
    {
      key: "status", header: "وضعیت", width: "100px",
      render: (l) => <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{STATUS_LABELS[l.status]}</span>,
    },
    {
      key: "enclosuresCount", header: "پیوست", width: "50px",
      render: (l) => <span className="text-xs text-muted-foreground text-center">{l.enclosuresCount}</span>,
    },
    {
      key: "archiveLocation" as any, header: "آرشیو فیزیکی", width: "110px",
      render: (l) => {
        const shelfId = letterArchiveMap.get(l.id) ?? letterArchiveMap.get(`LTR-${l.id.slice(-6)}`);
        return shelfId ? (
          <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
            <Archive className="w-2.5 h-2.5" />
            {shelfId}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/50">—</span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col h-full" dir="rtl">
      <div className="border-b border-border bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
              بازگشت
            </button>
            <h2 className="text-sm font-bold text-foreground">دفتر ثبت نامه‌ها</h2>
            <span className="text-[10px] text-muted-foreground">({filtered.length} نامه)</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg border border-border">
              <Printer className="w-3.5 h-3.5" />
              چاپ
            </button>
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg border border-border">
              <Download className="w-3.5 h-3.5" />
              خروجی اکسل
            </button>
          </div>
        </div>
        {/* Filters */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-muted-foreground" />
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
              className="bg-secondary border border-border rounded-lg py-1.5 px-2 text-xs text-foreground">
              <option value="1403">۱۴۰۳</option>
              <option value="1402">۱۴۰۲</option>
              <option value="1401">۱۴۰۱</option>
            </select>
          </div>
          <select value={directionFilter} onChange={(e) => setDirectionFilter(e.target.value)}
            className="bg-secondary border border-border rounded-lg py-1.5 px-2 text-xs text-foreground">
            <option value="">همه جهات</option>
            <option value="incoming">ورودی</option>
            <option value="outgoing">خروجی</option>
            <option value="internal">داخلی</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-secondary border border-border rounded-lg py-1.5 px-2 text-xs text-foreground">
            <option value="">همه انواع</option>
            <option value="official">رسمی</option>
            <option value="memo">یادداشت</option>
            <option value="circular">بخشنامه</option>
            <option value="report">گزارش</option>
            <option value="instruction">دستورالعمل</option>
            <option value="request">درخواست</option>
            <option value="response">پاسخ</option>
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <PersianTable
          columns={columns}
          data={filtered}
          pageSize={20}
          keyExtractor={(l) => l.id}
          onRowClick={onSelectLetter}
          emptyMessage="نامه‌ای در دفتر ثبت یافت نشد"
        />
      </div>
    </div>
  );
}
