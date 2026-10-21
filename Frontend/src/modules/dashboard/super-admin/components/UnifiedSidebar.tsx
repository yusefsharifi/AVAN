import { useState } from 'react';
import { useNationalStore } from '../store';
import { NavigationGroup } from '../types';
import { 
  Activity, Building2, Shield, Truck, CreditCard, Settings, 
  ChevronDown, ChevronLeft, Menu, X
} from 'lucide-react';

interface UnifiedSidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  'activity': <Activity className="w-5 h-5" />,
  'building': <Building2 className="w-5 h-5" />,
  'shield': <Shield className="w-5 h-5" />,
  'truck': <Truck className="w-5 h-5" />,
  'credit-card': <CreditCard className="w-5 h-5" />,
  'settings': <Settings className="w-5 h-5" />,
};

export function UnifiedSidebar({ currentPath, onNavigate }: UnifiedSidebarProps) {
  const { navigationGroups, sidebarCollapsed, toggleSidebar, activeNavGroup, setActiveNavGroup } = useNationalStore();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([activeNavGroup || 'monitoring']);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
    setActiveNavGroup(groupId);
  };

  const isActiveItem = (path: string) => currentPath === path;
  const isActiveGroup = (group: NavigationGroup) => 
    group.items.some(item => currentPath === item.path);

  if (sidebarCollapsed) {
    return (
      <aside className="w-16 bg-sidebar text-sidebar-foreground h-screen flex flex-col items-center py-4 border-l border-sidebar-border">
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-white mb-6"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {navigationGroups.map((group) => (
          <button
            key={group.id}
            onClick={() => {
              toggleSidebar();
              toggleGroup(group.id);
            }}
            className={`p-3 rounded-lg mb-2 transition-colors ${
              isActiveGroup(group) 
                ? 'bg-sidebar-active text-sidebar-primary' 
                : 'text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent'
            }`}
            title={group.title}
          >
            {iconMap[group.icon]}
          </button>
        ))}
      </aside>
    );
  }

  return (
    <aside className="w-72 bg-sidebar h-screen flex flex-col border-l border-sidebar-border overflow-hidden">
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
            <img src="/avan-logo.png" alt="آوان" className="h-9 w-9 object-contain" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.5))' }} />
          </div>
          <div className="text-right">
            <h1 className="text-white font-bold text-sm">سامانه آوان</h1>
            <p className="text-sidebar-foreground/60 text-xs">پنل مدیریت ملی</p>
          </div>
        </div>
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navigationGroups.map((group) => {
          const isExpanded = expandedGroups.includes(group.id);
          const isGroupActive = isActiveGroup(group);
          
          return (
            <div key={group.id} className="mb-2">
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                  isGroupActive 
                    ? 'bg-sidebar-active text-white' 
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isGroupActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/60'}>
                    {iconMap[group.icon]}
                  </span>
                  <span className="font-medium text-sm">{group.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  {group.badge && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-destructive/20 text-destructive font-medium">
                      {group.badge}
                    </span>
                  )}
                  <ChevronDown className={`w-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isExpanded && (
                <div className="mt-1 mr-4 space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = isActiveItem(item.path);
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => onNavigate(item.path)}
                        className={`w-full flex items-center justify-between p-2.5 pr-4 rounded-lg text-sm transition-all duration-200 ${
                          isActive 
                            ? 'bg-sidebar-active text-white border-r-2 border-sidebar-primary' 
                            : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{item.title}</span>
                          {item.badge && (
                            <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-medium ${
                              item.badgeType === 'critical' 
                                ? 'bg-destructive/20 text-destructive'
                                : item.badgeType === 'warning'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-sidebar-accent text-sidebar-primary'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {isActive && <ChevronLeft className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-white text-xs font-medium">م.ا</span>
          </div>
          <div className="flex-1 text-right">
            <p className="text-white text-sm font-medium">محمد احمدی</p>
            <p className="text-sidebar-foreground/60 text-xs">مدیر ارشد سیستم</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
