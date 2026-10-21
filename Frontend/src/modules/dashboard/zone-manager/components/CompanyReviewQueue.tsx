import { CheckCircle2, XCircle } from 'lucide-react';
import { useCompanyStore } from '../store/useCompanyStore';
import { useToastStore } from '../store/useToastStore';
import { useCorrespondenceStore } from '@/modules/correspondence/store';
import { generateResponseLetter } from '@/modules/correspondence/utils/autoLetterGenerator';
import { notifyLetterApproved, notifyLetterRejected } from '@/core/notifications/useNotificationHub';

export function CompanyReviewQueue() {
  const { companies, updateLifecycle } = useCompanyStore();
  const { addToast } = useToastStore();
  const createLetter = useCorrespondenceStore((s) => s.createLetter);
  const applicants = companies.filter((company) =>
    ['applicant', 'under_review', 'finance_review', 'hse_review', 'plot_allocation', 'zone_manager_approval'].includes(company.lifecycleStatus)
  );

  return (
    <div dir="rtl" className="space-y-5">
      <div>
        <p className="text-[10px] text-teal-600">TENANT ONBOARDING WORKFLOW</p>
        <h1 className="mt-1 text-lg font-bold">کارتابل پذیرش شرکت‌ها</h1>
      </div>
      <div className="space-y-3">
        {applicants.map(company => (
          <article className="rounded-xl border bg-card p-4" key={company.id}>
            <div className="flex justify-between">
              <span className="rounded bg-amber-50 px-2 py-1 text-[10px] text-amber-700">{company.lifecycleStatus}</span>
              <div className="text-right">
                <h2 className="font-bold">{company.companyName}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {company.industry}
                  {company.address?.block ? ` · بلوک ${company.address.block}` : ''}
                  {company.address?.unit ? ` · واحد ${company.address.unit}` : ''}
                </p>
              </div>
            </div>
            <div className="mt-3 flex justify-between text-xs">
              <span>{(company.documents?.length ?? 0).toLocaleString('fa-IR')} مدرک</span>
              <span>
                {(company.workflowHistory?.filter(step => step.status === 'completed').length ?? 0).toLocaleString('fa-IR')} از {(company.workflowHistory?.length ?? 0).toLocaleString('fa-IR')} مرحله
              </span>
            </div>
            <div className="mt-2 flex gap-1 overflow-x-auto">
              {(company.workflowHistory ?? []).map(step => (
                <span key={step.id} className={`whitespace-nowrap rounded px-2 py-1 text-[10px] ${step.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : step.status === 'in_progress' ? 'bg-blue-50 text-blue-700' : 'bg-secondary text-muted-foreground'}`}>
                  {step.order}. {step.name}
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  const next: any = {
                    applicant: 'under_review', under_review: 'finance_review',
                    finance_review: 'hse_review', hse_review: 'plot_allocation',
                    plot_allocation: 'zone_manager_approval', zone_manager_approval: 'active'
                  };
                  const status = next[company.lifecycleStatus];
                  if (status) {
                    updateLifecycle(company.id, status);
                    addToast({ type: 'success', title: 'ارسال مرحله بعد', message: 'پرونده به مرحله بعدی Workflow ارسال شد.' });
                    const responseLetter = generateResponseLetter(
                      company.id,
                      `REF-${company.id}`,
                      'approved',
                      `پرونده به مرحله "${status}" ارسال شد.`,
                      'مدیر شهرک',
                      company.companyName
                    );
                    createLetter(responseLetter);
                    notifyLetterApproved(responseLetter.subject, 'مدیر شهرک');
                  }
                }}
                className="rounded border px-3 py-2 text-xs text-emerald-700"
              >
                <CheckCircle2 className="ml-1 inline h-4 w-4" />ارسال مرحله بعد
              </button>
              <button
                onClick={() => {
                  updateLifecycle(company.id, 'suspended');
                  addToast({ type: 'error', title: 'رد', message: 'پرونده شرکت تعلیق شد.' });
                  const rejLetter = generateResponseLetter(
                    company.id,
                    `REF-${company.id}`,
                    'suspended',
                    'پرونده شرکت به دلیل عدم احراز شرایط تعلیق گردید.',
                    'مدیر شهرک',
                    company.companyName
                  );
                  createLetter(rejLetter);
                  notifyLetterRejected(rejLetter.subject, 'مدیر شهرک');
                }}
                className="rounded border px-3 py-2 text-xs text-red-600"
              >
                <XCircle className="ml-1 inline h-4 w-4" />تعلیق پرونده
              </button>
            </div>
          </article>
        ))}
        {applicants.length === 0 && (
          <div className="rounded border border-dashed p-10 text-center text-sm text-muted-foreground">
            درخواستی برای بررسی وجود ندارد.
          </div>
        )}
      </div>
    </div>
  );
}
export default CompanyReviewQueue;
