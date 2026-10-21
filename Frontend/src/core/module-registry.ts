import { ComponentType, LazyExoticComponent } from 'react';

export interface AppModule {
  id: string;
  name: string;
  nameFa: string;
  description?: string;
  version: string;
  icon: string;
  routes: RouteConfig[];
  sidebarItems: SidebarItem[];
  permissions: Permission[];
  dashboardWidgets?: DashboardWidget[];
  searchEntries?: SearchEntry[];
  onRegister?: () => void;
}

export interface RouteConfig {
  path: string;
  element: LazyExoticComponent<ComponentType>;
  title?: string;
  permission?: string;
  breadcrumb?: string[];
  children?: RouteConfig[];
}

export interface SidebarItem {
  id: string;
  label: string;
  labelFa: string;
  icon: string;
  path: string;
  permission?: string;
  children?: SidebarItem[];
  badge?: () => number | string | null;
  order?: number;
}

export interface DashboardWidget {
  id: string;
  title: string;
  component: LazyExoticComponent<ComponentType>;
  defaultSize: { w: number; h: number };
  permissions?: string[];
}

export interface SearchEntry {
  id: string;
  title: string;
  path: string;
  icon: string;
}

export interface Permission {
  id: string;
  label: string;
  description: string;
  category: string;
}

class ModuleRegistry {
  private modules = new Map<string, AppModule>();
  private listeners = new Set<() => void>();

  register(module: AppModule): void {
    if (this.modules.has(module.id)) {
      console.warn(`Module ${module.id} is already registered`);
      return;
    }
    this.validateModule(module);
    this.modules.set(module.id, module);
    module.onRegister?.();
    this.notifyListeners();
  }

  unregister(moduleId: string): void {
    this.modules.delete(moduleId);
    this.notifyListeners();
  }

  getModule(id: string): AppModule | undefined {
    return this.modules.get(id);
  }

  getAllModules(): AppModule[] {
    return Array.from(this.modules.values());
  }

  getRoutes(): RouteConfig[] {
    return this.getAllModules().flatMap(m => m.routes);
  }

  getSidebarItems(): SidebarItem[] {
    return this.getAllModules()
      .flatMap(m => m.sidebarItems)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  private validateModule(module: AppModule): void {
    if (!module.id) throw new Error('Module must have an id');
    if (!module.routes) throw new Error('Module must have routes');
    if (!module.sidebarItems) throw new Error('Module must have sidebarItems');
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
}

export const moduleRegistry = new ModuleRegistry();
