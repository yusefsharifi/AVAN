import { useState } from 'react';
import BankAccountsTab from './BankAccountsTab';
import DocumentRegistrationTab from './DocumentRegistrationTab';
import ParentDocumentsTab from './ParentDocumentsTab';
import ChecksView from './ChecksView';
import DueDateReport from './DueDateReport';

const TABS = [
  { id: 'base_info', label: 'اطلاعات پایه' },
  { id: 'document_registration', label: 'ثبت اسناد' },
  { id: 'checks', label: 'دسته چک‌ها' },
  { id: 'parent_documents', label: 'اسناد والد' },
  { id: 'due_dates', label: 'سررسید نامه' },
] as const;

export default function ReceiptsPaymentsScreen() {
  const [tab, setTab] = useState<typeof TABS[number]['id']>('document_registration');
  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit flex-wrap">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-3.5 py-1.5 rounded-md text-xs font-medium ${tab === t.id ? 'bg-primary text-white' : 'text-muted-foreground'}`}>{t.label}</button>
        ))}
      </div>
      {tab === 'base_info' && <BankAccountsTab />}
      {tab === 'document_registration' && <DocumentRegistrationTab />}
      {tab === 'checks' && <ChecksView />}
      {tab === 'parent_documents' && <ParentDocumentsTab />}
      {tab === 'due_dates' && <DueDateReport />}
    </div>
  );
}
