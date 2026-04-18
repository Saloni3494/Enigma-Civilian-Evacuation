import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import SafetyMap from "@/components/SafetyMap";
import { MiniDroneFeed } from "@/components/MiniDroneFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain, Radio, Siren, Layers, Camera, Activity, Server, Plus, MapPinned, Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  blackBox, meshDevices, sosEvents, zones,
} from "@/lib/mock-data";

function AgentRow({ icon: Icon, name, status, detail, tone = "safe" as "safe" | "moderate" | "unsafe" }: {
  icon: React.ComponentType<{ className?: string }>;
  name: string; status: string; detail: string; tone?: "safe" | "moderate" | "unsafe";
}) {
  const toneCls = tone === "safe" ? "chip-safe" : tone === "moderate" ? "chip-moderate" : "chip-unsafe";
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border bg-background/60 p-3">
      <div className="flex items-start gap-2.5">
        <div className="rounded-md bg-accent p-1.5 text-accent-foreground"><Icon className="h-4 w-4" /></div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{name}</div>
          <div className="text-[11px] text-muted-foreground">{detail}</div>
        </div>
      </div>
      <span className={toneCls}>{status}</span>
    </div>
  );
}

export default function AuthorityDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!user) nav("/login", { replace: true }); }, [user, nav]);

  const [satellite, setSatellite] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showPredictions, setShowPredictions] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [droneFeed, setDroneFeed] = useState(true);

  const counts = {
    safe: zones.filter((z) => z.status === "safe").length,
    moderate: zones.filter((z) => z.status === "moderate").length,
    unsafe: zones.filter((z) => z.status === "unsafe").length,
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <TopBar
        title="Authority Operations Console"
        subtitle="Multi-agent · Satellite · Drone · Mesh"
        online
        right={
          <div className="hidden gap-1.5 lg:flex">
            <span className="chip-safe">{counts.safe} Safe</span>
            <span className="chip-moderate">{counts.moderate} Moderate</span>
            <span className="chip-unsafe">{counts.unsafe} Unsafe</span>
          </div>
        }
      />

      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)_340px]">
        {/* LEFT — controls */}
        <aside className="hidden flex-col gap-3 overflow-y-auto border-r bg-card/40 p-3 lg:flex">
          <Card className="panel">
            <CardHeader className="p-3 pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Layers className="h-4 w-4" /> Data sources</CardTitle></CardHeader>
            <CardContent className="space-y-3 p-3 pt-0 text-sm">
              <div className="flex items-center justify-between"><Label htmlFor="sat">Satellite (ISRO/NASA)</Label><Switch id="sat" checked={satellite} onCheckedChange={setSatellite} /></div>
              <div className="flex items-center justify-between"><Label htmlFor="drn">Drone feed</Label><Switch id="drn" checked={droneFeed} onCheckedChange={setDroneFeed} /></div>
              <div className="flex items-center justify-between"><Label htmlFor="hm">Heatmap overlay</Label><Switch id="hm" checked={showHeatmap} onCheckedChange={setShowHeatmap} /></div>
              <div className="flex items-center justify-between"><Label htmlFor="pred">Predictions</Label><Switch id="pred" checked={showPredictions} onCheckedChange={setShowPredictions} /></div>
              <div className="flex items-center justify-between"><Label htmlFor="rt">Safe routes</Label><Switch id="rt" checked={showRoute} onCheckedChange={setShowRoute} /></div>
            </CardContent>
          </Card>

          <Card className="panel">
            <CardHeader className="p-3 pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Brain className="h-4 w-4" /> AI Agents</CardTitle></CardHeader>
            <CardContent className="space-y-2 p-3 pt-0">
              <AgentRow icon={Sparkles} name="Classification Agent" status="ACTIVE" detail="5 zones · last update 14s ago" tone="safe" />
              <AgentRow icon={Activity} name="Prediction Agent" status="WARNING" detail="2 zones may escalate in 25m" tone="moderate" />
              <AgentRow icon={MapPinned} name="Safe Path Agent" status="ROUTING" detail="Generated 7 evac routes" tone="safe" />
            </CardContent>
          </Card>

          <Card className="panel">
            <CardHeader className="p-3 pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Plus className="h-4 w-4" /> Manual input</CardTitle></CardHeader>
            <CardContent className="space-y-2 p-3 pt-0">
              <Input placeholder="Incident title" />
              <Input placeholder="Coordinates (lat, lng)" />
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" variant="outline" className="border-safe text-safe">Safe</Button>
                <Button size="sm" variant="outline" className="border-moderate text-moderate">Mod.</Button>
                <Button size="sm" variant="outline" className="border-unsafe text-unsafe">Unsafe</Button>
              </div>
              <Button size="sm" className="w-full">Mark hazard zone</Button>
            </CardContent>
          </Card>
        </aside>

        {/* CENTER — map */}
        <section className="relative">
          <SafetyMap
            zones={zones}
            sos={sosEvents}
            showRoute={showRoute}
            satellite={satellite}
            className="absolute inset-0"
          />

          {/* Map overlays */}
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
            {satellite && <Badge className="bg-card text-foreground" variant="outline">SATELLITE</Badge>}
            {showHeatmap && <Badge className="bg-card text-foreground" variant="outline">HEATMAP</Badge>}
            {showPredictions && <Badge className="bg-card text-foreground" variant="outline">PREDICTIONS</Badge>}
          </div>

          {droneFeed && (
            <div className="pointer-events-auto absolute bottom-3 right-3 w-[320px] sm:w-[380px]">
              <Card className="panel">
                <CardHeader className="p-3 pb-2"><CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><Camera className="h-4 w-4" /> Live Monitoring Feed</span>
                  <span className="text-[10px] font-normal text-muted-foreground">DRONE-2 · 1080p</span>
                </CardTitle></CardHeader>
                <CardContent className="p-3 pt-0"><MiniDroneFeed large /></CardContent>
              </Card>
            </div>
          )}
        </section>

        {/* RIGHT — SOS, devices, timeline */}
        <aside className="hidden flex-col overflow-hidden border-l bg-card/40 lg:flex">
          <Tabs defaultValue="sos" className="flex flex-1 flex-col overflow-hidden">
            <TabsList className="m-3 grid grid-cols-3">
              <TabsTrigger value="sos"><Siren className="mr-1 h-3.5 w-3.5" /> SOS</TabsTrigger>
              <TabsTrigger value="devices"><Server className="mr-1 h-3.5 w-3.5" /> Mesh</TabsTrigger>
              <TabsTrigger value="log"><Activity className="mr-1 h-3.5 w-3.5" /> Log</TabsTrigger>
            </TabsList>

            <TabsContent value="sos" className="m-0 flex-1 overflow-hidden px-3 pb-3">
              <ScrollArea className="h-full pr-2">
                <div className="space-y-2">
                  {sosEvents.map((s) => (
                    <Card key={s.id} className="border-l-4" style={{ borderLeftColor: "hsl(var(--sos))" }}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">SOS · {s.status.toUpperCase()}</div>
                          <span className="text-[11px] text-muted-foreground">{s.time}</span>
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-muted-foreground">{s.deviceId}</div>
                        <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">{s.lat.toFixed(4)}, {s.lng.toFixed(4)}</div>
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" variant="secondary" className="h-7">Dispatch</Button>
                          <Button size="sm" variant="outline" className="h-7">Locate</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="devices" className="m-0 flex-1 overflow-hidden px-3 pb-3">
              <Card className="mb-2">
                <CardContent className="grid grid-cols-3 gap-2 p-3 text-center">
                  <div><div className="text-lg font-semibold text-safe">{meshDevices.filter(d => d.online).length}</div><div className="text-[10px] uppercase text-muted-foreground">Online</div></div>
                  <div><div className="text-lg font-semibold text-unsafe">{meshDevices.filter(d => !d.online).length}</div><div className="text-[10px] uppercase text-muted-foreground">Offline</div></div>
                  <div><div className="text-lg font-semibold">{meshDevices.reduce((a, d) => a + d.hops, 0)}</div><div className="text-[10px] uppercase text-muted-foreground">Total hops</div></div>
                </CardContent>
              </Card>
              <ScrollArea className="h-[calc(100%-90px)] pr-2">
                <div className="space-y-2">
                  {meshDevices.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-md border bg-background p-2.5">
                      <div className="flex items-center gap-2">
                        <Radio className={`h-4 w-4 ${d.online ? "text-safe" : "text-muted-foreground"}`} />
                        <div>
                          <div className="font-mono text-xs">{d.id}</div>
                          <div className="text-[10px] text-muted-foreground">{d.hops} hops · {d.signal}% signal</div>
                        </div>
                      </div>
                      <Badge variant={d.online ? "outline" : "secondary"} className={d.online ? "border-safe text-safe" : ""}>
                        {d.online ? "ONLINE" : "OFFLINE"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="log" className="m-0 flex-1 overflow-hidden px-3 pb-3">
              <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Black box · event timeline</div>
              <ScrollArea className="h-[calc(100%-22px)] pr-2">
                <div className="relative space-y-3 border-l pl-4">
                  {blackBox.map((b, i) => (
                    <div key={i} className="relative">
                      <span className="absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                      <div className="font-mono text-[10px] text-muted-foreground">{b.t}</div>
                      <div className="text-xs">{b.e}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
