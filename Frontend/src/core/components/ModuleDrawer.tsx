import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Menu, X, Building2, Wallet, UsersRound, Package, Factory, BarChart3 } from 'lucide-react';
const items=[
  {label:'داشبورد شرکت',path:'/company',icon:Building2},
  {label:'حسابداری و مالی',path:'/finance',icon:Wallet},
  {label:'منابع انسانی',path:'/hr',icon:UsersRound},
  {label:'انبار و موجودی',path:'/inventory',icon:Package},
  {label:'تولید',path:'/company',icon:Factory},
  {label:'گزارش‌های مالی',path:'/accounting/reports',icon:BarChart3},
  {label:'بازارگاه صنعتی',path:'/portal/marketplace',icon:Building2},
  {label:'آمار بازارگاه شهرک',path:'/city/marketplace',icon:BarChart3},
];
/** Persistent, collapsible application navigation available in standalone module routes. */
export function ModuleDrawer(){const [open,setOpen]=useState(true);const nav=useNavigate();const loc=useLocation();return <>{!open&&<button onClick={()=>setOpen(true)} title="باز کردن منوی اصلی" className="fixed right-3 top-20 z-[60] grid h-10 w-10 place-items-center rounded-lg border border-sidebar-border bg-sidebar text-white shadow-lg"><Menu size={20}/></button>}{open&&<aside dir="rtl" className="fixed right-0 top-[52px] z-[60] flex h-[calc(100vh-52px)] w-60 flex-col border-l border-sidebar-border bg-sidebar p-2 text-xs shadow-2xl"><div className="flex items-center justify-between border-b border-sidebar-border px-3 py-3"><button onClick={()=>setOpen(false)} title="پنهان کردن منوی اصلی" className="rounded p-1 text-sidebar-foreground hover:bg-sidebar-accent"><X size={17}/></button><div><p className="font-bold text-white">سامانه یکپارچه</p><p className="mt-1 text-[10px] text-sidebar-primary">دسترسی سریع ماژول‌ها</p></div></div><nav className="mt-2 space-y-1">{items.map(item=>{const Icon=item.icon;const active=loc.pathname===item.path||loc.pathname.startsWith(item.path+'/');return <button key={item.label} onClick={()=>nav(item.path)} className={`flex h-12 w-full items-center justify-between rounded-lg px-3 text-right ${active?'border-r-2 border-sidebar-primary bg-sidebar-active text-white':'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white'}`}><span>{item.label}</span><Icon size={16}/></button>})}</nav><p className="mt-auto p-3 text-[10px] text-sidebar-foreground/60">با × پنهان و با دکمه منو دوباره باز کنید.</p></aside>}</>}
