import { StatusKind } from "@/entities/document";
import { STATUS_CFG } from "@/shared/constants/status";

export const Badge = ({ status }: { status: StatusKind }) => {
  const c = STATUS_CFG[status] ?? STATUS_CFG.inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
      {c.fa}
    </span>
  );
};
