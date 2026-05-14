// RunConnect Design System — tokens & primitives
// Mood: communauté, mouvement, performance, réel, connexion
// Anti-Strava, anti-gadget, anti-néon. Editorial sport energetic.

const RC = {
  // Couleurs — Orange feu signature, noir profond, crème chaud, vert "live"
  c: {
    bg: '#F6F2EC',          // crème chaud, fond app
    bgDeep: '#EDE6DC',      // sections plus profondes
    ink: '#0E0E0F',         // noir profond, texte principal
    ink2: '#3A3936',        // texte secondaire
    ink3: '#7A7771',        // muted
    line: '#E2DBD0',        // hairlines
    paper: '#FFFFFF',       // cartes
    fire: '#FF4D1A',        // orange feu signature (RunConnect)
    fireDeep: '#D9370A',
    fireGlow: '#FFB199',
    live: '#1FB386',        // vert live (séances en cours)
    sky: '#3B5BFF',         // bleu rare (records, infos froides)
    plum: '#2A1810',        // brun ardoise pour cartes hero
  },
  r: { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 },
  s: (n) => n * 4,  // spacing
  font: {
    display: '"Inter Tight", -apple-system, "SF Pro Display", system-ui, sans-serif',
    text:    '"Inter", -apple-system, "SF Pro Text", system-ui, sans-serif',
    mono:    '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  },
};
window.RC = RC;

// ─────────────────────────────────────────────────────────────
// <Phone> — iPhone shell. 390x844. Status bar + content + tab bar slot.
// ─────────────────────────────────────────────────────────────
function Phone({ children, bg = RC.c.bg, statusDark = false, hideStatus = false, time = '9:41', notch = true, label }) {
  return (
    <div data-screen-label={label} style={{
      width: 390, height: 844, borderRadius: 54, overflow: 'hidden',
      position: 'relative', background: bg,
      boxShadow: '0 30px 60px -20px rgba(20,15,10,0.25), 0 0 0 1px rgba(20,15,10,0.06), inset 0 0 0 6px #0E0E0F',
      fontFamily: RC.font.text, color: RC.c.ink,
      WebkitFontSmoothing: 'antialiased',
    }}>
      <div style={{ position: 'absolute', inset: 6, borderRadius: 48, overflow: 'hidden', background: bg }}>
        {!hideStatus && <StatusBar dark={statusDark} time={time} notch={notch} />}
        <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
        <HomeIndicator dark={statusDark} />
      </div>
    </div>
  );
}

function StatusBar({ dark = false, time = '9:41', notch = true }) {
  const c = dark ? '#fff' : RC.c.ink;
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 54, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 28px 0', pointerEvents: 'none',
    }}>
      <div style={{ fontFamily: RC.font.text, fontWeight: 600, fontSize: 16, color: c, letterSpacing: -0.2 }}>{time}</div>
      {notch && <div style={{
        position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
        width: 124, height: 36, borderRadius: 22, background: '#000',
      }} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="18" height="11" viewBox="0 0 18 11"><g fill={c}>
          <rect x="0" y="6" width="3" height="5" rx="0.7"/>
          <rect x="4.5" y="4" width="3" height="7" rx="0.7"/>
          <rect x="9" y="2" width="3" height="9" rx="0.7"/>
          <rect x="13.5" y="0" width="3" height="11" rx="0.7"/>
        </g></svg>
        <svg width="16" height="11" viewBox="0 0 16 11"><path fill={c} d="M8 2.5c2.1 0 4 .8 5.5 2.2l1-1A8.4 8.4 0 008 1a8.4 8.4 0 00-6.5 2.7l1 1A7.5 7.5 0 018 2.5zm0 3.3c1.3 0 2.4.5 3.3 1.4l1-1A5.5 5.5 0 008 4.5a5.5 5.5 0 00-4.3 1.7l1 1A4.5 4.5 0 018 5.8z"/><circle cx="8" cy="9.7" r="1.3" fill={c}/></svg>
        <svg width="26" height="12" viewBox="0 0 26 12">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke={c} strokeOpacity="0.4" fill="none"/>
          <rect x="2" y="2" width="19" height="8" rx="1.5" fill={c}/>
          <path d="M24 4v4c.7-.3 1.3-1.1 1.3-2S24.7 4.3 24 4z" fill={c} fillOpacity="0.4"/>
        </svg>
      </div>
    </div>
  );
}

function HomeIndicator({ dark = false }) {
  return (
    <div style={{
      position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
      width: 134, height: 5, borderRadius: 3,
      background: dark ? 'rgba(255,255,255,0.85)' : 'rgba(14,14,15,0.85)',
      zIndex: 80,
    }} />
  );
}

// ─────────────────────────────────────────────────────────────
// Tab bar — 5 tabs. Floating pill style, glass.
// ─────────────────────────────────────────────────────────────
function TabBar({ active = 'home', dark = false }) {
  const tabs = [
    { id: 'home', label: 'Carte', icon: IconMap },
    { id: 'sessions', label: 'Séances', icon: IconCalendar },
    { id: 'coach', label: 'Coaching', icon: IconCoach },
    { id: 'msg', label: 'Messages', icon: IconChat },
    { id: 'profile', label: 'Profil', icon: IconUser },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 28, left: 12, right: 12, height: 64,
      borderRadius: 28, padding: '8px 6px',
      background: dark ? 'rgba(20,18,16,0.92)' : 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      boxShadow: dark ? '0 12px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)' : '0 12px 30px rgba(20,15,10,0.12), 0 0 0 1px rgba(20,15,10,0.05)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      zIndex: 70,
    }}>
      {tabs.map(t => {
        const isActive = t.id === active;
        const Icon = t.icon;
        return (
          <div key={t.id} style={{
            flex: 1, height: 48, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 2,
            color: isActive ? RC.c.fire : (dark ? 'rgba(255,255,255,0.55)' : RC.c.ink3),
            position: 'relative',
          }}>
            <Icon size={22} active={isActive} />
            <div style={{
              fontSize: 10, fontWeight: isActive ? 700 : 500, letterSpacing: 0.1,
              fontFamily: RC.font.text,
            }}>{t.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Icon set — minimal stroke icons, 1.75 stroke
// ─────────────────────────────────────────────────────────────
const Stroke = ({ children, size = 22, color = 'currentColor', sw = 1.75, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

function IconMap({ size, active }) {
  return active
    ? <svg width={size} height={size} viewBox="0 0 24 24"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7z" fill="currentColor"/><circle cx="12" cy="9" r="2.4" fill="#fff"/></svg>
    : <Stroke size={size}><path d="M12 21s7-7.5 7-12a7 7 0 10-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></Stroke>;
}
function IconCalendar({ size, active }) {
  return <Stroke size={size}><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 3v4M16 3v4"/>{active && <circle cx="12" cy="14" r="2" fill="currentColor"/>}</Stroke>;
}
function IconCoach({ size, active }) {
  return active
    ? <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M3 18l3-9 3 6 3-12 3 9 3-3 3 9z"/></svg>
    : <Stroke size={size}><path d="M3 18l3-9 3 6 3-12 3 9 3-3 3 9"/></Stroke>;
}
function IconChat({ size, active }) {
  return <Stroke size={size} fill={active ? 'currentColor' : 'none'} color="currentColor"><path d="M21 12a8 8 0 01-11.5 7.2L4 21l1.8-5.5A8 8 0 1121 12z" stroke={active ? RC.c.fire : 'currentColor'}/></Stroke>;
}
function IconUser({ size, active }) {
  return active
    ? <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
    : <Stroke size={size}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></Stroke>;
}

// shared small icons
function IconBell({ size = 20 }) { return <Stroke size={size}><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 19a2 2 0 004 0"/></Stroke>; }
function IconSettings({ size = 20 }) { return <Stroke size={size}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></Stroke>; }
function IconSearch({ size = 18 }) { return <Stroke size={size}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Stroke>; }
function IconClose({ size = 18 }) { return <Stroke size={size}><path d="M6 6l12 12M18 6L6 18"/></Stroke>; }
function IconChevR({ size = 16 }) { return <Stroke size={size} sw={2}><path d="M9 6l6 6-6 6"/></Stroke>; }
function IconChevL({ size = 16 }) { return <Stroke size={size} sw={2}><path d="M15 6l-6 6 6 6"/></Stroke>; }
function IconChevD({ size = 16 }) { return <Stroke size={size} sw={2}><path d="M6 9l6 6 6-6"/></Stroke>; }
function IconPlus({ size = 18 }) { return <Stroke size={size} sw={2.2}><path d="M12 5v14M5 12h14"/></Stroke>; }
function IconArrowR({ size = 18 }) { return <Stroke size={size} sw={2}><path d="M5 12h14M13 5l7 7-7 7"/></Stroke>; }
function IconLocate({ size = 18 }) { return <Stroke size={size}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></Stroke>; }
function IconLayers({ size = 18 }) { return <Stroke size={size}><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5M3 18l9 5 9-5"/></Stroke>; }
function IconHeart({ size = 16, fill }) { return <Stroke size={size} fill={fill || 'none'}><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/></Stroke>; }
function IconShare({ size = 16 }) { return <Stroke size={size}><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><path d="M16 6l-4-4-4 4M12 2v13"/></Stroke>; }
function IconMore({ size = 18 }) { return <Stroke size={size} sw={2.5}><circle cx="5" cy="12" r="0.5"/><circle cx="12" cy="12" r="0.5"/><circle cx="19" cy="12" r="0.5"/></Stroke>; }
function IconMic({ size = 18 }) { return <Stroke size={size}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></Stroke>; }
function IconCamera({ size = 18 }) { return <Stroke size={size}><path d="M3 8h3l2-3h8l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="4"/></Stroke>; }
function IconCheck({ size = 16 }) { return <Stroke size={size} sw={2.4}><path d="M4 12l5 5L20 6"/></Stroke>; }
function IconBolt({ size = 16 }) { return <Stroke size={size} fill="currentColor"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></Stroke>; }
function IconRoute({ size = 18 }) { return <Stroke size={size}><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 17V9a4 4 0 014-4h4a4 4 0 014 4v0"/></Stroke>; }

// expose
Object.assign(window, {
  Phone, StatusBar, HomeIndicator, TabBar,
  IconMap, IconCalendar, IconCoach, IconChat, IconUser,
  IconBell, IconSettings, IconSearch, IconClose, IconChevR, IconChevL, IconChevD,
  IconPlus, IconArrowR, IconLocate, IconLayers, IconHeart, IconShare, IconMore, IconMic, IconCamera, IconCheck, IconBolt, IconRoute,
  Stroke,
});
