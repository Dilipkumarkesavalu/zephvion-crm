import { useEffect, useState } from "react";

const BLUE = "#0d82e4";
const ORANGE = "#f26b1d";
const TEAL = "#2dd4bf";

const HIGHLIGHTS = ["Deal pipeline", "GST quotes & invoices", "Team tasks"];

const formatIstTime = (date: Date) =>
  date.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false });

/**
 * Left half of the sign-in page: the Zephvion "command centre" radar,
 * echoing the zephvion.com hero.
 */
interface LoginBrandPanelProps {
  logo: string;
  title: string;
}

export const LoginBrandPanel = ({ logo, title }: LoginBrandPanelProps) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative hidden h-full flex-col overflow-hidden bg-black p-10 text-white lg:flex">
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${BLUE}33 0%, transparent 55%)`,
        }}
      />

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <img className="h-6" src={logo} alt={title} />
          <span className="border-l border-white/30 pl-3 font-mono text-lg font-semibold tracking-[0.3em] text-white/90">
            CRM
          </span>
        </div>
        <div className="text-right font-mono text-xs leading-5 text-teal-300">
          <div>IST</div>
          <div>{formatIstTime(now)}</div>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center">
        <Radar />
      </div>

      <div className="relative z-10 space-y-4">
        <p className="max-w-md text-2xl font-semibold leading-snug">
          Every client, deal and invoice in one{" "}
          <span style={{ color: BLUE }}>command centre</span>.
        </p>
        <div className="flex flex-wrap gap-2">
          {HIGHLIGHTS.map((highlight) => (
            <span
              key={highlight}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-xs uppercase tracking-wider text-white/70"
            >
              {highlight}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const Radar = () => (
  <svg
    viewBox="0 0 400 400"
    className="w-full max-w-[420px]"
    role="img"
    aria-label="Zephvion radar"
  >
    {/* Crosshair */}
    <g stroke={BLUE} strokeOpacity="0.25" strokeWidth="1">
      <line x1="20" y1="200" x2="380" y2="200" />
      <line x1="200" y1="20" x2="200" y2="380" />
    </g>

    {/* Corner brackets */}
    <g stroke={BLUE} strokeWidth="2" fill="none" strokeOpacity="0.8">
      <path d="M40 70 V40 H70" />
      <path d="M330 40 H360 V70" />
    </g>
    <g stroke={ORANGE} strokeWidth="2" fill="none" strokeOpacity="0.8">
      <path d="M40 330 V360 H70" />
      <path d="M330 360 H360 V330" />
    </g>

    {/* Outer dashed ring, slowly turning */}
    <g
      className="motion-safe:animate-spin"
      style={{ transformOrigin: "200px 200px", animationDuration: "60s" }}
    >
      <circle
        cx="200"
        cy="200"
        r="160"
        fill="none"
        stroke={BLUE}
        strokeOpacity="0.5"
        strokeDasharray="2 8"
      />
      <path
        d="M200 40 A160 160 0 0 1 345 268"
        fill="none"
        stroke={ORANGE}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="313" cy="87" r="4" fill={ORANGE} />
    </g>

    {/* Teal orbit, turning the other way */}
    <g
      className="motion-safe:animate-spin"
      style={{
        transformOrigin: "200px 200px",
        animationDuration: "24s",
        animationDirection: "reverse",
      }}
    >
      <circle
        cx="200"
        cy="200"
        r="118"
        fill="none"
        stroke={TEAL}
        strokeOpacity="0.7"
        strokeDasharray="60 14"
      />
      <circle cx="318" cy="200" r="4" fill={TEAL} />
      <circle cx="117" cy="117" r="3" fill={TEAL} />
      <circle cx="200" cy="82" r="3" fill={ORANGE} />
    </g>

    {/* Inner ring */}
    <circle
      cx="200"
      cy="200"
      r="78"
      fill="none"
      stroke={BLUE}
      strokeOpacity="0.6"
      strokeDasharray="4 6"
    />

    {/* Radar sweep */}
    <g
      className="motion-safe:animate-spin"
      style={{ transformOrigin: "200px 200px", animationDuration: "6s" }}
    >
      <path
        d="M200 200 L200 82 A118 118 0 0 1 283 117 Z"
        fill={TEAL}
        fillOpacity="0.08"
      />
    </g>

    {/* Zephvion triangle mark */}
    <polygon
      points="200,150 245,232 155,232"
      fill={BLUE}
      fillOpacity="0.15"
      stroke={BLUE}
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <circle
      cx="200"
      cy="205"
      r="5"
      fill={TEAL}
      className="motion-safe:animate-pulse"
    />

    {/* HUD labels */}
    <g fontFamily="ui-monospace, monospace" fontSize="10">
      <text x="44" y="196" fill={TEAL}>
        NODE_01: ACTIVE
      </text>
      <text x="44" y="352" fill={BLUE} fillOpacity="0.8">
        CRM v1.0
      </text>
      <text x="356" y="352" fill={ORANGE} textAnchor="end">
        SECURE: OTP
      </text>
    </g>
  </svg>
);
