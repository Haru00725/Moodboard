import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, FolderOpen, CreditCard, Settings, LogOut, Sparkles, Menu, X, Moon, Sun, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudioSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  open: boolean;
  onToggle: () => void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/studio" },
  { id: "templates", label: "Templates", icon: Palette, path: "/templates" },
  { id: "projects", label: "Projects", icon: FolderOpen, path: "/projects" },
  { id: "billing", label: "Billing", icon: CreditCard, path: "/billing" },
  { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
];

const StudioSidebar: React.FC<StudioSidebarProps> = ({ activeTab, onTabChange, open, onToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = React.useState(() => document.documentElement.classList.contains("dark"));

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <>
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-sidebar text-sidebar-foreground"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="fixed inset-0 bg-foreground/30 z-30 lg:hidden" onClick={onToggle} />
      )}

      <aside
        className={cn(
          "fixed lg:static z-40 h-screen w-64 bg-sidebar flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Sparkles className="text-sidebar-accent" size={22} />
            <h1 className="font-heading text-xl text-sidebar-foreground tracking-wide">
              Lovers <span className="text-sidebar-accent">AI</span>
            </h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { onTabChange(item.id); navigate(item.path); if (window.innerWidth < 1024) onToggle(); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-body transition-all",
                activeTab === item.id
                  ? "bg-sidebar-accent/15 text-sidebar-accent"
                  : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-border/30"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-3">
          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-body text-sidebar-muted hover:text-sidebar-foreground transition-colors"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
            {dark ? "Light Mode" : "Dark Mode"}
          </button>

          <div className="px-4">
            <p className="text-xs text-sidebar-muted font-body">Signed in as</p>
            <p className="text-sm text-sidebar-foreground font-body truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-body",
                user?.plan === "FREE"
                  ? "bg-sidebar-border text-sidebar-muted"
                  : "bg-sidebar-accent/20 text-sidebar-accent"
              )}>
                {user?.plan === "PRO" ? "Pro" : user?.plan === "PRO_PLUS" ? "Pro+" : "Free"}
              </span>
              <span className="text-xs text-sidebar-muted font-body">{user?.credits ?? 0} credits</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-sidebar-muted hover:text-red-400 transition-colors font-body"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default StudioSidebar;
