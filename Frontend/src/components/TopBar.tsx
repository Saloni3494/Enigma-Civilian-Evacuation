import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/auth";
import { LogOut, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  title: string;
  subtitle?: string;
  online?: boolean;
  right?: React.ReactNode;
}

export function TopBar({ title, subtitle, online = false, right }: Props) {
  const { user, logout } = useAuth();
  return (
    <header className="z-30 flex h-14 items-center justify-between gap-3 border-b bg-card/90 px-3 backdrop-blur-md sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Logo compact />
        <div className="hidden min-w-0 sm:block">
          <div className="truncate text-sm font-semibold">{title}</div>
          {subtitle && <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {right}
        <Badge variant="outline" className="hidden gap-1.5 sm:inline-flex">
          {online ? <Wifi className="h-3 w-3 text-safe" /> : <WifiOff className="h-3 w-3 text-moderate" />}
          {online ? "Online" : "Mesh"}
        </Badge>
        {user && (
          <div className="hidden items-center gap-2 md:flex">
            <div className="text-right text-xs leading-tight">
              <div className="font-medium">{user.name}</div>
              <div className="capitalize text-muted-foreground">{user.role}</div>
            </div>
          </div>
        )}
        <Button size="sm" variant="ghost" onClick={logout} className="gap-1.5">
          <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Exit</span>
        </Button>
      </div>
    </header>
  );
}
