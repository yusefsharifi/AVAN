import type { ReactNode } from 'react';
import B2BSidebar from './B2BSidebar';
export function B2BPageShell({ children, parkView = false }: { children: ReactNode; parkView?: boolean }) {
  return <div className="flex h-full" dir="rtl"><B2BSidebar parkView={parkView}/><main className="min-w-0 flex-1 overflow-auto bg-background">{children}</main></div>;
}
export default B2BPageShell;
