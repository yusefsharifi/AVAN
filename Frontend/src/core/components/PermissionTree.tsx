// ═══════════════════════════════════════════════════════════════════════════════
// PermissionTree Component — Hierarchical RBAC Tree with Action Dependencies
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  Search,
  CheckSquare,
  Square,
  MinusSquare,
  Lock,
  Save,
  RotateCcw,
  Eye,
  PlusCircle,
  Edit,
  Trash2,
  Folder,
  FolderOpen,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { PermissionModule, PermissionSubsystem, PermissionPage } from '@/shared/api/permissions.api';

export interface PermissionTreeProps {
  catalog: PermissionModule[];
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
  readOnly?: boolean;
  isSaving?: boolean;
  isDirty?: boolean;
  onSave?: () => void;
  onReset?: () => void;
  roleName?: string;
  isSystem?: boolean;
}

const ACTION_LABELS: Record<string, { labelFa: string; icon: any; color: string }> = {
  view: { labelFa: 'مشاهده', icon: Eye, color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800' },
  create: { labelFa: 'ایجاد', icon: PlusCircle, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
  update: { labelFa: 'ویرایش', icon: Edit, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
  delete: { labelFa: 'حذف', icon: Trash2, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' },
};

function getPermissionKey(module: string, subKey: string, pageKey: string, action: string): string {
  return `${module}.${subKey}.${pageKey}.${action}`;
}

export function PermissionTree({
  catalog,
  selectedPermissions,
  onChange,
  readOnly = false,
  isSaving = false,
  isDirty = false,
  onSave,
  onReset,
  roleName,
  isSystem = false,
}: PermissionTreeProps) {
  const [search, setSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Fast set lookup for selected permissions
  const selectedSet = useMemo(() => new Set(selectedPermissions), [selectedPermissions]);

  // Check if a permission is active (including 3-part / 4-part alias match)
  const isKeyActive = useCallback(
    (mod: string, sub: string, page: string, act: string) => {
      const canonical = `${mod}.${sub}.${page}.${act}`;
      if (selectedSet.has(canonical)) return true;
      if (selectedSet.has(`${mod}.${page}.${act}`)) return true;
      if (selectedSet.has(`${mod}.${sub}.${act}`)) return true;
      return false;
    },
    [selectedSet],
  );

  // Toggle open/closed state of an accordion node
  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Expand or collapse all
  const setAllExpanded = (expanded: boolean) => {
    const next: Record<string, boolean> = {};
    for (const mod of catalog) {
      next[`mod:${mod.module}`] = expanded;
      for (const sub of mod.subsystems) {
        next[`sub:${mod.module}:${sub.key}`] = expanded;
      }
    }
    setExpandedNodes(next);
  };

  // ─── Leaf Action Checkbox Handler with Prerequisite Enforcement ─────────────
  const handleActionToggle = (
    module: string,
    subKey: string,
    page: PermissionPage,
    action: string,
  ) => {
    if (readOnly) return;

    const canonicalKey = getPermissionKey(module, subKey, page.key, action);
    const currentlyActive = isKeyActive(module, subKey, page.key, action);
    const nextSet = new Set(selectedPermissions);

    // Helpers to remove any version of this action
    const removeAction = (act: string) => {
      nextSet.delete(getPermissionKey(module, subKey, page.key, act));
      nextSet.delete(`${module}.${page.key}.${act}`);
      nextSet.delete(`${module}.${subKey}.${act}`);
    };

    if (currentlyActive) {
      // User is UNCHECKING this action
      if (action === 'view') {
        // Unchecking VIEW must cascade to uncheck ALL write actions for this page!
        for (const act of page.actions) {
          removeAction(act);
        }
      } else {
        // Unchecking an individual write action
        removeAction(action);
      }
    } else {
      // User is CHECKING this action
      nextSet.add(canonicalKey);
      // Prerequisite Rule: If checking any non-view action (create, update, delete), VIEW must be enabled!
      if (action !== 'view' && page.actions.includes('view')) {
        nextSet.add(getPermissionKey(module, subKey, page.key, 'view'));
      }
    }

    onChange(Array.from(nextSet));
  };

  // ─── Subsystem & Module Batch Toggling ──────────────────────────────────────
  // Collect all canonical keys under a subsystem
  const getSubsystemKeys = useCallback(
    (mod: PermissionModule, sub: PermissionSubsystem): string[] => {
      const keys: string[] = [];
      for (const page of sub.pages) {
        for (const act of page.actions) {
          keys.push(getPermissionKey(mod.module, sub.key, page.key, act));
        }
      }
      return keys;
    },
    [],
  );

  // Collect all canonical keys under a module
  const getModuleKeys = useCallback(
    (mod: PermissionModule): string[] => {
      const keys: string[] = [];
      for (const sub of mod.subsystems) {
        keys.push(...getSubsystemKeys(mod, sub));
      }
      return keys;
    },
    [getSubsystemKeys],
  );

  // Check state of a group: 'checked' | 'unchecked' | 'indeterminate'
  const getGroupState = useCallback(
    (keys: string[]): 'checked' | 'unchecked' | 'indeterminate' => {
      if (keys.length === 0) return 'unchecked';
      let count = 0;
      for (const k of keys) {
        const parts = k.split('.');
        if (parts.length === 4 && isKeyActive(parts[0], parts[1], parts[2], parts[3])) {
          count++;
        }
      }
      if (count === 0) return 'unchecked';
      if (count === keys.length) return 'checked';
      return 'indeterminate';
    },
    [isKeyActive],
  );

  const handleToggleGroup = (keys: string[], currentState: 'checked' | 'unchecked' | 'indeterminate') => {
    if (readOnly) return;
    const nextSet = new Set(selectedPermissions);

    if (currentState === 'checked' || currentState === 'indeterminate') {
      // Uncheck all keys in group
      for (const k of keys) {
        const parts = k.split('.');
        if (parts.length === 4) {
          nextSet.delete(k);
          nextSet.delete(`${parts[0]}.${parts[2]}.${parts[3]}`);
          nextSet.delete(`${parts[0]}.${parts[1]}.${parts[3]}`);
        }
      }
    } else {
      // Check all keys in group
      for (const k of keys) {
        nextSet.add(k);
      }
    }

    onChange(Array.from(nextSet));
  };

  // ─── Select All & Deselect All ──────────────────────────────────────────────
  const handleSelectAll = () => {
    if (readOnly) return;
    const allKeys = new Set<string>();
    for (const mod of catalog) {
      for (const sub of mod.subsystems) {
        for (const page of sub.pages) {
          for (const act of page.actions) {
            allKeys.add(getPermissionKey(mod.module, sub.key, page.key, act));
          }
        }
      }
    }
    onChange(Array.from(allKeys));
  };

  const handleDeselectAll = () => {
    if (readOnly) return;
    onChange([]);
  };

  // ─── Search Filtering ──────────────────────────────────────────────────────
  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;

    return catalog
      .map((mod) => {
        const modMatches =
          mod.module.toLowerCase().includes(q) || mod.nameFa.toLowerCase().includes(q);

        const filteredSubsystems = mod.subsystems
          .map((sub) => {
            const subMatches =
              sub.key.toLowerCase().includes(q) || sub.nameFa.toLowerCase().includes(q);

            const filteredPages = sub.pages.filter((page) => {
              const pageMatches =
                page.key.toLowerCase().includes(q) ||
                page.nameFa.toLowerCase().includes(q) ||
                page.actions.some((a) => a.toLowerCase().includes(q));
              return modMatches || subMatches || pageMatches;
            });

            if (filteredPages.length > 0 || subMatches) {
              return {
                ...sub,
                pages: filteredPages.length > 0 ? filteredPages : sub.pages,
              };
            }
            return null;
          })
          .filter(Boolean) as PermissionSubsystem[];

        if (filteredSubsystems.length > 0 || modMatches) {
          return {
            ...mod,
            subsystems: filteredSubsystems.length > 0 ? filteredSubsystems : mod.subsystems,
          };
        }
        return null;
      })
      .filter(Boolean) as PermissionModule[];
  }, [catalog, search]);

  // Total permissions calculation
  const totalAvailablePerms = useMemo(() => {
    let count = 0;
    for (const m of catalog) {
      for (const s of m.subsystems) {
        for (const p of s.pages) {
          count += p.actions.length;
        }
      }
    }
    return count;
  }, [catalog]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden font-[Vazirmatn]">
        {/* Header Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#0047E1]/10 text-[#0047E1] dark:bg-[#0047E1]/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  ماتریس دسترسی‌ها {roleName ? `— ${roleName}` : ''}
                </h3>
                {isSystem && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-[11px] gap-1">
                    <Lock className="w-3 h-3" />
                    نقش پیش‌فرض سیستم (فقط‌خواندنی)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedPermissions.length} از {totalAvailablePerms} دسترسی فعال است
              </p>
            </div>
          </div>

          {/* Action Buttons: Save & Reset */}
          {!readOnly && (
            <div className="flex items-center gap-2 self-end md:self-auto">
              {onReset && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReset}
                  disabled={!isDirty || isSaving}
                  className="gap-1.5 text-xs text-slate-600 dark:text-slate-300 h-9"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  بازنشانی
                </Button>
              )}
              {onSave && (
                <Button
                  size="sm"
                  onClick={onSave}
                  disabled={!isDirty || isSaving}
                  className="gap-1.5 text-xs bg-[#0047E1] hover:bg-[#0038b5] text-white h-9 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'در حال ذخیره...' : 'ذخیره دسترسی‌ها'}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Toolbar: Search + Select All + Expand All */}
        <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 items-center justify-between">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در نام ماژول، بخش، صفحه یا کلید دسترسی..."
              className="pr-9 h-9 text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute left-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {!readOnly && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-8 text-xs text-slate-600 dark:text-slate-300 hover:text-[#0047E1]"
                >
                  انتخاب همه
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="h-8 text-xs text-slate-600 dark:text-slate-300 hover:text-rose-600"
                >
                  لغو همه
                </Button>
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAllExpanded(true)}
              className="h-8 text-xs text-slate-500"
            >
              گسترش همه
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAllExpanded(false)}
              className="h-8 text-xs text-slate-500"
            >
              جمع کردن همه
            </Button>
          </div>
        </div>

        {/* Tree Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredCatalog.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">هیچ ماژول یا دسترسی منطبق با «{search}» یافت نشد.</p>
            </div>
          ) : (
            filteredCatalog.map((mod) => {
              const modKeys = getModuleKeys(mod);
              const modState = getGroupState(modKeys);
              const isModExpanded = search ? true : expandedNodes[`mod:${mod.module}`] ?? false;

              // Count active perms under this module
              const activeModPerms = modKeys.filter((k) => {
                const parts = k.split('.');
                return parts.length === 4 && isKeyActive(parts[0], parts[1], parts[2], parts[3]);
              }).length;

              return (
                <div
                  key={mod.module}
                  className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden transition-all bg-white dark:bg-slate-900/80 shadow-xs"
                >
                  {/* Module Header */}
                  <div className="flex items-center justify-between p-3 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none">
                    <div className="flex items-center gap-2.5 flex-1" onClick={() => toggleNode(`mod:${mod.module}`)}>
                      <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5">
                        {isModExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                      </button>

                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                        {mod.nameFa}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                        ({mod.module})
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                        {activeModPerms} / {modKeys.length}
                      </span>

                      {!readOnly && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleGroup(modKeys, modState);
                          }}
                          className="text-[#0047E1] hover:opacity-80 p-1"
                          title="انتخاب/لغو همه دسترسی‌های ماژول"
                        >
                          {modState === 'checked' ? (
                            <CheckSquare className="w-4 h-4 text-[#0047E1]" />
                          ) : modState === 'indeterminate' ? (
                            <MinusSquare className="w-4 h-4 text-[#00B8F0]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subsystems List */}
                  {isModExpanded && (
                    <div className="p-3 space-y-3 bg-slate-50/30 dark:bg-slate-950/20">
                      {mod.subsystems.map((sub) => {
                        const subKeys = getSubsystemKeys(mod, sub);
                        const subState = getGroupState(subKeys);
                        const isSubExpanded = search ? true : expandedNodes[`sub:${mod.module}:${sub.key}`] ?? true;

                        const activeSubPerms = subKeys.filter((k) => {
                          const parts = k.split('.');
                          return parts.length === 4 && isKeyActive(parts[0], parts[1], parts[2], parts[3]);
                        }).length;

                        return (
                          <div
                            key={sub.key}
                            className="border border-slate-200/80 dark:border-slate-800/80 rounded-md bg-white dark:bg-slate-900 overflow-hidden"
                          >
                            {/* Subsystem Header */}
                            <div className="flex items-center justify-between px-3 py-2 bg-slate-100/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none">
                              <div
                                className="flex items-center gap-2 flex-1"
                                onClick={() => toggleNode(`sub:${mod.module}:${sub.key}`)}
                              >
                                <button type="button" className="text-slate-400 p-0.5">
                                  {isSubExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                                </button>
                                {isSubExpanded ? (
                                  <FolderOpen className="w-4 h-4 text-[#00B8F0]" />
                                ) : (
                                  <Folder className="w-4 h-4 text-[#00B8F0]" />
                                )}
                                <span className="font-medium text-xs text-slate-700 dark:text-slate-300">
                                  {sub.nameFa}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  ({sub.key})
                                </span>
                              </div>

                              <div className="flex items-center gap-2.5">
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {activeSubPerms} / {subKeys.length}
                                </span>
                                {!readOnly && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleGroup(subKeys, subState);
                                    }}
                                    className="p-1"
                                    title="انتخاب/لغو همه دسترسی‌های زیرسیستم"
                                  >
                                    {subState === 'checked' ? (
                                      <CheckSquare className="w-3.5 h-3.5 text-[#0047E1]" />
                                    ) : subState === 'indeterminate' ? (
                                      <MinusSquare className="w-3.5 h-3.5 text-[#00B8F0]" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Pages Table / Rows */}
                            {isSubExpanded && (
                              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {sub.pages.map((page) => {
                                  return (
                                    <div
                                      key={page.key}
                                      className="px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                    >
                                      {/* Page Info */}
                                      <div className="flex items-center gap-2 min-w-[200px]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#0047E1]/50" />
                                        <div>
                                          <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                            {page.nameFa}
                                          </div>
                                          <div className="text-[10px] font-mono text-slate-400">
                                            {page.path}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Actions Badges / Checkboxes */}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {page.actions.map((act) => {
                                          const isActive = isKeyActive(mod.module, sub.key, page.key, act);
                                          const actionMeta = ACTION_LABELS[act] || {
                                            labelFa: act,
                                            icon: Sparkles,
                                            color: 'text-slate-600 bg-slate-50 border-slate-200',
                                          };
                                          const ActionIcon = actionMeta.icon;
                                          const fullKey = getPermissionKey(mod.module, sub.key, page.key, act);

                                          // Prerequisite warning tooltip note
                                          const isNonView = act !== 'view';
                                          const tooltipText = isNonView
                                            ? `${fullKey} (نیازمند مجوز مشاهده)`
                                            : fullKey;

                                          return (
                                            <Tooltip key={act}>
                                              <TooltipTrigger asChild>
                                                <button
                                                  type="button"
                                                  disabled={readOnly}
                                                  onClick={() => handleActionToggle(mod.module, sub.key, page, act)}
                                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-all select-none ${
                                                    isActive
                                                      ? `${actionMeta.color} shadow-xs font-semibold`
                                                      : 'text-slate-400 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                                  } ${readOnly ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                                                >
                                                  {isActive ? (
                                                    <CheckSquare className="w-3.5 h-3.5" />
                                                  ) : (
                                                    <Square className="w-3.5 h-3.5" />
                                                  )}
                                                  <ActionIcon className="w-3 h-3" />
                                                  <span>{actionMeta.labelFa}</span>
                                                </button>
                                              </TooltipTrigger>
                                              <TooltipContent side="top" className="font-mono text-[11px] max-w-xs">
                                                {tooltipText}
                                              </TooltipContent>
                                            </Tooltip>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default PermissionTree;
