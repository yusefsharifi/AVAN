import type { AppModule, PortalType } from './types';

class ModuleRegistry {
  private modules = new Map<string, AppModule>();
  private listeners = new Set<() => void>();

  register(module: AppModule): void {
    if (this.modules.has(module.id)) {
      console.warn(`Module ${module.id} is already registered`);
      return;
    }
    this.modules.set(module.id, module);
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

  getModulesForPortal(portal: PortalType): AppModule[] {
    return this.getAllModules().filter(m =>
      m.portalConfigs.some(pc => pc.portal === portal && pc.enabled)
    );
  }

  getPortalConfig(moduleId: string, portal: PortalType) {
    const module = this.modules.get(moduleId);
    if (!module) return null;
    return module.portalConfigs.find(pc => pc.portal === portal) || null;
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
