import { useState, type ElementType, type ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

export interface UnifiedSidebarItem {
  id: string;
  label: string;
  icon: ElementType;
  badge?: number;
  active?: boolean;
  onClick?: () => void;
  children?: UnifiedSidebarItem[];
}

export function UnifiedSidebar({ subtitle, items, footer }: { title:string; subtitle:string; icon:ElementType; items:UnifiedSidebarItem[]; footer?:ReactNode }) {
  const [openGroup, setOpenGroup] = useState<string | null>(items.find(i => i.active || i.children?.some(c => c.active))?.id ?? null);
  return <aside className="flex w-60 shrink-0 flex-col bg-sidebar-navy p-2 text-xs" dir="rtl"><div className="border-b border-sidebar-navy-border px-3 py-4"><div className="flex items-center justify-between"><img src="/avan-logo.png" alt="آوان" className="h-9 w-9 object-contain" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.4))' }} /><div className="text-right"><p className="font-bold text-white">آوان</p><p className="mt-1 text-[10px] text-accent">{subtitle}</p></div></div></div><nav className="mt-2 space-y-1 overflow-y-auto">{items.map(item=>{const Icon=item.icon;const isGroup=Boolean(item.children?.length);const active=item.active||item.children?.some(c=>c.active);const open=openGroup===item.id;return <div key={item.id}><button className={`flex h-12 w-full items-center justify-between rounded-lg px-3 text-right transition-colors ${active?'border-r-2 border-sidebar-primary bg-sidebar-active text-white':'text-sidebar-navy-foreground/80 hover:bg-sidebar-accent hover:text-white'}`} onClick={()=>isGroup?setOpenGroup(open?null:item.id):item.onClick?.()}><span>{item.label}</span><span className="flex items-center gap-2">{item.badge&&item.badge>0?<span className="rounded-full bg-destructive px-1.5 py-0.5 text-[9px] text-white">{item.badge.toLocaleString('fa-IR')}</span>:null}{isGroup?<ChevronLeft className={`h-4 w-4 transition-transform ${open?'-rotate-90':''}`}/>:<Icon className="h-4 w-4"/>}</span></button>{isGroup&&open&&<div className="mr-3 mt-1 space-y-1 border-r border-sidebar-navy-border pr-2">{item.children!.map(child=>{const ChildIcon=child.icon;return <button key={child.id} onClick={child.onClick} className={`flex min-h-9 w-full items-center justify-between border-r-2 px-3 py-2 text-right transition-colors ${child.active?'border-sidebar-primary bg-sidebar-active text-white':'border-transparent text-sidebar-navy-foreground/85 hover:border-sidebar-primary hover:bg-sidebar-accent hover:text-white'}`}><span>{child.label}</span><ChildIcon className="h-3.5 w-3.5"/></button>})}</div>}</div>})}</nav>{footer&&<div className="mt-auto border-t border-sidebar-border p-3">{footer}</div>}</aside>;
}
export default UnifiedSidebar;
