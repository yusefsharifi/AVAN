import { useState } from 'react';
import { toast } from 'sonner';

export function MessageModal({ supplierName, onClose }: { supplierName: string; onClose: () => void }) {
  const [message, setMessage] = useState('');

  const send = () => {
    if (!message.trim()) {
      toast.error('متن پیام را وارد کنید.');
      return;
    }

    toast.success(`پیام برای ${supplierName} ارسال شد.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" dir="rtl">
      <section className="w-full max-w-md rounded-xl bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <button onClick={onClose}>×</button>
          <h2 className="font-bold">ارسال پیام به {supplierName}</h2>
        </div>
        <textarea
          className="mt-4 min-h-32 w-full rounded border border-border p-3 text-sm"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="متن پیام به تأمین‌کننده"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded border px-3 py-2 text-xs" onClick={onClose}>انصراف</button>
          <button className="rounded bg-teal-600 px-3 py-2 text-xs text-white" onClick={send}>ارسال پیام</button>
        </div>
      </section>
    </div>
  );
}

export default MessageModal;
