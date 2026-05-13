import { useNavigate } from "react-router-dom";
import { MapPin, Maximize2, Navigation } from "lucide-react";
import { ACTION_BLUE } from "@/components/discover/DiscoverChromeShell";

export function DiscoverLiveMaquetteSection() {
  const navigate = useNavigate();

  return (
    <>
      <button
        type="button"
        onClick={() => navigate("/my-sessions")}
        className="mt-4 w-full touch-manipulation rounded-2xl bg-white py-3.5 text-[16px] font-bold text-[#0A0F1F] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        Voir mes séances live
      </button>

      <div className="mt-3 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <p className="text-[16px] leading-snug text-[#0A0F1F]">
          Vous ne participez à aucune séance live actuellement.
        </p>
      </div>

      <div
        className="relative mt-4 overflow-hidden rounded-2xl"
        style={{
          aspectRatio: "1 / 1.1",
          background: "linear-gradient(135deg, #e8f5e9, #c8e6c9 50%, #a5d6a7)",
        }}
      >
        <button
          type="button"
          aria-label="Navigation"
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
        >
          <Navigation className="h-5 w-5 rotate-45 text-[#0A0F1F]" strokeWidth={2.2} />
        </button>
        <button
          type="button"
          aria-label="Plein écran"
          className="absolute right-3 top-16 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
        >
          <Maximize2 className="h-4 w-4 text-[#0A0F1F]" strokeWidth={2.4} />
        </button>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div
              className="h-14 w-20 overflow-hidden rounded-xl border-[3px] border-white shadow-lg"
              style={{ background: "linear-gradient(135deg, #6b7280, #4b5563)" }}
            />
            <div
              className="absolute -bottom-3 left-1/2 h-0 w-0 -translate-x-1/2"
              style={{
                borderLeft: "10px solid transparent",
                borderRight: "10px solid transparent",
                borderTop: `14px solid ${ACTION_BLUE}`,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
