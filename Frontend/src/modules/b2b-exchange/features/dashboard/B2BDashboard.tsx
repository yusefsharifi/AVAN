import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { FileText, Send } from 'lucide-react';
import B2BPageShell from '../../components/B2BPageShell';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { mockNotifications } from '../../data/mockData';
import { useB2BStore } from '../../store/useB2BStore';

const fa = (value: number) => value.toLocaleString('fa-IR');

export default function B2BDashboard() {
  const navigate = useNavigate();
  const { currentCompany, getStats, getMyRFQs, getMyBids, getAvailableRFQs } = useB2BStore();
  const stats = getStats();
  const rfqs = getMyRFQs().slice(0, 3);
  const bids = getMyBids().slice(0, 3);

  return (
    <B2BPageShell>
      <div className="space-y-5 p-5" dir="rtl">
        <PageHeader
          title="بازارگاه صنعتی"
          subtitle="خرید و فروش B2B داخل شهرک صنعتی"
          actions={<button onClick={() => navigate('/portal/marketplace/rfqs/create')} className="rounded bg-teal-600 px-3 py-2 text-xs text-white">+ استعلام جدید</button>}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ProfileCard title="نمایه خریدار" icon={<FileText className="text-teal-600" />} stats={[['RFQ فعال', stats.activeRFQs], ['پیشنهاد جدید', rfqs.reduce((sum, rfq) => sum + rfq.bidCount, 0)], ['صرفه‌جویی', fa(stats.totalSavings)]]} actions={<><button onClick={() => navigate('/portal/marketplace/rfqs/create')} className="rounded bg-teal-600 px-3 py-2 text-xs text-white">استعلام جدید</button><button onClick={() => navigate('/portal/marketplace/rfqs')} className="rounded border px-3 py-2 text-xs">مشاهده استعلام‌ها</button></>} />
          <ProfileCard title="نمایه فروشنده" icon={<Send className="text-blue-600" />} stats={[['فرصت‌های فعال', getAvailableRFQs().length], ['پیشنهادات', stats.activeBids], ['امتیاز', `${currentCompany.rating} ★`]]} actions={<><button onClick={() => navigate('/portal/marketplace/bids/opportunities')} className="rounded bg-blue-600 px-3 py-2 text-xs text-white">مشاهده فرصت‌ها</button><button onClick={() => navigate('/portal/marketplace/bids')} className="rounded border px-3 py-2 text-xs">پیشنهادات من</button></>} />
        </div>
        <section className="rounded-xl border p-4"><h2 className="mb-3 font-bold">اقدامات و اعلان‌ها</h2>{mockNotifications.map(notification => <button key={notification.id} onClick={() => notification.rfqId && navigate(`/portal/marketplace/rfqs/${notification.rfqId}`)} className="flex w-full items-center justify-between border-b p-3 text-right text-xs last:border-0"><span>{notification.message}</span><span className="text-teal-700">مشاهده</span></button>)}</section>
        <section className="rounded-xl border p-4"><h2 className="mb-3 font-bold">فعالیت‌های اخیر</h2><table className="w-full text-xs"><thead><tr>{['نوع', 'عنوان', 'وضعیت', 'تاریخ'].map(header => <th className="p-2 text-right" key={header}>{header}</th>)}</tr></thead><tbody>{[...rfqs.map(rfq => ({ type: 'خرید', title: rfq.title, status: rfq.status, date: rfq.createdAt })), ...bids.map(bid => ({ type: 'فروش', title: bid.rfqTitle, status: bid.status, date: bid.createdAt }))].map((item, index) => <tr className="border-t" key={index}><td className="p-2">{item.type}</td><td>{item.title}</td><td><StatusBadge status={item.status} /></td><td>{item.date}</td></tr>)}</tbody></table></section>
      </div>
    </B2BPageShell>
  );
}
function ProfileCard({ title, icon, stats, actions }: { title: string; icon: ReactNode; stats: [string, string | number][]; actions: ReactNode }) { return <section className="rounded-xl border p-5"><div className="mb-3 flex items-center justify-between">{icon}<h2 className="font-bold">{title}</h2></div><div className="grid grid-cols-3 gap-2 text-center text-xs">{stats.map(([label,value])=><div className="rounded bg-secondary/40 p-3" key={label}><p className="text-muted-foreground">{label}</p><p className="mt-1 font-bold">{value}</p></div>)}</div><div className="mt-4 flex gap-2">{actions}</div></section>; }
