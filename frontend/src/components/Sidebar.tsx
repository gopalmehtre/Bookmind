import { NavLink } from "react-router-dom";
import { BookOpen, MessageSquare, BarChart2, Upload, Menu, X } from "lucide-react";
import { useAppStore } from "../store/appStore";

const navItems = [
  { to: "/",        icon: BarChart2,     label: "Dashboard"  },
  { to: "/books",   icon: BookOpen,      label: "Library"    },
  { to: "/ask",     icon: MessageSquare, label: "Ask AI"     },
  { to: "/scrape",  icon: Upload,        label: "Ingest"     },
];

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-ink-900/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          flex flex-col w-64 bg-ink-900 text-parchment-100
          transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center">
              <BookOpen size={16} className="text-parchment-50" />
            </div>
            <span className="font-display text-lg font-semibold text-parchment-50 leading-none">
              BookMind
            </span>
          </div>
          <button
            className="lg:hidden text-parchment-300 hover:text-parchment-50"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg font-body font-medium text-sm
                 transition-all duration-200
                 ${isActive
                   ? "bg-accent-500 text-parchment-50"
                   : "text-parchment-300 hover:bg-ink-800 hover:text-parchment-50"
                 }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ink-700">
          <p className="text-xs text-ink-400 font-body">
            AI-powered book intelligence
          </p>
          <p className="text-xs text-ink-500 mt-0.5">FastAPI · ChromaDB · RAG</p>
        </div>
      </aside>
    </>
  );
}
