// ── Portal Types ─────────────────────────────────────────────────────────────
export type PortalType = 'super-admin' | 'city' | 'company' | 'security';

// ── Tenant Context ───────────────────────────────────────────────────────────
export interface TenantContext {
  portal: PortalType;
  zoneId: string | null;
  companyId: string | null;
  userId: string;
  userName: string;
  permissions: Permission[];
  zoneName?: string;
  companyName?: string;
}

// ── Permission Types ─────────────────────────────────────────────────────────
export type ActionType = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'validate' | 'export' | 'admin';
export type DataScope = 'own' | 'company' | 'zone' | 'global' | 'none';

export interface Permission {
  id: string;
  portal: PortalType;
  module: string;
  action: ActionType;
  scope: DataScope;
}

// ── Module Registry Types ────────────────────────────────────────────────────
export interface PortalModuleConfig {
  portal: PortalType;
  enabled: boolean;
  defaultRoute?: string;
  sidebarItems: SidebarItem[];
  permissions: Permission[];
  dataScope: DataScope;
  actions: ActionType[];
}

export interface SidebarItem {
  id: string;
  label: string;
  labelFa: string;
  icon: string;
  path: string;
  permission?: string;
  children?: SidebarItem[];
  order?: number;
  badge?: string | number;
}

export interface AppModule {
  id: string;
  name: string;
  nameFa: string;
  icon: string;
  portalConfigs: PortalModuleConfig[];
  component: React.LazyExoticComponent<React.FC>;
}

// ── Navigation Types ─────────────────────────────────────────────────────────
export interface NavItem {
  id: string;
  label: string;
  labelFa: string;
  icon: string;
  path: string;
  children?: NavItem[];
  badge?: string | number;
}

// ── Dashboard Widget Types ────────────────────────────────────────────────────
export interface DashboardWidget {
  id: string;
  title: string;
  titleFa: string;
  component: React.LazyExoticComponent<React.FC>;
  defaultSize: { w: number; h: number };
  portal: PortalType;
}
