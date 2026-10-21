import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Employee } from "../types";
import { useHRStore } from "../store/useHRStore";
import { useAuthStore } from "@/core/stores/useAuthStore";
import { ZoneSelector } from "@/shared/components";
import { toIsoDate } from "@/utils/persianFormat";

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

export interface EmployeeFormState {
  name: string; employeeId: string; position: string; department: string;
  phone: string; email: string; contractType: Employee["contractType"];
  nationalId: string; hireDateOverride: string; baseSalary: string; bankAccount: string;
  address: string; emergencyContactName: string; emergencyContactPhone: string; photoUrl: string;
  // TASK A2: only SUPER_ADMIN has no zone in its token, so only that role must
  // pick one. Other roles leave this unset and toEmployeeDto falls back to
  // scope.zoneId (resolved server-side from the JWT).
  zoneId?: string;
}

interface EmployeeModalProps {
  form: EmployeeFormState;
  setForm: React.Dispatch<React.SetStateAction<EmployeeFormState>>;
  onClose: () => void;
  editingEmployee?: Employee | null;
}

export default function EmployeeModal({ form, setForm, onClose, editingEmployee }: EmployeeModalProps) {
  const { addEmployee, updateEmployee } = useHRStore();
  // TASK A2: only SUPER_ADMIN lacks a zone in its token, so only that role sees
  // the picker. Derived from the same auth store the router guards use.
  const isSuperAdmin = useAuthStore((s) => s.user?.role === "SUPER_ADMIN");
  const isEdit = !!editingEmployee;

  const set = <K extends keyof EmployeeFormState>(key: K, value: EmployeeFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    if (isEdit && editingEmployee) {
      updateEmployee(editingEmployee.id, {
        name: form.name, employeeId: form.employeeId, position: form.position, department: form.department,
        phone: form.phone, email: form.email, contractType: form.contractType, nationalId: form.nationalId,
        baseSalary: Number(form.baseSalary || 0), bankAccount: form.bankAccount, address: form.address,
        emergencyContactName: form.emergencyContactName, emergencyContactPhone: form.emergencyContactPhone,
        photoUrl: form.photoUrl,
        zoneId: form.zoneId,
      });
      toast.success("اطلاعات کارمند به‌روزرسانی شد");
    } else {
      // تاریخ استخدام به‌صورت ISO روی خط می‌رود؛ ورودی کاربر شمسی است.
      // قبلاً اینجا «امروز» (یک رشته فارسی) ذخیره می‌شد و بعد new Date() برمی‌گشت.
      const rawHireDate = form.hireDateOverride ?? "";
      const hireDateIso = toIsoDate(rawHireDate);
      if (rawHireDate.trim() !== "" && hireDateIso === "") {
        toast.error("تاریخ استخدام نامعتبر است. نمونه قالب صحیح: ۱۴۰۳/۰۴/۱۶ یا 2025-03-21");
        return;
      }
      addEmployee({
        name: form.name, employeeId: form.employeeId, position: form.position || "—",
        department: form.department || "—", phone: form.phone || "—", email: form.email || "—",
        contractType: form.contractType, startDate: hireDateIso || toIsoDate(new Date()),
        baseSalary: Number(form.baseSalary || 0), nationalId: form.nationalId, bankAccount: form.bankAccount,
        address: form.address, emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone, photoUrl: form.photoUrl,
        zoneId: form.zoneId,
      });
      toast.success("کارمند جدید افزوده شد");
    }
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-[32rem] z-50 max-h-[88vh] overflow-y-auto" dir="rtl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
          <p className="text-sm font-bold text-foreground">{isEdit ? "ویرایش کارمند" : "افزودن کارمند جدید"}</p>
        </div>
        {isSuperAdmin && (
          <ZoneSelector
            value={form.zoneId ?? ""}
            onChange={(zoneId) => set("zoneId", zoneId || undefined)}
          />
        )}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center text-lg font-bold text-accent overflow-hidden shrink-0">
              {form.photoUrl ? <img src={form.photoUrl} alt="" className="w-full h-full object-cover" /> : (form.name.charAt(0) || "?")}
            </div>
            <div className="flex-1">
              <label className={labelCls}>آدرس عکس پروفایل (URL)</label>
              <input dir="ltr" value={form.photoUrl} onChange={(e) => set("photoUrl", e.target.value)} placeholder="https://..." className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>نام</label><input dir="rtl" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>شناسه کارمندی</label><input dir="ltr" value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>کد ملی</label><input dir="ltr" value={form.nationalId} onChange={(e) => set("nationalId", e.target.value)} className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>سمت</label><input dir="rtl" value={form.position} onChange={(e) => set("position", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>واحد سازمانی</label><input dir="rtl" value={form.department} onChange={(e) => set("department", e.target.value)} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>تاریخ استخدام</label><input dir="rtl" value={form.hireDateOverride} onChange={(e) => set("hireDateOverride", e.target.value)} placeholder="۱۴۰۳/۰۴/۱۶" className={inputCls} /></div>
            <div><label className={labelCls}>حقوق پایه (تومان)</label><input dir="ltr" type="number" value={form.baseSalary} onChange={(e) => set("baseSalary", e.target.value)} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>شماره حساب بانکی</label><input dir="ltr" value={form.bankAccount} onChange={(e) => set("bankAccount", e.target.value)} className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>تلفن</label><input dir="ltr" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>ایمیل</label><input dir="ltr" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>آدرس</label><textarea dir="rtl" value={form.address} onChange={(e) => set("address", e.target.value)} className={inputCls} rows={2} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>نام تماس اضطراری</label><input dir="rtl" value={form.emergencyContactName} onChange={(e) => set("emergencyContactName", e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>تلفن تماس اضطراری</label><input dir="ltr" value={form.emergencyContactPhone} onChange={(e) => set("emergencyContactPhone", e.target.value)} className={inputCls} /></div>
          </div>
          <div>
            <label className={labelCls}>نوع قرارداد</label>
            <select dir="rtl" value={form.contractType} onChange={(e) => set("contractType", e.target.value as Employee["contractType"])} className={inputCls}>
              <option value="permanent">دائم</option>
              <option value="contractual">قراردادی</option>
              <option value="project">پروژه‌ای</option>
            </select>
          </div>
          <button
            disabled={!form.name.trim() || !form.employeeId.trim()}
            onClick={submit}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-1">
            {isEdit ? "ذخیره تغییرات" : "افزودن کارمند"}
          </button>
        </div>
      </div>
    </>
  );
}
