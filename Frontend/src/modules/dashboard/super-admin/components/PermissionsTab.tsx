import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Shield, Check, Save, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

const modules = ['Zone', 'Company', 'User', 'Financial', 'Certificate', 'Bascule', 'Waybill', 'Settings', 'Workflow', 'Reports', 'Audit'];
const actions = ['Create', 'Read', 'Update', 'Delete', 'Approve', 'Export', 'Assign'];

interface RoleDef {
  id: string;
  name: string;
  permissions: Record<string, Record<string, boolean>>;
  isSystem: boolean;
}

const roleSchema = z.object({ name: z.string().min(2) });

export default function PermissionsTab() {
  const [roles, setRoles] = useState<RoleDef[]>([
    { id: '1', name: 'SUPER_ADMIN', permissions: {}, isSystem: true },
    { id: '2', name: 'NATIONAL_AUDITOR', permissions: {}, isSystem: true },
    { id: '3', name: 'ZONE_MANAGER', permissions: {}, isSystem: true },
    { id: '4', name: 'COMPANY_ADMIN', permissions: {}, isSystem: true },
    { id: '5', name: 'OPERATOR', permissions: {}, isSystem: true },
    { id: '6', name: 'GUEST', permissions: {}, isSystem: true },
  ]);
  const [selectedRole, setSelectedRole] = useState<string>('1');

  const form = useForm({ resolver: zodResolver(roleSchema), defaultValues: { name: '' } });

  const currentRole = roles.find(r => r.id === selectedRole);
  const perms = currentRole?.permissions ?? {};

  const togglePerm = (mod: string, act: string) => {
    if (!currentRole || currentRole.isSystem) return;
    setRoles(prev => prev.map(r => {
      if (r.id !== selectedRole) return r;
      const next = { ...r, permissions: { ...r.permissions } };
      next.permissions[mod] = { ...(next.permissions[mod] ?? {}), [act]: !(next.permissions[mod]?.[act] ?? false) };
      return next;
    }));
  };

  const onAddRole = (data: { name: string }) => {
    const next: RoleDef = { id: `role-${Date.now()}`, name: data.name, permissions: {}, isSystem: false };
    setRoles(prev => [...prev, next]);
    toast.success('نقش جدید ثبت شد');
    form.reset();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-xl font-bold text-slate-800">مدیریت دسترسی‌ها (RBAC)</h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>نقش‌ها</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {roles.map(r => (
              <button key={r.id} onClick={() => setSelectedRole(r.id)} className={`w-full text-right px-3 py-2 rounded-md text-sm ${selectedRole === r.id ? 'bg-amber-100 text-amber-800 font-medium' : 'hover:bg-slate-50'}`}>
                {r.name} {r.isSystem && <Badge className="mr-2 text-[10px]">سیستمی</Badge>}
              </button>
            ))}
            <form onSubmit={form.handleSubmit(onAddRole)} className="pt-4 border-t space-y-2">
              <Input placeholder="نام نقش جدید" {...form.register('name')} />
              <Button type="submit" size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white"><UserPlus className="w-3 h-3 ml-1" /> افزودن</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>ماتریس دسترسی: {currentRole?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ماژول</TableHead>
                  {actions.map(a => <TableHead key={a} className="text-center">{a}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map(mod => (
                  <TableRow key={mod}>
                    <TableCell className="font-medium">{mod}</TableCell>
                    {actions.map(act => (
                      <TableCell key={act} className="text-center">
                        <Switch
                          checked={!!perms[mod]?.[act]}
                          onCheckedChange={() => togglePerm(mod, act)}
                          disabled={currentRole?.isSystem}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
