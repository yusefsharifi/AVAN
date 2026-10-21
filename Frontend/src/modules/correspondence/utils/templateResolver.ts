import type { LetterTemplate, TemplateContext } from '../types/templates';
import type { Letter } from '../types';

// ── Jalali date formatter ─────────────────────────────────────────────────────
function todayJalali(): string {
  return new Date().toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ── Deeply resolve a dotted path like "company.nameFa" from context ───────────
function resolvePath(context: TemplateContext, path: string): string | undefined {
  const parts = path.split('.');
  // first part is the context key (company, permit, incident, etc.)
  const [root, ...rest] = parts;
  const subtree = (context as Record<string, unknown>)[root];
  if (!subtree || typeof subtree !== 'object') return undefined;
  let current: unknown = subtree;
  for (const key of rest) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current !== undefined && current !== null ? String(current) : undefined;
}

// ── Build a values map from context for all variables in a template ───────────
function buildValueMap(template: LetterTemplate, context: TemplateContext): Record<string, string> {
  const values: Record<string, string> = {};

  for (const variable of template.variables) {
    let resolved: string | undefined;

    switch (variable.source) {
      case 'date':
        resolved = todayJalali();
        break;

      case 'manual':
        // pull from manually-provided values
        resolved = context.manualValues?.[variable.key] ?? variable.defaultValue;
        break;

      case 'company':
      case 'permit':
      case 'user': {
        if (variable.sourcePath) {
          resolved = resolvePath(context, variable.sourcePath);
        }
        // also check currentUser for 'user' source
        if (variable.source === 'user' && !resolved) {
          resolved = context.currentUser?.name;
        }
        resolved ??= variable.defaultValue;
        break;
      }

      default:
        if (variable.sourcePath) {
          resolved = resolvePath(context, variable.sourcePath);
        }
        resolved ??= variable.defaultValue;
    }

    values[variable.key] = resolved ?? `{{${variable.key}}}`;
  }

  return values;
}

// ── Replace all {{variable}} placeholders in a string ────────────────────────
function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? `{{${key}}}`);
}

// ── Main resolver: returns a Partial<Letter> ready to merge into the wizard ───
export function resolveTemplate(
  template: LetterTemplate,
  context: TemplateContext
): Partial<Letter> {
  const values = buildValueMap(template, context);

  const subject  = interpolate(template.subjectTemplate, values);
  const body     = interpolate(template.bodyTemplate, values);
  const closing  = interpolate(template.closingTemplate, values);

  // Build approval chain from role names
  const approvalChain = template.approvalChainTemplate.map((role, i) => ({
    id: `chain-${i}`,
    order: i + 1,
    assigneeRole: role,
    assigneeName: role,
    type: i === template.approvalChainTemplate.length - 1 ? 'signer' : i === 0 ? 'reviewer' : 'approver',
    status: 'pending' as const,
    actions: [],
    dueAt: '',
  }));

  return {
    direction: template.direction,
    type: template.type,
    classification: template.classification,
    priority: template.priority,
    subject,
    body,
    closing,
    slaHours: template.slaHours,
    approvalChain,
    tags: template.tags ?? [],
    topic: template.topic,
    sender: context.currentUser?.name ?? context.company?.nameFa ?? context.company?.companyName ?? '',
    senderOrg: context.company?.nameFa ?? context.company?.companyName ?? '',
    senderRole: context.currentUser?.role ?? 'مدیرعامل',
    signatory: context.currentUser?.name ?? '',
    signatoryRole: context.currentUser?.role ?? 'مدیرعامل',
    status: 'draft',
  };
}

// ── Identify which variables still need manual input ─────────────────────────
export function getManualVariables(template: LetterTemplate) {
  return template.variables.filter(v => v.source === 'manual');
}

// ── Check if a template has all auto-resolvable values (no manual input needed)
export function isFullyAutoResolvable(template: LetterTemplate): boolean {
  return template.variables.every(v => v.source !== 'manual');
}
