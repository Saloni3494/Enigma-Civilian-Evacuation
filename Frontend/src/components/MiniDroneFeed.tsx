import { Camera, Flame } from "lucide-react";

export function MiniDroneFeed({ large = false }: { large?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border bg-black ${large ? "aspect-video" : "aspect-[4/3]"}`}>
      {/* Simulated drone view */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,#1f2937,#000)]" />
        <div className="absolute inset-0 opacity-30 mix-blend-screen" style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px)",
        }} />
        {/* Hot spot */}
        <div className="absolute left-[42%] top-[48%] h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sos/40 blur-xl" />
        <div className="absolute left-[42%] top-[48%] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sos animate-blink" />

        {/* Crosshair */}
        <div className="absolute inset-0 flex items-center justify-center text-white/40">
          <div className="h-12 w-px bg-white/30" />
          <div className="absolute h-px w-12 bg-white/30" />
        </div>
      </div>

      {/* HUD */}
      <div className="absolute inset-0 flex flex-col justify-between p-2 text-[10px] font-medium text-white/90">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 rounded bg-black/40 px-1.5 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-sos animate-blink" /> LIVE · DRONE-2
          </div>
          <div className="rounded bg-black/40 px-1.5 py-0.5 tabular-nums">28.6121, 77.2210</div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 rounded bg-sos/80 px-1.5 py-0.5">
            <Flame className="h-3 w-3" /> Fire detected · 0.87
          </div>
          <div className="flex items-center gap-1 rounded bg-black/40 px-1.5 py-0.5">
            <Camera className="h-3 w-3" /> 4K · 30fps
          </div>
        </div>
      </div>
    </div>
  );
}
