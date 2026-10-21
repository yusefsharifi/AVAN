import { useState } from 'react';
import {
  ClipboardCheck,
  LayoutDashboard,
  Settings2,
  Truck,
} from 'lucide-react';

type InventoryView =
  | 'dashboard'
  | 'warehouse_setup'
  | 'item_master'
  | 'inbound'
  | 'outbound'
  | 'dispatch'
  | 'transfers'
  | 'lots'
  | 'cycle_count'
  | 'reports';

type Props = {
  activeTab: InventoryView;
  onChange: (tab: InventoryView) => void;
  badges: {
    pendingGRN: number;
    pendingMR: number;
    variance: number;
  };
};

const groups: {
  id: string;
  label: string;
  icon: React.ElementType;
  items: { id: InventoryView; label: string; badge?: keyof Props['badges'] }[];
}[] = [
  {
    id: 'overview',
    label: 'داشبورد انبار',
    icon: LayoutDashboard,
    items: [{ id: 'dashboard', label: 'نمای کلی' }],
  },
  {
    id: 'warehouse',
    label: 'ساختار انبار',
    icon: Settings2,
    items: [
      { id: 'warehouse_setup', label: 'انبار، زون و لوکیشن' },
      { id: 'item_master', label: 'کالاها و اقلام' },
      { id: 'lots', label: 'لات و سریال' },
    ],
  },
  {
    id: 'operations',
    label: 'عملیات انبار',
    icon: Truck,
    items: [
      { id: 'inbound', label: 'رسید کالا (GRN)', badge: 'pendingGRN' },
      { id: 'outbound', label: 'حواله مواد (MR)', badge: 'pendingMR' },
      { id: 'transfers', label: 'انتقال بین‌انباری' },
      { id: 'dispatch', label: 'ارسال و حمل' },
    ],
  },
  {
    id: 'control',
    label: 'کنترل و گزارش',
    icon: ClipboardCheck,
    items: [
      { id: 'cycle_count', label: 'انبارگردانی', badge: 'variance' },
      { id: 'reports', label: 'گزارشات موجودی' },
    ],
  },
];

export function InventorySidebar({ activeTab, onChange, badges }: Props) {
  const initialGroup = groups.find((group) => group.items.some((item) => item.id === activeTab))?.id ?? 'overview';
  const [openGroup, setOpenGroup] = useState(initialGroup);

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-2 text-xs" dir="rtl">
      <div className="border-b border-sidebar-border px-3 py-4">
        <p className="text-[10px] text-sidebar-primary">WAREHOUSE MANAGEMENT</p>
        <p className="mt-1 text-sm font-bold text-white">مدیریت انبار و موجودی</p>
      </div>

      <nav className="mt-2 space-y-1 overflow-y-auto">
        {groups.map((group) => {
          const Icon = group.icon;
          const isOpen = openGroup === group.id;
          const hasActiveItem = group.items.some((item) => item.id === activeTab);

          return (
            <div key={group.id}>
              <button
                className={`flex min-h-12 w-full items-center justify-between rounded-lg px-3 py-2 text-right transition-colors ${
                  hasActiveItem
                    ? 'border-r-2 border-sidebar-primary bg-sidebar-active text-white'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white'
                }`}
                onClick={() => setOpenGroup(isOpen ? '' : group.id)}
              >
                <span>{group.label}</span>
                <Icon className="h-4 w-4" />
              </button>

              {isOpen && (
                <div className="mr-3 mt-1 space-y-1 border-r border-sidebar-border pr-2">
                  {group.items.map((item) => {
                    const count = item.badge ? badges[item.badge] : 0;

                    return (
                      <button
                        className={`flex min-h-9 w-full items-center justify-between border-r-2 px-3 py-2 text-right transition-colors ${
                          activeTab === item.id
                            ? 'border-sidebar-primary bg-sidebar-active text-white'
                            : 'border-transparent text-sidebar-foreground/70 hover:border-sidebar-primary hover:bg-sidebar-accent hover:text-white'
                        }`}
                        key={item.id}
                        onClick={() => onChange(item.id)}
                      >
                        <span>{item.label}</span>
                        {count > 0 && (
                          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] text-white">
                            {count.toLocaleString('fa-IR')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto rounded-lg border border-sidebar-border bg-sidebar-accent p-3 text-[10px] text-sidebar-foreground/70">
        برای دسترسی به سایر ماژول‌ها از منوی سراسری کنار صفحه استفاده کنید.
      </div>
    </aside>
  );
}

export default InventorySidebar;
