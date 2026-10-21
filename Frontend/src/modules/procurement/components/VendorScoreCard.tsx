import { Phone, Mail } from 'lucide-react';
import type { Vendor } from '../types';
import { VENDOR_STATUS_CONFIG, VENDOR_CATEGORY_CONFIG } from '../constants';

function scoreColor(score: number) {
  return score >= 80 ? '#059669' : score >= 60 ? '#d97706' : '#dc2626';
}

export default function VendorScoreCard({ vendor, onClick }: { vendor: Vendor; onClick?: () => void }) {
  const statusCfg = VENDOR_STATUS_CONFIG[vendor.status];
  const categoryCfg = VENDOR_CATEGORY_CONFIG[vendor.category];
  const primaryContact = vendor.contacts.find((c) => c.isPrimary) ?? vendor.contacts[0];
  const latest = vendor.performanceHistory[vendor.performanceHistory.length - 1];
  const color = scoreColor(vendor.overallScore);
  const dim = 64, stroke = 7, radius = (dim - stroke) / 2, circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - vendor.overallScore / 100);

  return (
    <div onClick={onClick} className="bg-card rounded-xl border border-border shadow-sm p-4 cursor-pointer hover:border-accent/40 transition-colors" dir="rtl">
      <div className="flex items-start justify-between mb-3">
        <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
          <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={stroke} />
          <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${dim / 2} ${dim / 2})`} />
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight="bold" fill="var(--foreground)" dir="ltr">{vendor.overallScore}</text>
        </svg>
        <div className="text-right">
          <p className="text-sm font-bold text-foreground">{vendor.nameFa}</p>
          <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{vendor.vendorCode}</p>
          <span className={`inline-flex mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.color} ${statusCfg.bg}`}>{statusCfg.fa}</span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mb-2">{categoryCfg.icon} {categoryCfg.fa} — {vendor.city}</p>

      <div className="space-y-1.5 mb-3">
        {[
          { label: 'تحویل به‌موقع', value: latest?.onTimeDeliveryRate ?? 0 },
          { label: 'کیفیت', value: latest?.qualityAcceptanceRate ?? 0 },
          { label: 'انطباق قیمت', value: latest?.priceComplianceRate ?? 0 },
        ].map((m) => (
          <div key={m.label}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] font-semibold text-foreground" dir="ltr">{m.value}٪</span>
              <span className="text-[9px] text-muted-foreground">{m.label}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-1"><div className="h-1 rounded-full bg-accent" style={{ width: `${m.value}%` }} /></div>
          </div>
        ))}
      </div>

      {primaryContact && (
        <div className="flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1" dir="ltr"><Mail className="w-3 h-3" />{primaryContact.email}</span>
          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{primaryContact.mobile}</span>
        </div>
      )}
    </div>
  );
}
