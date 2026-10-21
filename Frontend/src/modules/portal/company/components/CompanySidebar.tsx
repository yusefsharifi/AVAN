import { Building2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import UnifiedSidebar from '@/core/components/UnifiedSidebar';

interface NavItem {
  id: string;
  Icon: React.ElementType;
  label: string;
  path?: string;
}
interface CompanySidebarProps { page:string; setPage:(page:string)=>void; nav:NavItem[]; pendingCount:number; correspondenceCount?:number; }
export default function CompanySidebar({page,setPage,nav,pendingCount,correspondenceCount}:CompanySidebarProps){const navigate=useNavigate();return <UnifiedSidebar title="شرکت پلاستیک ایران" subtitle="پرتال شرکت · واحد A-12" icon={Building2} items={nav.map(item=>({id:item.id,label:item.label,icon:item.Icon,active:page===item.id,badge:item.id==='shipments'?pendingCount:item.id==='correspondence'&&correspondenceCount?correspondenceCount:undefined,onClick:()=>item.path?navigate(item.path):setPage(item.id)}))} footer={<p className="text-[10px] text-sidebar-navy-foreground/70">شهرک صنعتی کاوه · دسترسی شرکت</p>}/>}
