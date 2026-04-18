import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { toast } from "@/hooks/use-toast";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", location: "" });
  const [loading, setLoading] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.password) {
      toast({ title: "Please complete required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    await register(form);
    setLoading(false);
    toast({ title: "Welcome aboard", description: "Your civilian account is ready." });
    nav("/civilian", { replace: true });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 map-grid-bg">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background/80" />
      <div className="relative w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Register as Civilian</h1>
          <p className="mt-1 text-sm text-muted-foreground">Get safety alerts, safe routes, and offline SOS.</p>
        </div>

        <Card className="border-border/70 shadow-[var(--shadow-elegant)]">
          <CardContent className="p-6">
            <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" placeholder="Jane Doe" value={form.name} onChange={update("name")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="+91 ..." value={form.phone} onChange={update("phone")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@email.com" value={form.email} onChange={update("email")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={form.password} onChange={update("password")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="location">Location <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="location" placeholder="City, Area" value={form.location} onChange={update("location")} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account…" : "Register"}
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
