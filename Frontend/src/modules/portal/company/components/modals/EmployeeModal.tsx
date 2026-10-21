import { X } from "lucide-react";
import { Employee } from "@/entities/user";

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

interface EmployeeForm {
  name: string; employeeId: string; position: string; department: string;
  phone: string; email: string; contractType: 'permanent' | 'contractual' | 'project';
}

interface EmployeeModalProps {
  employeeForm: EmployeeForm;
  setEmployeeForm: React.Dispatch<React.SetStateAction<EmployeeForm>>;
  setEmployeesList: React.Dispatch<React.SetStateAction<Employee[]>>;
  setModalOpen: (open: boolean) => void;
  editingEmployee?: Employee | null;
}

export default function EmployeeModal({ employeeForm, setEmployeeForm, setEmployeesList, setModalOpen, editingEmployee }: EmployeeModalProps) {
  const isEdit = !!editingEmployee;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setModalOpen(false)} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-[28rem] z-50" dir="rtl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
          <p className="text-sm font-bold text-foreground">{isEdit ? "ویرایش کارمند" : "افزودن کارمند جدید"}</p>
        </div>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          <div><label className={labelCls}>نام و نام خانوادگی</label><input dir="rtl" value={employeeForm.name} onChange={(e) => setEmployeeForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} /></div>
          <div><label className={labelCls}>شناسه کارمندی</label><input dir="ltr" value={employeeForm.employeeId} onChange={(e) => setEmployeeForm((f) => ({ ...f, employeeId: e.target.value }))} className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>سمت</label><input dir="rtl" value={employeeForm.position} onChange={(e) => setEmployeeForm((f) => ({ ...f, position: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>واحد سازمانی</label><input dir="rtl" value={employeeForm.department} onChange={(e) => setEmployeeForm((f) => ({ ...f, department: e.target.value }))} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>تلفن</label><input dir="ltr" value={employeeForm.phone} onChange={(e) => setEmployeeForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>ایمیل</label><input dir="ltr" value={employeeForm.email} onChange={(e) => setEmployeeForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} /></div>
          </div>
          <div>
            <label className={labelCls}>نوع قرارداد</label>
            <select dir="rtl" value={employeeForm.contractType} onChange={(e) => setEmployeeForm((f) => ({ ...f, contractType: e.target.value as EmployeeForm["contractType"] }))} className={inputCls}>
              <option value="permanent">دائم</option>
              <option value="contractual">قراردادی</option>
              <option value="project">پروژه‌ای</option>
            </select>
          </div>
          <button
            disabled={!employeeForm.name.trim() || !employeeForm.employeeId.trim()}
            onClick={() => {
              if (isEdit) {
                setEmployeesList((list) => list.map((e) => e.id === editingEmployee.id ? { ...e, name: employeeForm.name, employeeId: employeeForm.employeeId, position: employeeForm.position, department: employeeForm.department, phone: employeeForm.phone, email: employeeForm.email, contractType: employeeForm.contractType } : e));
              } else {
                const newEmp: Employee = {
                  id: `E${String(16 + Math.random() * 1000).slice(0, 3).padStart(3, '0')}`,
                  name: employeeForm.name, employeeId: employeeForm.employeeId, position: employeeForm.position || "—",
                  department: employeeForm.department || "—", phone: employeeForm.phone || "—", email: employeeForm.email || "—",
                  status: 'active', contractType: employeeForm.contractType, startDate: '۱۴۰۳/۰۴/۱۶', baseSalary: 20000000,
                  avatarInitial: employeeForm.name.charAt(0),
                };
                setEmployeesList((list) => [newEmp, ...list]);
              }
              setModalOpen(false);
            }}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-1">
            {isEdit ? "ذخیره تغییرات" : "افزودن کارمند"}
          </button>
        </div>
      </div>
    </>
  );
}
