import { Menu } from "lucide-react";

export default function WindowBar({ onMenuClick }) {
  return (
    <div className="window-bar h-11 md:h-7 flex items-center px-2 md:px-0">
      <button
        type="button"
        onClick={onMenuClick}
        className="md:hidden p-2 -m-2 rounded hover:bg-black/10 text-slate-800"
        aria-label="Open navigation menu"
      >
        <Menu size={18} />
      </button>
    </div>
  );
}
