import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { ShieldAlert, UserRound, Mail, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Login() {
  const { login, guest } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const go = (role: "civilian" | "admin" | "guest") =>
    nav(role === "admin" ? "/authority" : "/civilian", { replace: true });

  const handleLogin = async (asAdmin = false) => {
    if (!email || !password) {
      toast({ title: "Missing details", description: "Enter email/phone and password.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const u = await login(email, password, asAdmin);
    setLoading(false);
    go(u.role === "admin" ? "admin" : "civilian");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 map-grid-bg">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background/80" />
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full opacity-30 blur-3xl" style={{ background: "var(--gradient-primary)" }} />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full opacity-20 blur-3xl bg-safe" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Welcome back, Operator</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to access real-time zone safety, SOS mesh, and AI agents.
          </p>
        </div>

        <Card className="border-border/70 shadow-[var(--shadow-elegant)]">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email or phone</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" placeholder="you@civic.org" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>

              <Button className="w-full" onClick={() => handleLogin(false)} disabled={loading}>
                {loading ? "Signing in…" : "Login"}
              </Button>

              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                <div className="relative flex justify-center"><span className="bg-card px-2 text-[11px] uppercase tracking-wider text-muted-foreground">or</span></div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => { guest(); go("guest"); }} className="gap-2">
                  <UserRound className="h-4 w-4" /> Guest
                </Button>
                <Button variant="outline" onClick={() => handleLogin(true)} className="gap-2">
                  <ShieldAlert className="h-4 w-4" /> Login as Admin
                </Button>
              </div>
            </div>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">New here? </span>
              <Link to="/register" className="font-medium text-primary hover:underline">Register as Civilian</Link>
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Demo build · No real data is transmitted.
        </p>
      </div>
    </div>
  );
}
