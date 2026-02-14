import React from "react";
import { Plus, GitBranch, Search, Trash2, BookOpen } from "lucide-react";
import type { View } from "../App";

interface SidebarProps {
  active: View;
  onChange: (view: View) => void;
  onClear: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  active,
  onChange,
  onClear,
}) => {
  const items: { id: View; icon: React.ElementType }[] = [
    { id: "input", icon: Plus },
    { id: "graph", icon: GitBranch },
    { id: "chat", icon: Search },
  ];

  return (
    <aside className="w-20 border-r border-blue-900/30 flex flex-col items-center py-6 gap-8 bg-gray-950 shadow-lg">
      <div className="w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center mb-4">
        <BookOpen size={24} className="text-white" />
      </div>

      <nav className="flex flex-col gap-5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`p-3 rounded-xl transition-all duration-200 ${
              active === item.id
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-400 hover:bg-gray-800 hover:text-blue-300"
            }`}
          >
            <item.icon size={22} />
          </button>
        ))}
      </nav>

      <div className="mt-auto">
        <button
          onClick={onClear}
          className="p-3 text-gray-400 hover:text-red-500 hover:bg-gray-800 rounded-xl transition-all duration-200"
        >
          <Trash2 size={22} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;