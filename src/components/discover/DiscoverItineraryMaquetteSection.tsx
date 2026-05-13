import { useEffect, useId, useState } from "react";
import { ChevronRight, FileText, Flag, MapPin, Navigation, Palette, Plus, Redo2, Trash2, Undo2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ACTION_BLUE } from "@/components/discover/DiscoverChromeShell";

function MapBtn({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
    >
      {children}
    </button>
  );
}

export function DiscoverItineraryMaquetteSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"guide" | "manuel">("guide");
  const gradientId = useId().replace(/:/g, "");
  const [routeCount, setRouteCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      const { count, error } = await supabase
        .from("routes")
        .select("id", { count: "exact", head: true })
        .eq("created_by", user.id);
      if (!error) setRouteCount(count ?? 0);
    })();
  }, [user?.id]);

  const savedLabel =
    routeCount === null ? "—" : `${routeCount} enregistré${routeCount !== 1 ? "s" : ""}`;

  return (
    <>
      <div className="mt-4 flex rounded-xl bg-white p-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {([
          { id: "guide" as const, label: "Guidé" },
          { id: "manuel" as const, label: "Manuel" },
        ]).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className="flex-1 touch-manipulation rounded-lg py-2.5 text-[16px] font-bold transition-all"
            style={{
              background: mode === m.id ? "white" : "transparent",
              color: mode === m.id ? "#0A0F1F" : "#8E8E93",
              boxShadow: mode === m.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-center text-[15px] text-[#8E8E93]">
        {mode === "guide" ? "Suit les chemins et sentiers" : "Tracé libre"}
      </p>

      <div
        className="relative mt-3 overflow-hidden rounded-2xl"
        style={{
          aspectRatio: "1 / 1.1",
          background: "linear-gradient(135deg, #e8f5e9, #c8e6c9 50%, #a5d6a7)",
        }}
      >
        <div className="absolute left-3 top-3 flex gap-2">
          <div className="rounded-lg bg-white px-3 py-1.5 shadow-md">
            <p className="text-[10px] font-bold tracking-wider text-[#8E8E93]">DISTANCE</p>
            <p className="mt-0.5 text-[18px] font-extrabold leading-none text-[#0A0F1F]">0.5 km</p>
          </div>
          <div className="rounded-lg bg-white px-3 py-1.5 shadow-md">
            <p className="text-[10px] font-bold tracking-wider text-[#8E8E93]">DÉNIVELÉ</p>
            <p className="mt-0.5 text-[18px] font-extrabold leading-none text-[#0A0F1F]">3 m</p>
          </div>
        </div>

        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <MapBtn>
            <Navigation className="h-4 w-4 rotate-45" style={{ color: ACTION_BLUE }} strokeWidth={2.4} />
          </MapBtn>
          <MapBtn>
            <Plus className="h-5 w-5 text-[#0A0F1F]" strokeWidth={2.4} />
          </MapBtn>
          <MapBtn>
            <Undo2 className="h-5 w-5 text-[#0A0F1F]" strokeWidth={2.4} />
          </MapBtn>
          <MapBtn>
            <Redo2 className="h-5 w-5 text-[#0A0F1F]" strokeWidth={2.4} />
          </MapBtn>
          <MapBtn>
            <Trash2 className="h-5 w-5 text-[#0A0F1F]" strokeWidth={2.2} />
          </MapBtn>
          <MapBtn>
            <FileText className="h-5 w-5 text-[#0A0F1F]" strokeWidth={2.2} />
          </MapBtn>
          <MapBtn>
            <Palette className="h-5 w-5 text-[#0A0F1F]" strokeWidth={2.2} />
          </MapBtn>
        </div>

        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 110">
          <path
            d="M 55 60 L 60 50 L 65 40 L 70 30 L 73 20"
            fill="none"
            stroke={ACTION_BLUE}
            strokeLinecap="round"
            strokeWidth="1.2"
          />
        </svg>

        <div
          className="absolute h-4 w-4 rounded-full border-[2px] border-white shadow-md"
          style={{ background: "#34C759", top: "55%", left: "53%" }}
        />
        <div
          className="absolute h-3 w-3 rounded-full border-[2px] border-white shadow-md"
          style={{ background: ACTION_BLUE, top: "40%", left: "45%" }}
        />
        <div className="absolute" style={{ top: "12%", right: "26%" }}>
          <Flag className="h-6 w-6 text-[#0A0F1F]" fill="#0A0F1F" strokeWidth={2} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate("/itinerary/my-routes")}
        className="mt-4 flex w-full touch-manipulation items-center gap-3 rounded-2xl bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#F2F2F7]">
          <MapPin className="h-5 w-5 fill-[#FF3B30] text-[#FF3B30]" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[16px] font-bold text-[#0A0F1F]">Mes itinéraires</p>
          <p className="text-[13px] text-[#8E8E93]">{savedLabel}</p>
        </div>
        <ChevronRight className="h-5 w-5 flex-shrink-0 text-[#C7C7CC]" />
      </button>

      <div className="mt-3 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-bold text-[#0A0F1F]">Profil d&apos;élévation</p>
          <div className="flex gap-3">
            <span className="text-[13px] text-[#0A0F1F]">
              <span className="text-[#8E8E93]">↗</span> <span className="font-bold">3 m</span>
            </span>
            <span className="text-[13px] text-[#0A0F1F]">
              <span className="text-[#8E8E93]">↘</span> <span className="font-bold">22 m</span>
            </span>
          </div>
        </div>
        <svg className="mt-3 h-24 w-full" viewBox="0 0 100 40" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACTION_BLUE} stopOpacity="0.3" />
              <stop offset="100%" stopColor={ACTION_BLUE} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M 0 10 Q 20 15 35 20 T 70 30 L 100 35 L 100 40 L 0 40 Z"
            fill={`url(#${gradientId})`}
          />
          <path
            d="M 0 10 Q 20 15 35 20 T 70 30 L 100 35"
            fill="none"
            stroke={ACTION_BLUE}
            strokeWidth="1.2"
          />
        </svg>
        <div className="mt-1 flex justify-between text-[11px] text-[#8E8E93]">
          <span>0.0 m</span>
          <span>128 m</span>
          <span>257 m</span>
          <span>385 m</span>
          <span>514 m</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate("/route-create")}
        className="mt-4 w-full touch-manipulation rounded-xl py-3.5 text-[16px] font-semibold text-white"
        style={{ background: ACTION_BLUE }}
      >
        Sauvegarder l&apos;itinéraire
      </button>
    </>
  );
}
