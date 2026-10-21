import { useState, useMemo, useEffect } from "react";
import {
  Plus, X, ChevronLeft, ChevronRight, Search, Filter, Check, 
  AlertTriangle, Clock, User, Truck, Package, Calculator,
  Camera, FileText, Printer, Send, Archive, Trash2, BarChart2,
  TrendingUp, TrendingDown, MapPin, Navigation, Shield, Lock,
  Unlock, Users, Settings, Workflow, GitBranch, Zap,
  Percent, DollarSign, CreditCard, Wallet, Receipt, BarChart,
  BookOpen, ListOrdered, FileSpreadsheet, Table2, Grid,
  Activity, Flag, Bell, AlertCircle, HelpCircle,
  Edit2, Copy, Download, Upload, Image, Video,
} from "lucide-react";
import type {
  Waybill,
  WaybillItem,
  WaybillVerificationStep,
  WaybillVerificationItem,
  WaybillScenario,
  ItemMasterData,
  EmptyExit,
  Direction,
  WaybillStatus,
  VerificationStep,
  VerificationStatus,
  VerificationLevel,
  RejectionRecord,
} from "./waybillTypes";
import {
  WAYBILL_SCENARIOS,
  CURRENT_WAYBILL,
  WAYBILL_ITEMS,
  WAYBILL_VERIFICATION_STEPS,
  WAYBILL_AUDIT_LOGS,
  EMPTY_EXITS,
  formatCurrency,
  getStatusColor,
  getStatusLabel,
  getStepLabel,
  getVerificationStatusColor,
} from "./waybillMockData";
import { PERSIAN, t } from "./persianText";

// ─── Shared styling constants ───
const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";
const badgeCls = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium";

/* ─── Status Badge Component ─── */
const StatusBadge = ({ status, label }: { status: string; label?: string }) => {
  const variants: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border border-amber-200",
    verified: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    rejected: "bg-red-50 text-red-700 border border-red-200",
    in_progress: "bg-blue-50 text-blue-700 border border-blue-200",
    drafted: "bg-slate-50 text-slate-700 border border-slate-200",
  };
  const dots: Record<string, string> = {
    pending: "bg-amber-500",
    verified: "bg-emerald-500",
    rejected: "bg-red-500",
    in_progress: "bg-blue-500",
    drafted: "bg-slate-500",
  };
  const statusColors = variants[status] || variants["pending"];
  return (
    <span className={badgeCls + " " + statusColors}>
      <span className={"w-1.5 h-1.5 rounded-full " + (dots[status] || dots["pending"]) + " flex-shrink-0"} />
      {label || status}
    </span>
  );
};

/* ─── Waybill Item Row Component ─── */
const WaybillItemRow = ({ 
  item, 
  index, 
  isSelected,
  onSelect, 
  expectedData,
  showDetails,
  onEdit,
  onDelete,
  isTechnical = false,
  isEmptyExit = false,
}: {
  item: WaybillItem;
  index: number;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  expectedData?: any;
  showDetails?: boolean;
  onEdit?: (item: WaybillItem) => void;
  onDelete?: (itemId: string) => void;
  isTechnical?: boolean;
  isEmptyExit?: boolean;
}) => {
  const matchClass = item.quantityMatch && item.weightMatch ? "border-emerald-200 bg-emerald-50/30" : "border-red-200 bg-red-50/30";
  const totalPrice = item.unitPrice && item.quantity ? item.unitPrice * item.quantity : 0;

  return (
    <div
      className={"p-3 rounded-lg border transition-colors " + matchClass + " " + (isSelected ? "ring-2 ring-accent" : "")}
      onClick={() => onSelect?.(!isSelected)}
    >
      <div className="flex items-start gap-3">
        {isSelected !== undefined && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect?.(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-border text-accent focus:ring-accent"
          />
        )}

        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">
              {item.productName}
            </span>
            {item.sku && (
              <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">
                {item.sku}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-1">
            <span className="text-xs text-muted-foreground">
              {t("ui.quantity")} {item.quantity} × {item.unitType}
            </span>
            {item.weight > 0 && (
              <>
                <span className="text-xs text-muted-foreground">|</span>
                <span className="text-xs font-medium text-foreground">
                  {t("ui.weight")} {item.weight.toLocaleString()} {t("units.kg")}
                </span>
              </>
            )}
            {item.unitPrice && (
              <>
                <span className="text-xs text-muted-foreground">|</span>
                <span className="text-xs font-medium text-foreground">
                  {t("ui.price")} {formatCurrency(totalPrice)}
                </span>
              </>
            )}
          </div>

          {item.barcode && (
            <div className="mt-1">
              <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">
                {t("ui.barcode")} {item.barcode}
              </span>
            </div>
          )}

          {!isTechnical && !isEmptyExit && (
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => onEdit?.(item)}
                className="text-[10px] px-2 py-1 rounded bg-secondary text-foreground hover:bg-accent hover:text-white transition-colors"
              >
                {t("ui.edit")}
              </button>
              <button
                onClick={() => onDelete?.(item.id)}
                className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                {t("ui.delete")}
              </button>
            </div>
          )}
        </div>

        {item.quantityMatch && item.weightMatch && !isTechnical ? (
          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <X className="w-4 h-4 text-red-600" />
          </div>
        )}
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
            <div className="flex justify-between">
              <span>{t("ui.quantity")} {item.quantity}</span>
              <span>{t("ui.weight")} {item.weight} {t("units.kg")}</span>
            </div>
            {item.actualQuantity !== undefined && (
              <div className="flex justify-between">
                <span>{t("ui.quantity")} {item.actualQuantity}</span>
                <span>{t("ui.weight")} {item.actualWeight} {t("units.kg")}</span>
              </div>
            )}
            {item.actualQuantity !== undefined && (
              <div className="col-span-2 mt-1 p-1 rounded bg-red-50/50 text-red-700">
                <div className="font-medium">{t("ui.discrepancy")} {item.discrepancyReason || t("ui.noData")}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Verification Comparison Component ─── */
const VerificationComparison = ({ 
  verification,
  onVerifyItem,
  onDiscrepancyNote,
  isCompleted,
}: {
  verification: WaybillVerificationStep;
  onVerifyItem?: (itemId: string, status: "matched" | "mismatched" | "requires_recheck") => void;
  onDiscrepancyNote?: (itemId: string, reason: string) => void;
  isCompleted: boolean;
}) => {
  const matchedCount = verification.itemsVerified?.filter((it) => it.itemStatus === "matched").length || 0;
  const mismatchedCount = verification.itemsVerified?.filter((it) => it.itemStatus === "mismatched").length || 0;
  const totalCount = verification.itemsVerified?.length || 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <h4 className="text-sm font-semibold text-foreground">مرحله {verification.step} - {t("steps." + verification.step as keyof typeof PERSIAN.steps)}</h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t("ui.matched")}: {matchedCount}/{totalCount}</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground" />
          <StatusBadge status={verification.status} label="" />
        </div>
      </div>

      {totalCount > 0 ? (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {verification.itemsVerified?.map((item) => (
            <WaybillItemRow
              key={item.id}
              item={item}
              index={0}
              isTechnical={true}
              showDetails={true}
              onSelect={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-xs text-muted-foreground">
          {t("ui.noItems")}
        </div>
      )}

      {!isCompleted && onVerifyItem && (
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("ui.statusPerItem")}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  verification.itemsVerified?.forEach((it) => onVerifyItem(it.id, "matched"));
                }}
                className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
              >
                {t("ui.allMatched")}
              </button>
              <button
                onClick={() => {
                  verification.itemsVerified?.forEach((it) => onVerifyItem(it.id, "requires_recheck"));
                }}
                className="px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
              >
                {t("ui.needsRecheck")}
              </button>
              <button
                onClick={() => {
                  verification.itemsVerified?.forEach((it) => onVerifyItem(it.id, "mismatched"));
                }}
                className="px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
              >
                {t("ui.allMismatched")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function WaybillModule() {
  const [selectedWaybill, setSelectedWaybill] = useState<string>(CURRENT_WAYBILL.id);
  const [currentView, setCurrentView] = useState("overview");
  const [showScenarioBuilder, setShowScenarioBuilder] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState<{ [key: string]: string }>({});

  const currentWaybill = CURRENT_WAYBILL;
  const currentScenario = WAYBILL_SCENARIOS.find((s) => s.isDefault);

  /* ─── Computed values ─── */
  const matchedItemsCount = currentWaybill.verificationSteps.reduce(
    (sum, step) => sum + (step.itemsVerified?.filter((it) => it.itemStatus === "matched").length || 0),
    0
  );
  const totalItemsCount = currentWaybill.items.length;
  const verificationProgress = totalItemsCount > 0 ? (matchedItemsCount / totalItemsCount) * 100 : 0;

  const canProceedToNextStep = (currentStepIndex: number) => {
    const currentStep = currentWaybill.verificationSteps[currentStepIndex];
    return currentStep?.status === "verified" && currentStep?.nextApprover;
  };

  /* ─── Event handlers ─── */
  const handleItemVerify = (itemId: string, status: "matched" | "mismatched" | "requires_recheck") => {
    console.log("Item " + itemId + " verified as: " + status);
  };

  const handleItemDiscrepancyNote = (itemId: string, reason: string) => {
    setVerificationNotes((prev) => ({ ...prev, [itemId]: reason }));
  };

  const handleWaybillSubmit = (waybillId: string, step: VerificationStep) => {
    console.log("Submitting waybill " + waybillId + " to step: " + step);
  };

  const handleEmptyExit = (exitData: any) => {
    console.log("Empty exit recorded:", exitData);
  };

  const getStepOrder = (step: VerificationStep): number => {
    const steps: VerificationStep[] = ["technical", "manager", "security", "gate", "completion"];
    return steps.indexOf(step) + 1;
  };

  const getCurrentStepIndex = () => {
    const currentStep = currentWaybill.verificationSteps.find((step) => step.status === "in_progress");
    return currentStep ? getStepOrder(currentStep.step) - 1 : 0;
  };

  const isStepCompleted = (step: VerificationStep) => {
    const stepData = currentWaybill.verificationSteps.find((s) => s.step === step);
    return stepData?.status === "verified";
  };

  const canStepProceed = (step: VerificationStep) => {
    const currentIndex = getCurrentStepIndex();
    const stepIndex = getStepOrder(step) - 1;
    return stepIndex === currentIndex;
  };

  /* ─── Render ─── */
  return (
    <div className="h-full flex flex-col bg-background" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-bold text-foreground">{t("modules.waybill") || "پنل بارنامه"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScenarioBuilder(!showScenarioBuilder)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <Workflow className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scenario Builder Panel (compact) */}
      {showScenarioBuilder && (
        <div className="mb-4 p-3 rounded-lg bg-secondary/30 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-2">{t("ui.scenarioBuilder") || "ساختار‌ساز فرایندها"}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{t("ui.defaultScenario") || "فرایندساز پیش‌فرض: "} {currentScenario?.nameFa}</span>
            <span>•</span>
            <span>۵ مرحله: {t("steps.technical")} → {t("steps.manager")} → {t("steps.security")} → {t("steps.gate")} → {t("steps.completion")}</span>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{t("ui.workflowProgress") || "پیشرفت فرایندکار"}</span>
          <span className="text-xs font-medium text-accent">{Math.round(verificationProgress)}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-accent h-2 rounded-full transition-all duration-300"
            style={{ width: verificationProgress + "%" }}
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
        {/* Left Panel: Waybill Info & Items */}
        <div className="col-span-1 bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 flex flex-col overflow-hidden">
          {/* Waybill Header */}
          <div className="mb-4 pb-3 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-mono" dir="ltr">
                {currentWaybill.id}
              </span>
              <StatusBadge status={currentWaybill.status} label={getStatusLabel(currentWaybill.status)} />
            </div>
            <h2 className="text-base font-semibold text-foreground mb-1">
              {currentWaybill.waybillNumber}
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Truck className="w-3.5 h-3.5" />
              <span>{currentWaybill.vehiclePlate}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Package className="w-3.5 h-3.5" />
              <span>{currentWaybill.cargoType}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Calculator className="w-3.5 h-3.5" />
              <span>{t("ui.totalWeight") || "وزن کل: "} {currentWaybill.totalWeight.toLocaleString()} {t("units.kg")}</span>
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-auto space-y-3">
            <h3 className="text-xs font-semibold text-foreground sticky top-0 bg-card pb-2">
              کالاهای بارنامه ({currentWaybill.items.length} مورد)
            </h3>
            {currentWaybill.items.map((item, index) => (
              <WaybillItemRow
                key={item.id}
                item={item}
                index={index}
                isSelected={false}
                onSelect={() => {}}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mt-4 pt-3 border-t border-border space-y-2">
            <button
              onClick={() => setCurrentView("overview")}
              className="w-full py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors"
            >
              {t("ui.backToStep") || "بازگشت به مرحله"} {getCurrentStepIndex() + 1}
            </button>
            {currentWaybill.status === "draft" && (
              <button
                onClick={() => handleWaybillSubmit(currentWaybill.id, "technical")}
                className="w-full py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                {t("ui.sendForTechnicalVerification") || "ارسال برای تأیید فنی"}
              </button>
            )}
          </div>
        </div>

        {/* Middle Panel: Verification Steps */}
        <div className="col-span-1 bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 flex flex-col overflow-hidden">
          <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">
            مراحل تأیید
          </h3>

          <div className="flex-1 space-y-3 overflow-auto">
            {currentWaybill.verificationSteps.map((step, index) => (
              <div
                key={step.id}
                className={"p-3 rounded-lg border transition-colors " + (
                  step.status === "verified"
                    ? "border-emerald-200 bg-emerald-50/50"
                    : step.status === "in_progress"
                    ? "border-blue-200 bg-blue-50/50"
                    : step.status === "rejected"
                    ? "border-red-200 bg-red-50/50"
                    : "border-border bg-secondary/30"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={"w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium " + (
                        step.status === "verified"
                          ? "bg-emerald-100 text-emerald-700"
                          : step.status === "in_progress"
                          ? "bg-blue-100 text-blue-700"
                          : step.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-700"
                      )}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{t("steps." + step.step as keyof typeof PERSIAN.steps) || step.step}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {step.assignedTo || t("ui.unknown")} • {step.timeoutMinutes} دقیقه فرصت
                      </p>
                    </div>
                  </div>

                  <StatusBadge status={step.status} label="" />
                </div>

                {step.status === "in_progress" && (
                  <div className="mt-2">
                    <button
                      onClick={() => handleWaybillSubmit(currentWaybill.id, step.step)}
                      className="w-full py-1.5 rounded-md bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors"
                    >
                      {t("ui.verifyStep") || "تأیید "} {t("steps." + step.step as keyof typeof PERSIAN.steps) || step.step}
                    </button>
                  </div>
                )}

                {(step.status === "verified" || step.status === "rejected") && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground">
                      {step.approvedBy && t("ui.approvedBy") + step.approvedBy}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {step.completedAt && t("ui.onDate") + step.completedAt}
                    </p>
                    {step.rejectionReason && (
                      <div className="mt-1 p-1 rounded bg-red-50 text-red-700 text-[10px]">
                        <strong>{t("ui.rejectionReason")}</strong> {step.rejectionReason}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mt-4 pt-3 border-t border-border space-y-2">
            <h4 className="text-xs font-semibold text-foreground">{t("ui.quickActions") || "عملیات سریع"}</h4>
            <div className="grid grid-cols-2 gap-2">
              <button className="py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-accent hover:text-white transition-colors">
                {t("ui.backToStep") || "بازگشت به مرحله"}
              </button>
              <button className="py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-accent hover:text-white transition-colors">
                {t("ui.sendReminder") || "ارسال یادآوری"}
              </button>
              <button className="py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-accent hover:text-white transition-colors">
                {t("ui.generateReport") || "ساخت گزارش"}
              </button>
              <button className="py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-accent hover:text-white transition-colors">
                {t("ui.filters") || "فیلترها"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Verification Management */}
        <div className="col-span-1 bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 flex flex-col overflow-hidden">
          <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">
            تأییدات فعلی
          </h3>

          {currentWaybill.verificationSteps.map((step) => (
            <div key={step.id} className="mb-4">
              {step.status === "in_progress" && step.step === "technical" ? (
                <VerificationComparison
                  verification={step}
                  onVerifyItem={handleItemVerify}
                  onDiscrepancyNote={handleItemDiscrepancyNote}
                  isCompleted={false}
                />
              ) : step.status === "verified" ? (
                <VerificationComparison
                  verification={step}
                  onVerifyItem={() => {}}
                  onDiscrepancyNote={() => {}}
                  isCompleted={true}
                />
              ) : (
                <div className="p-3 rounded-lg border border-border bg-secondary/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-foreground">{t("ui.step")} {step.step}</span>
                    <StatusBadge status={step.status} label="" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {step.approvedBy && t("ui.approvedBy") + step.approvedBy}
                    {step.completedAt && t("ui.onDate") + step.completedAt}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Empty Exit Scenario */}
          {currentWaybill.direction === "inbound" && currentWaybill.status === "submitted" && (
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-xs font-semibold text-foreground mb-3">{t("ui.emptyExit") || "خروج خالی"}</h4>
              <button
                onClick={() => handleEmptyExit({})}
                className="w-full py-2 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium hover:bg-orange-100 transition-colors"
              >
                {t("ui.registerEmptyExit") || "ثبت خروج خالی"}
              </button>
            </div>
          )}

          {/* Report Generation */}
          <div className="mt-auto pt-4 border-t border-border">
            <h4 className="text-xs font-semibold text-foreground mb-2">{t("ui.reports") || "گزارش‌گیری"}</h4>
            <button className="w-full py-2 rounded-lg bg-secondary text-xs font-medium hover:bg-accent hover:text-white transition-colors">
              {t("ui.dailyReport") || "گزارش روزانه"}
            </button>
            <button className="w-full py-2 rounded-lg bg-secondary text-xs font-medium hover:bg-accent hover:text-white transition-colors mt-1">
              {t("ui.totalWeightReport") || "گزارش کلی وزن"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}