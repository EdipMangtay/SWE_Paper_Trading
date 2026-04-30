// src/components/Loading.jsx
import { Loader2 } from 'lucide-react';

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-white/60">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="text-center py-16 px-4">
      {Icon && <Icon size={42} className="mx-auto text-white/20 mb-3" />}
      <div className="text-white/80 font-medium">{title}</div>
      {hint && <div className="text-white/40 text-sm mt-1">{hint}</div>}
    </div>
  );
}

export function ErrorBox({ children }) {
  return (
    <div className="bg-accent-red/10 border border-accent-red/30 text-accent-red rounded-lg px-4 py-3 text-sm">
      {children}
    </div>
  );
}
