import { useEffect, useMemo, useState } from "react";
import { TopBar } from "@/components/TopBar";
import SafetyMap from "@/components/SafetyMap";
import { MiniDroneFeed } from "@/components/MiniDroneFeed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { alerts as initialAlerts, sosEvents, zones, Zone } from "@/lib/mock-data";
import {
  AlertTriangle, Navigation, Radio, Siren, MapPin, X, Activity, ChevronUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

function StatusChip({ status }: { status: Zone["status"] }) {
  const cls = status === "safe" ? "chip-safe" : status === "moderate" ? "chip-moderate" : "chip-unsafe";
  return <span className={cls}><span className={`h-1.5 w-1.5 rounded-full bg-${status}`} /> {status.toUpperCase()}</span>;
}

export default function CivilianDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!user) nav("/login", { replace: true }); }, [user, nav]);

  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [destination, setDestination] = useState("");
  const [routeOn, setRouteOn] = useState(false);
  const [sosState, setSosState] = useState<"idle" | "sending" | "sent">("idle");
  const [sheetOpen, setSheetOpen] = useState(false);

  const unsafeNearby = useMemo(() => zones.some((z) => z.status === "unsafe"), []);

  const sendSos = () => {
    setSosState("sending");
    setTimeout(() => {
      setSosState("sent");
      toast({ title: "SOS broadcast", description: "Relayed across mesh — 4 nearby nodes acknowledged." });
    }, 1800);
    setTimeout(() => setSosState("idle"), 6000);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <TopBar
        title="Civilian Console"
        subtitle="Live zone safety · mesh-enabled"
        online={false}
      />

      {/* Alert banner */}
      {unsafeNearby && (
        <div className="z-20 flex items-center gap-2 border-b bg-unsafe-soft px-3 py-2 text-sm text-unsafe">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="truncate"><strong>Unsafe zone nearby</strong> — Riverside Quadrant. Avoid east routes.</span>
        </div>
      )}

      {/* Offline mesh banner */}
      <div className="z-20 flex items-center justify-between gap-2 border-b bg-moderate-soft px-3 py-1.5 text-xs text-moderate-foreground">
        <div className="flex items-center gap-2">
          <Radio className="h-3.5 w-3.5" />
          <span><strong>Offline mode active</strong> — Mesh network enabled · 4 nodes connected · 2 events pending sync</span>
        </div>
        <Badge variant="outline" className="hidden gap-1.5 sm:inline-flex bg-card">
          <span className="h-1.5 w-1.5 rounded-full bg-safe animate-blink" /> MESH-OK
        </Badge>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <SafetyMap
          zones={zones}
          sos={sosEvents}
          showRoute={routeOn}
          onZoneClick={setSelectedZone}
          onSosClick={(s) => toast({ title: `SOS · ${s.deviceId}`, description: `${s.status} · ${s.time}` })}
          className="absolute inset-0"
        />

        {/* Desktop: floating side panels */}
        <div className="pointer-events-none absolute inset-0 hidden md:block">
          {/* Route planner */}
          <div className="pointer-events-auto absolute left-4 top-4 w-[300px]">
            <Card className="panel">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><Navigation className="h-4 w-4" /> Safe route planner</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                <div>
                  <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">From</div>
                  <div className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> Current location
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">To</div>
                  <Input placeholder="Search destination" value={destination} onChange={(e) => setDestination(e.target.value)} />
                </div>
                <Button className="w-full" onClick={() => { setRouteOn(true); toast({ title: "Safe route ready", description: "1.4 km · Safety: 92%" }); }}>
                  Find safest route
                </Button>
                {routeOn && (
                  <div className="flex items-center justify-between rounded-md bg-safe-soft px-3 py-2 text-xs text-safe">
                    <span><strong>1.4 km</strong> · 18 min walk</span>
                    <span>Safety 92%</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Mini drone feed + alerts */}
          <div className="pointer-events-auto absolute right-4 top-4 w-[320px] space-y-3">
            <Card className="panel">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><Activity className="h-4 w-4" /> Live feed</span>
                  <span className="text-[10px] font-normal text-muted-foreground">DRONE-2 · 0.4 km</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <MiniDroneFeed />
              </CardContent>
            </Card>

            <Card className="panel">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm">Recent alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3 pt-0">
                {initialAlerts.slice(0, 4).map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-2 rounded-md border bg-background/60 p-2">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium">{a.title}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{a.detail}</div>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{a.time}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Zone info on click */}
          {selectedZone && (
            <div className="pointer-events-auto absolute bottom-28 left-1/2 w-[min(420px,92vw)] -translate-x-1/2">
              <Card className="panel">
                <CardHeader className="flex flex-row items-start justify-between p-4 pb-2">
                  <div>
                    <CardTitle className="text-sm">{selectedZone.name}</CardTitle>
                    <div className="mt-1 flex items-center gap-2"><StatusChip status={selectedZone.status} /><span className="text-[11px] text-muted-foreground">{selectedZone.updatedAt}</span></div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setSelectedZone(null)}><X className="h-4 w-4" /></Button>
                </CardHeader>
                <CardContent className="space-y-1.5 p-4 pt-0 text-sm">
                  <div className="text-muted-foreground"><strong className="text-foreground">Reason:</strong> {selectedZone.reason}</div>
                  {selectedZone.prediction && <div className="text-muted-foreground"><strong className="text-foreground">AI prediction:</strong> {selectedZone.prediction}</div>}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Mobile bottom sheet trigger */}
        <div className="pointer-events-auto absolute bottom-28 right-4 md:hidden">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="secondary" className="gap-1.5 shadow-[var(--shadow-panel)]">
                <ChevronUp className="h-4 w-4" /> Panels
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
              <SheetHeader><SheetTitle>Live overview</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="p-3 pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Navigation className="h-4 w-4" /> Safe route</CardTitle></CardHeader>
                  <CardContent className="space-y-2 p-3 pt-0">
                    <Input placeholder="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} />
                    <Button className="w-full" onClick={() => { setRouteOn(true); setSheetOpen(false); }}>Find safest route</Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="p-3 pb-2"><CardTitle className="text-sm">Live feed</CardTitle></CardHeader>
                  <CardContent className="p-3 pt-0"><MiniDroneFeed /></CardContent>
                </Card>
                <Card>
                  <CardHeader className="p-3 pb-2"><CardTitle className="text-sm">Recent alerts</CardTitle></CardHeader>
                  <CardContent className="space-y-2 p-3 pt-0">
                    {initialAlerts.map((a) => (
                      <div key={a.id} className="flex items-start justify-between gap-2 rounded-md border p-2">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium">{a.title}</div>
                          <div className="truncate text-[11px] text-muted-foreground">{a.detail}</div>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{a.time}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* SOS Floating Button */}
        <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2">
          <button
            onClick={sendSos}
            className={`flex h-20 w-20 flex-col items-center justify-center rounded-full bg-sos text-sos-foreground font-bold shadow-[0_8px_30px_-4px_hsl(var(--sos)/0.55)] transition active:scale-95 ${sosState === "idle" ? "animate-sos" : ""}`}
          >
            <Siren className="h-7 w-7" />
            <span className="mt-0.5 text-[11px] tracking-wider">SOS</span>
          </button>
          {sosState !== "idle" && (
            <div className="absolute left-1/2 top-full mt-3 w-64 -translate-x-1/2 rounded-lg border bg-card p-3 text-center text-xs shadow-[var(--shadow-panel)]">
              {sosState === "sending" ? (
                <div className="flex items-center justify-center gap-2 text-foreground">
                  <span className="h-2 w-2 rounded-full bg-sos animate-blink" />
                  Sending via mesh network…
                </div>
              ) : (
                <div className="text-safe"><strong>SOS delivered</strong> — Authorities notified.</div>
              )}
              <div className="mt-1 text-[10px] text-muted-foreground">Offline mode · 4 mesh nodes acknowledged</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
