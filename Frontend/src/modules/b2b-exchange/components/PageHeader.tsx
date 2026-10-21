import type { ReactNode } from 'react';
export function PageHeader({title,subtitle,actions}:{title:string;subtitle?:string;actions?:ReactNode}) { return <header dir="rtl" className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] text-muted-foreground">بازارگاه صنعتی / شهرک صنعتی کاوه</p><h1 className="mt-1 text-lg font-bold">{title}</h1>{subtitle&&<p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}</div><div className="flex gap-2">{actions}</div></header> }
export default PageHeader;
