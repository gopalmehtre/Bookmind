import { Menu, Bell } from "lucide-react";
import { useAppStore } from "../store/appStore";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { setSidebarOpen } = useAppStore();

  return (
    <header className="h-16 bg-parchment-50/80 backdrop-blur border-b border-ink-100
                       flex items-center px-6 gap-4 sticky top-0 z-10">
      <button
        className="lg:hidden text-ink-500 hover:text-ink-800 transition-colors"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu size={20} />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="font-display text-xl font-semibold text-ink-800 leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-ink-400 font-body mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button className="relative w-9 h-9 rounded-lg border border-ink-100 bg-white
                           flex items-center justify-center text-ink-400
                           hover:text-ink-700 hover:border-ink-200 transition-all">
          <Bell size={16} />
        </button>
        <div className="w-9 h-9 rounded-lg bg-accent-500 flex items-center justify-center">
          <span className="text-parchment-50 font-body font-semibold text-sm">B</span>
        </div>
      </div>
    </header>
  );
}
