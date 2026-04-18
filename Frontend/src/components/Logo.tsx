import { ShieldCheck } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
        <ShieldCheck className="h-5 w-5 text-primary-foreground" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">SafeZone Monitor</div>
          <div className="text-[11px] text-muted-foreground">Agent-based AI · Mesh SOS</div>
        </div>
      )}
    </div>
  );
}
