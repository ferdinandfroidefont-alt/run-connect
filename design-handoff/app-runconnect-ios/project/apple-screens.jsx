// APPLE-STYLE screens for RunConnect — full feature parity, Settings + App Store aesthetic

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
function ScreenAuthSplash() {
  return (
    <Phone label="01 Auth · Bienvenue" bg="#fff">
      <div style={{ position: 'absolute', top: 90, left: 0, right: 0, padding: '0 32px', textAlign: 'center' }}>
        <div style={{ width: 96, height: 96, margin: '0 auto', borderRadius: 22, background: A.c.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' }}>
          <svg width="46" height="46" viewBox="0 0 46 46" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="30" cy="9" r="4" fill="#fff" stroke="none"/>
            <path d="M14 38 L20 24 L30 28 L26 38"/>
            <path d="M20 24 L32 22 L38 30"/>
            <path d="M14 30 L8 30"/>
          </svg>
        </div>
        <div style={{ fontFamily: A.font.display, fontSize: 34, fontWeight: 700, letterSpacing: -0.6, marginTop: 28, lineHeight: 1.1 }}>Bienvenue dans<br/>RunConnect</div>
        <div style={{ fontSize: 17, color: A.c.ink60, marginTop: 10, lineHeight: 1.4 }}>Trouve, programme et partage tes<br/>séances de sport avec tes amis.</div>
      </div>
      <div style={{ position: 'absolute', top: 380, left: 32, right: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Feature icon="📍" title="La carte" body="Vois où tes amis courent en temps réel."/>
        <Feature icon="📅" title="Planification" body="Programme une séance en quelques touches."/>
        <Feature icon="👥" title="Communauté" body="Rejoins des clubs, ouvre des groupes."/>
        <Feature icon="💬" title="Coaching" body="Échange avec ton coach, suis ton plan."/>
      </div>
      <div style={{ position: 'absolute', bottom: 110, left: 24, right: 24 }}>
        <PillBtn full large>Continuer</PillBtn>
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 15, color: A.c.blue }}>J'ai déjà un compte</div>
      </div>
    </Phone>
  );
}
function Feature({ icon, title, body }) {
  return (
    <div style={{ display: 'flex', gap: 14 }}>
      <div style={{ width: 36, fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontFamily: A.font.text, fontSize: 17, fontWeight: 600, letterSpacing: -0.4 }}>{title}</div>
        <div style={{ fontSize: 15, color: A.c.ink60, marginTop: 2, lineHeight: 1.35 }}>{body}</div>
      </div>
    </div>
  );
}

function ScreenSignIn() {
  return (
    <Phone label="02 Auth · Connexion" bg={A.c.groupedBg}>
      <NavBar title="Connexion" large={false} leading={<div style={{ color: A.c.blue, fontSize: 17, display: 'flex', alignItems: 'center', gap: 4 }}>{SF.back}<span>Retour</span></div>}/>
      <div style={{ padding: '24px 16px 0', textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, margin: '0 auto', borderRadius: 14, background: A.c.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="30" height="30" viewBox="0 0 46 46" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="30" cy="9" r="4" fill="#fff" stroke="none"/><path d="M14 38 L20 24 L30 28 L26 38"/><path d="M20 24 L32 22 L38 30"/></svg>
        </div>
        <div style={{ fontFamily: A.font.display, fontSize: 28, fontWeight: 600, letterSpacing: -0.5, marginTop: 16 }}>Bon retour</div>
        <div style={{ fontSize: 15, color: A.c.ink60, marginTop: 4 }}>Connecte-toi à ton compte RunConnect.</div>
      </div>
      <div style={{ marginTop: 24 }}>
        <Group>
          <FieldRow label="Email" value="ferdinand@icloud.com"/>
          <FieldRow label="Mot de passe" value="••••••••••" last/>
        </Group>
        <div style={{ padding: '0 32px' }}>
          <PillBtn full large>Se connecter</PillBtn>
          <div style={{ textAlign: 'center', fontSize: 15, color: A.c.blue, marginTop: 16 }}>Mot de passe oublié ?</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '32px 32px 16px' }}>
          <div style={{ flex: 1, height: 0.5, background: A.c.hair }}/>
          <div style={{ fontSize: 13, color: A.c.ink60 }}>ou</div>
          <div style={{ flex: 1, height: 0.5, background: A.c.hair }}/>
        </div>
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SocialBtn icon={<svg width="16" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M17.05 20.28c-.98.95-2.05.94-3.08.45-1.09-.5-2.08-.5-3.24 0-1.45.62-2.21.44-3.07-.45C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.78.98-.05 1.92-.66 3.18-.74 1.51.12 2.65.72 3.4 1.81-3.04 1.83-2.55 5.83.36 7.07-.61 1.6-1.41 3.2-2.02 4.05M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>} bg="#000" label="Continuer avec Apple"/>
          <SocialBtn icon={<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285f4" d="M22.6 12.2c0-.7 0-1.4-.2-2H12v3.8h6c-.3 1.4-1 2.6-2.3 3.4v2.8h3.7c2.1-2 3.3-4.9 3.3-8z"/><path fill="#34a853" d="M12 23c3 0 5.6-1 7.4-2.8l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H1.9v2.9C3.7 20.5 7.5 23 12 23z"/><path fill="#fbbc04" d="M5.7 13.9c-.2-.7-.3-1.4-.3-2.2s.1-1.5.3-2.2V6.6H1.9C1.1 8.2.7 10 .7 12s.4 3.8 1.2 5.4l3.8-3z"/><path fill="#ea4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.5 2 15 1 12 1 7.5 1 3.7 3.5 1.9 7.1l3.8 2.9c.9-2.6 3.4-4.6 6.3-4.6z"/></svg>} bg="#fff" fg={A.c.ink} label="Continuer avec Google"/>
        </div>
      </div>
    </Phone>
  );
}
function FieldRow({ label, value, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', minHeight: 44, borderBottom: last ? 'none' : `0.5px solid ${A.c.sep}` }}>
      <div style={{ width: 110, fontSize: 17, color: A.c.ink, fontFamily: A.font.text, letterSpacing: -0.4 }}>{label}</div>
      <div style={{ flex: 1, fontSize: 17, color: A.c.ink60, fontFamily: A.font.text, letterSpacing: -0.4 }}>{value}</div>
    </div>
  );
}
function SocialBtn({ icon, label, bg, fg = '#fff' }) {
  return (
    <button style={{ height: 50, borderRadius: 12, background: bg, color: fg, border: bg === '#fff' ? `0.5px solid ${A.c.hair}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: A.font.text, fontSize: 17, fontWeight: 500, letterSpacing: -0.4, cursor: 'pointer' }}>
      {icon}{label}
    </button>
  );
}

function ScreenCreate() {
  return (
    <Phone label="03 Auth · Créer un compte" bg={A.c.groupedBg}>
      <NavBar title="Inscription" large={false} leading={<div style={{ color: A.c.blue, fontSize: 17 }}>Annuler</div>} trailing={<div style={{ color: A.c.ink60, fontSize: 17 }}>2 / 3</div>}/>
      <div style={{ padding: '0 16px', textAlign: 'center', marginTop: 8 }}>
        <div style={{ width: 88, height: 88, borderRadius: 44, background: A.c.cell, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: 'inset 0 0 0 0.5px ' + A.c.hair }}>
          <span style={{ fontSize: 34, color: A.c.ink60 }}>FF</span>
          <div style={{ position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, background: A.c.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid '+A.c.groupedBg }}>{SF.plus}</div>
        </div>
        <div style={{ fontSize: 15, color: A.c.blue, marginTop: 10 }}>Modifier la photo</div>
      </div>
      <div style={{ marginTop: 24 }}>
        <Group>
          <FieldRow label="Prénom" value="Ferdinand"/>
          <FieldRow label="Nom" value="Froidefont"/>
          <FieldRow label="Ville" value="Annecy, France" last/>
        </Group>
        <Group title="Parrainage" footer="Le code de Lucas t'offre 3 jours de Premium.">
          <FieldRow label="Code" value="LUCAS-3J" last/>
        </Group>
        <Group>
          <Cell title="Conditions d'utilisation" subtitle="J'accepte les CGU et la politique de confidentialité." accessory="check" last/>
        </Group>
      </div>
      <div style={{ position: 'absolute', bottom: 50, left: 24, right: 24 }}>
        <PillBtn full large>Continuer</PillBtn>
      </div>
    </Phone>
  );
}

// ─────────────────────────────────────────────
// DÉCOUVRIR (carte) — App-Store-style hero + cards
// ─────────────────────────────────────────────
// Big interactive map — fills viewport
function FullMap() {
  return (
    <svg viewBox="0 0 390 844" style={{ width: '100%', height: '100%', display: 'block' }} preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="mapgrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.025)" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="390" height="844" fill="#eaeef0"/>
      <rect width="390" height="844" fill="url(#mapgrid)"/>
      {/* Parks / green areas */}
      <path d="M-20 600 Q60 580 140 620 Q220 660 200 760 L-20 800 Z" fill="#dde7d2"/>
      <path d="M280 -10 Q360 60 380 160 L420 200 L420 -20 Z" fill="#dde7d2"/>
      {/* Lake — Annecy */}
      <path d="M70 280 Q140 240 230 270 Q310 295 320 380 Q325 470 270 540 Q190 590 110 560 Q40 525 50 440 Q55 350 70 280 Z" fill="#bdd7e6"/>
      <path d="M70 280 Q140 240 230 270 Q310 295 320 380 Q325 470 270 540 Q190 590 110 560 Q40 525 50 440 Q55 350 70 280 Z" fill="none" stroke="#9bbfd2" strokeWidth="0.5"/>
      {/* Major roads */}
      <path d="M-20 200 Q120 180 250 230 Q340 270 410 240" stroke="#fff" strokeWidth="6" fill="none"/>
      <path d="M-20 200 Q120 180 250 230 Q340 270 410 240" stroke="#f5d97a" strokeWidth="3" fill="none"/>
      <path d="M30 -20 Q90 120 140 220 Q200 320 230 460 Q255 600 220 800" stroke="#fff" strokeWidth="5" fill="none"/>
      <path d="M-20 700 Q140 680 280 720 Q360 740 410 720" stroke="#fff" strokeWidth="4" fill="none"/>
      {/* Minor roads */}
      <path d="M0 100 Q100 130 200 110 Q300 90 400 130" stroke="#fff" strokeWidth="2" fill="none" opacity="0.85"/>
      <path d="M0 380 Q60 400 90 460 Q120 520 80 600" stroke="#fff" strokeWidth="2" fill="none" opacity="0.85"/>
      <path d="M340 100 Q360 200 350 320 Q335 460 360 600" stroke="#fff" strokeWidth="2" fill="none" opacity="0.85"/>
      {/* Buildings hint */}
      <g opacity="0.18" fill="#9aa3a8">
        <rect x="20" y="80" width="22" height="18" rx="2"/>
        <rect x="50" y="70" width="14" height="22" rx="2"/>
        <rect x="350" y="380" width="20" height="18" rx="2"/>
        <rect x="320" y="650" width="18" height="22" rx="2"/>
        <rect x="20" y="640" width="24" height="20" rx="2"/>
      </g>
    </svg>
  );
}

// The signature pin: big avatar with sport-color ring + tail
function AvatarPin({ x, y, init, color, photo, live, count }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -100%)', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.22))' }}>
      <svg width="72" height="84" viewBox="0 0 72 84" style={{ position: 'absolute', left: 0, top: 0 }}>
        <path d="M36 80 L26 64 Q4 58 4 34 A32 32 0 1 1 68 34 Q68 58 46 64 Z" fill="#fff"/>
      </svg>
      <div style={{ position: 'relative', width: 72, height: 84, padding: 6 }}>
        <div style={{ width: 60, height: 60, borderRadius: 30, padding: 3, background: color, position: 'relative' }}>
          <div style={{ width: 54, height: 54, borderRadius: 27, background: photo || color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 19, fontFamily: A.font.text, letterSpacing: -0.3, border: '2px solid #fff', overflow: 'hidden' }}>{init}</div>
          {live && (
            <div style={{ position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: 9, background: A.c.sysGreen, border: '2.5px solid #fff', boxShadow: '0 0 0 2px rgba(52,199,89,0.25)' }}/>
          )}
          {count && (
            <div style={{ position: 'absolute', bottom: -4, right: -4, minWidth: 22, height: 22, padding: '0 6px', borderRadius: 11, background: A.c.ink, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>+{count}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sport tag chip on map (small)
function SportChip({ x, y, label, sport, time }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)' }}>
      <div style={{ height: 28, padding: '0 10px', borderRadius: 14, background: A.c.cell, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, letterSpacing: -0.2, color: A.c.ink, boxShadow: '0 4px 10px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.06)', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 12 }}>{sport}</span>{label} · <span style={{ color: A.c.ink60 }}>{time}</span>
      </div>
    </div>
  );
}

function ScreenDiscover() {
  return (
    <Phone label="04 Découvrir · Carte" bg="#eaeef0" statusDark={false}>
      {/* Fullscreen map */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <FullMap/>
      </div>

      {/* Top floating bar — search + avatar */}
      <div style={{ position: 'absolute', top: 50, left: 12, right: 12, display: 'flex', gap: 8, alignItems: 'center', zIndex: 10 }}>
        <div style={{ flex: 1, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
          <span style={{ color: A.c.ink60 }}>{SF.search}</span>
          <span style={{ fontSize: 15, color: A.c.ink60, fontFamily: A.font.text }}>Rechercher un lieu, un ami…</span>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', border: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0,0,0,0.06)', fontSize: 14, fontWeight: 600 }}>FF</div>
      </div>

      {/* Filter chips row — categories that open sheets */}
      <div style={{ position: 'absolute', top: 104, left: 0, right: 0, display: 'flex', gap: 6, padding: '0 12px', overflowX: 'hidden', zIndex: 9 }}>
        {[
          { l: 'Tous', sel: true },
          { l: 'Sports', icon: '⚙' },
          { l: 'Horaire', icon: '🕒' },
          { l: 'Amis', icon: '👥' },
          { l: 'Clubs', icon: '🏛' },
          { l: 'Niveau', icon: '⚡' },
        ].map((c, i) => (
          <div key={i} style={{
            height: 32, padding: '0 12px', borderRadius: 16,
            background: c.sel ? A.c.ink : 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)',
            border: c.sel ? 'none' : '0.5px solid rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 13, fontWeight: 600, letterSpacing: -0.2,
            color: c.sel ? '#fff' : A.c.ink, whiteSpace: 'nowrap',
            boxShadow: '0 4px 10px rgba(0,0,0,0.06)', flexShrink: 0,
          }}>{c.l}</div>
        ))}
      </div>

      {/* Avatar pins — THE signature */}
      <AvatarPin x={130} y={300} init="LR" color={A.c.blue}/>
      <AvatarPin x={245} y={355} init="SM" color="#ff375f" live/>
      <AvatarPin x={88} y={460} init="TB" color="#5ac8fa"/>
      <AvatarPin x={295} y={485} init="EK" color="#34c759" count={3}/>
      <AvatarPin x={195} y={555} init="ML" color="#ff9500"/>

      {/* Small sport chips */}
      <SportChip x={155} y={222} sport="🏃" label="14 km" time="18:30"/>
      <SportChip x={160} y={395} sport="🚴" label="Live" time="42 km"/>
      <SportChip x={320} y={420} sport="🏊" label="2 km" time="20:00"/>

      {/* My location dot */}
      <div style={{ position: 'absolute', left: 195, top: 615, transform: 'translate(-50%, -50%)' }}>
        <div style={{ width: 22, height: 22, borderRadius: 11, background: A.c.blue, border: '3px solid #fff', boxShadow: '0 0 0 4px rgba(0,102,204,0.18), 0 4px 10px rgba(0,0,0,0.2)' }}/>
      </div>

      {/* Right vertical control rail */}
      <div style={{ position: 'absolute', right: 12, top: 250, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9 }}>
        {[
          { i: SF.loc, c: A.c.blue },
          { t: '⊕' },
          { t: '⊖' },
          { t: '⌗' },
        ].map((b, i) => (
          <button key={i} style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', border: '0.5px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 10px rgba(0,0,0,0.08)', color: b.c || A.c.ink, fontSize: 17, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{b.i || b.t}</button>
        ))}
      </div>

      {/* Floating "Programmer" FAB */}
      <button style={{ position: 'absolute', right: 14, bottom: 280, height: 50, padding: '0 18px 0 14px', borderRadius: 25, background: A.c.blue, color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 8, fontFamily: A.font.text, fontSize: 15, fontWeight: 600, letterSpacing: -0.3, boxShadow: '0 8px 20px rgba(0,102,204,0.35), 0 2px 6px rgba(0,0,0,0.12)', zIndex: 11 }}>
        <span style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{SF.plus}</span>
        Programmer
      </button>

      {/* Bottom sheet — A la une, list, collapsible */}
      <div style={{ position: 'absolute', bottom: 83, left: 0, right: 0, height: 360, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', borderTopLeftRadius: 18, borderTopRightRadius: 18, borderTop: '0.5px solid rgba(0,0,0,0.06)', boxShadow: '0 -8px 30px rgba(0,0,0,0.10)', zIndex: 8, overflow: 'hidden' }}>
        <div style={{ padding: '8px 0 4px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 5, borderRadius: 3, background: 'rgba(60,60,67,0.25)' }}/>
        </div>
        <div style={{ padding: '4px 16px 8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: A.font.display, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>À la une</div>
            <div style={{ fontSize: 12, color: A.c.ink60, marginTop: 1 }}>5 séances · Annecy · aujourd'hui</div>
          </div>
          <div style={{ fontSize: 15, color: A.c.blue, fontWeight: 500 }}>Voir tout</div>
        </div>
        <div style={{ margin: '0 12px', borderRadius: 12, background: A.c.cell, overflow: 'hidden', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.04)' }}>
          <SessionRow title="Sortie longue · Pâquier" sub="Lucas R · 18h30 · 14 km" iconBg={A.c.blue} icon="🏃"/>
          <SessionRow title="Tour du lac" sub="Sara M · live · 42 km" iconBg="#ff375f" icon="🚴" live/>
          <SessionRow title="Nage open water" sub="Tom B · 20h · 2 km" iconBg="#5ac8fa" icon="🏊" last/>
        </div>
      </div>

      <TabBar active="discover"/>
    </Phone>
  );
}

function SessionCard({ who, init, tone, title, meta, sport, live }) {
  return (
    <div style={{ width: 200, flexShrink: 0, background: A.c.cell, borderRadius: 14, padding: 12, boxShadow: '0 0 0 0.5px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 16, background: tone, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>{init}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: A.c.ink60, lineHeight: 1.1 }}>{live && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 3, background: A.c.sysGreen, marginRight: 4, verticalAlign: 'middle' }}/>}{who}</div>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.3, lineHeight: 1.15, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sport} {title}</div>
        </div>
      </div>
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: A.c.ink60 }}>{meta}</div>
        <button style={{ height: 26, padding: '0 12px', borderRadius: 13, background: live ? A.c.sysGreen : A.c.blue, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, letterSpacing: -0.2 }}>{live ? 'Suivre' : 'Rejoindre'}</button>
      </div>
    </div>
  );
}

function SessionRow({ title, sub, iconBg, icon, live, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: last ? 'none' : `0.5px solid ${A.c.sep}` }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: A.font.text, fontSize: 16, fontWeight: 600, letterSpacing: -0.4 }}>{title}</div>
        <div style={{ fontSize: 13, color: A.c.ink60, marginTop: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
          {live && <span style={{ width: 6, height: 6, borderRadius: 3, background: A.c.sysGreen }}/>}
          {sub}
        </div>
      </div>
      <button style={{ background: 'rgba(118,118,128,0.12)', color: A.c.blue, border: 'none', borderRadius: 9999, padding: '5px 14px', fontSize: 13, fontWeight: 600, letterSpacing: -0.2, cursor: 'pointer' }}>{live ? 'SUIVRE' : 'REJOINDRE'}</button>
    </div>
  );
}

function MiniMap({ dark }) {
  // App-style abstract clean map
  return (
    <svg viewBox="0 0 360 220" style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid slice">
      <rect width="360" height="220" fill={dark ? '#0a0a0c' : '#e6ecef'}/>
      {/* lake */}
      <path d="M120 60 Q170 40 230 70 Q280 90 240 140 Q190 175 130 150 Q90 130 100 100 Q108 70 120 60Z" fill={dark ? '#1a4570' : '#bbd6e6'}/>
      {/* roads */}
      <path d="M0 110 Q80 100 180 120 Q260 130 360 100" stroke={dark ? '#2a2a2c' : '#fff'} strokeWidth="3" fill="none"/>
      <path d="M40 30 Q80 90 180 120 Q220 140 200 200" stroke={dark ? '#2a2a2c' : '#fff'} strokeWidth="2.5" fill="none"/>
      {/* live dots */}
      <g>
        <circle cx="100" cy="105" r="6" fill="#0066cc"/>
        <circle cx="100" cy="105" r="3" fill="#fff"/>
        <circle cx="180" cy="118" r="6" fill="#34c759"/>
        <circle cx="180" cy="118" r="3" fill="#fff"/>
        <circle cx="240" cy="100" r="6" fill="#5ac8fa"/>
        <circle cx="240" cy="100" r="3" fill="#fff"/>
        <circle cx="290" cy="140" r="6" fill="#ff9500"/>
        <circle cx="290" cy="140" r="3" fill="#fff"/>
      </g>
    </svg>
  );
}

function ScreenSessionDetail() {
  return (
    <Phone label="05 Détail séance" bg={A.c.groupedBg}>
      <NavBar title="" large={false} leading={<div style={{ color: A.c.blue, display: 'flex', alignItems: 'center', gap: 4, fontSize: 17 }}>{SF.back}<span>Découvrir</span></div>} trailing={<span style={{ color: A.c.blue }}>{SF.share}</span>}/>
      <div style={{ padding: '0 16px' }}>
        <div style={{ borderRadius: 18, background: A.c.cell, overflow: 'hidden' }}>
          <div style={{ height: 180 }}><MiniMap/></div>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: A.c.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>LR</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: A.c.ink60 }}>Organisée par</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Lucas Robert</div>
              </div>
              <PillBtn>Suivre</PillBtn>
            </div>
            <div style={{ fontFamily: A.font.display, fontSize: 26, fontWeight: 600, letterSpacing: -0.5, marginTop: 14, lineHeight: 1.1 }}>Sortie longue<br/>autour du lac</div>
            <div style={{ fontSize: 15, color: A.c.ink60, marginTop: 8, lineHeight: 1.4 }}>Allure douce, on s'attend pour les côtes. Ouvert à tous niveaux.</div>
          </div>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <Group inset={false}>
          <Cell icon="📍" iconBg="#ff3b30" title="Pâquier · Annecy" subtitle="Point de départ" accessory="chevron"/>
          <Cell icon="🕡" iconBg="#ff9500" title="Mardi 12 mai · 18:30" subtitle="Durée estimée 1h 18"/>
          <Cell icon="📏" iconBg="#34c759" title="14 km · D+ 240 m" subtitle="Allure 5:30 /km"/>
          <Cell icon="👥" iconBg={A.c.blue} title="3 amis · 8 invités" subtitle="Visible par tes amis" last/>
        </Group>
      </div>
      <div style={{ position: 'absolute', bottom: 28, left: 16, right: 16, height: 64, borderRadius: 18, padding: '0 16px', background: 'rgba(245,245,247,0.85)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', display: 'flex', alignItems: 'center', gap: 12, border: '0.5px solid '+A.c.hair }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: A.c.ink60 }}>Tu peux te désinscrire à tout moment</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Mardi · 18:30</div>
        </div>
        <PillBtn large>Rejoindre</PillBtn>
      </div>
    </Phone>
  );
}

function ScreenLive() {
  return (
    <Phone label="06 Suivi live" bg="#000" statusDark>
      <div style={{ position: 'absolute', inset: 0 }}><MiniMap dark/></div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.85) 100%)' }}/>
      {/* Live AvatarPins — current positions of each runner (signature design) */}
      <AvatarPin x={158} y={205} init="LR" color={A.c.blue} live/>
      <AvatarPin x={232} y={262} init="SM" color="#ff375f" live/>
      <AvatarPin x={108} y={310} init="EK" color="#5ac8fa" live/>
      <AvatarPin x={278} y={355} init="FF" color="#34c759" live/>
      <div style={{ position: 'absolute', top: 56, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ height: 36, padding: '0 12px', borderRadius: 18, background: 'rgba(40,40,42,0.7)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 14, fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: A.c.sysGreen }}/>EN DIRECT · 4 coureurs
        </div>
        <button style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(40,40,42,0.7)', backdropFilter: 'blur(20px)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✕</button>
      </div>
      {/* Hero stat */}
      <div style={{ position: 'absolute', top: 320, left: 0, right: 0, textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 13, opacity: 0.7, fontFamily: A.font.text }}>SORTIE LONGUE · 32:14</div>
        <div style={{ fontFamily: A.font.display, fontSize: 76, fontWeight: 600, letterSpacing: -2, lineHeight: 1, marginTop: 6 }}>7,42<span style={{ fontSize: 22, opacity: 0.6, fontWeight: 400, marginLeft: 4 }}>km</span></div>
        <div style={{ fontSize: 15, opacity: 0.7, marginTop: 6 }}>5:24/km · 148 bpm · +82 m</div>
      </div>
      {/* Bottom sheet */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 240, background: 'rgba(28,28,30,0.94)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: '12px 0 0', color: '#fff' }}>
        <div style={{ width: 36, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.3)', margin: '0 auto 12px' }}/>
        <div style={{ padding: '0 16px', fontFamily: A.font.display, fontSize: 20, fontWeight: 600, letterSpacing: -0.4, marginBottom: 8 }}>Membres en course</div>
        <div style={{ background: 'rgba(58,58,60,0.6)', margin: '0 16px', borderRadius: 10 }}>
          <DarkRow name="Lucas Robert" sub="5:18/km · TÊTE" km="7.81" tone={A.c.blue}/>
          <DarkRow name="Sara Martin" sub="5:24/km" km="7.62" tone="#ff375f"/>
          <DarkRow name="Eli Klein" sub="5:36/km" km="7.20" tone="#5ac8fa" last/>
        </div>
      </div>
    </Phone>
  );
}
function DarkRow({ name, sub, km, tone, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderBottom: last ? 'none' : '0.5px solid rgba(255,255,255,0.08)' }}>
      <div style={{ width: 32, height: 32, borderRadius: 16, background: tone, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>{name.split(' ').map(s=>s[0]).join('')}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 12, opacity: 0.6 }}>{sub}</div>
      </div>
      <div style={{ fontFamily: A.font.display, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>{km}<span style={{ fontSize: 11, opacity: 0.5, marginLeft: 2 }}>km</span></div>
    </div>
  );
}

function ScreenRoute() {
  return (
    <Phone label="07 Itinéraire" bg={A.c.groupedBg}>
      <NavBar title="Itinéraire" large={false} leading={<div style={{ color: A.c.blue, fontSize: 17, display: 'flex', gap: 4, alignItems: 'center' }}>{SF.back}Retour</div>} trailing={<div style={{ color: A.c.blue, fontSize: 17, fontWeight: 600 }}>OK</div>}/>
      <div style={{ padding: '0 16px' }}>
        <div style={{ background: A.c.cell, borderRadius: 14, padding: 4 }}>
          <div style={{ display: 'flex' }}>
            {['Guidé', 'Manuel'].map((t, i) => (
              <div key={t} style={{ flex: 1, padding: '7px 12px', textAlign: 'center', borderRadius: 8, background: i===0 ? '#fff' : 'transparent', color: A.c.ink, fontSize: 13, fontWeight: 600, boxShadow: i===0 ? '0 0 0 0.5px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' : 'none' }}>{t}</div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ borderRadius: 18, overflow: 'hidden', background: A.c.cell, height: 280, position: 'relative' }}>
          <MiniMap/>
          <div style={{ position: 'absolute', right: 12, top: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[SF.loc, SF.plus].map((g, i) => (
              <button key={i} style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.92)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: A.c.blue, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>{g}</button>
            ))}
          </div>
        </div>
      </div>
      <Group title="Itinéraire en cours">
        <Cell title="Distance" value="14,2 km"/>
        <Cell title="Dénivelé" value="240 m"/>
        <Cell title="Étapes" value="6 points" last/>
      </Group>
      <div style={{ padding: '0 16px' }}>
        <div style={{ background: A.c.cell, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, color: A.c.ink60, fontWeight: 500, marginBottom: 8 }}>Profil d'élévation</div>
          <svg viewBox="0 0 320 60" style={{ width: '100%', height: 60 }}>
            <defs><linearGradient id="elev" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#0066cc" stopOpacity="0.3"/><stop offset="1" stopColor="#0066cc" stopOpacity="0"/></linearGradient></defs>
            <path d="M0 50 L20 40 L50 25 L80 32 L110 18 L150 22 L190 30 L230 14 L270 28 L300 35 L320 42 L320 60 L0 60 Z" fill="url(#elev)"/>
            <path d="M0 50 L20 40 L50 25 L80 32 L110 18 L150 22 L190 30 L230 14 L270 28 L300 35 L320 42" stroke={A.c.blue} strokeWidth="1.5" fill="none"/>
          </svg>
        </div>
      </div>
    </Phone>
  );
}

// ─────────────────────────────────────────────
// PROGRAMMER UNE SÉANCE — flux 5 étapes (style Settings)
// ─────────────────────────────────────────────
function StepHeader({ step, total = 5, title, sub }) {
  return (
    <>
      <NavBar title="" large={false} leading={<div style={{ color: A.c.blue, fontSize: 17, display: 'flex', gap: 4 }}>{SF.back}</div>} trailing={<div style={{ color: A.c.ink60, fontSize: 15 }}>Étape {step}/{total}</div>}/>
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < step ? A.c.blue : 'rgba(60,60,67,0.18)' }}/>
          ))}
        </div>
        <div style={{ fontFamily: A.font.display, fontSize: 28, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.1 }}>{title}</div>
        {sub && <div style={{ fontSize: 15, color: A.c.ink60, marginTop: 4, lineHeight: 1.35 }}>{sub}</div>}
      </div>
    </>
  );
}
const ctaFloat = { position: 'absolute', bottom: 40, left: 24, right: 24 };

function ScreenStep1() {
  return (
    <Phone label="08 Programmer · 1 Lieu" bg={A.c.groupedBg}>
      <StepHeader step={1} title="Où ça se passe ?" sub="Cherche un lieu ou pose un point sur la carte."/>
      <SearchBar placeholder="Cherche un parc, une rue..."/>
      <div style={{ padding: '8px 16px 0', display: 'flex', gap: 8 }}>
        <PillBtn>📍 Ma position</PillBtn>
        <PillBtn secondary>Centrer la carte</PillBtn>
      </div>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ height: 320, borderRadius: 18, overflow: 'hidden', position: 'relative', background: A.c.cell }}>
          <MiniMap/>
          <AvatarPin x={170} y={195} init="FF" color={A.c.blue}/>
          <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: A.c.blue }}>{SF.loc}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Pâquier</div>
              <div style={{ fontSize: 13, color: A.c.ink60 }}>Annecy, Haute-Savoie</div>
            </div>
          </div>
        </div>
      </div>
      <div style={ctaFloat}><PillBtn full large>Continuer</PillBtn></div>
    </Phone>
  );
}

function ScreenStep2() {
  const sports = [
    { e: '🏃', n: 'Course', s: 'Trail · route', bg: A.c.blue, sel: true },
    { e: '🚴', n: 'Vélo', s: 'Route · gravel · MTB', bg: '#ff9500' },
    { e: '🏊', n: 'Natation', s: 'Piscine · open water', bg: '#5ac8fa' },
    { e: '🥾', n: 'Randonnée', s: 'Marche · trek', bg: '#34c759' },
    { e: '⛷️', n: 'Ski', s: 'Alpin · rando', bg: '#af52de' },
    { e: '🧘', n: 'Yoga', s: 'Étirements · mobilité', bg: '#ff375f' },
  ];
  return (
    <Phone label="09 Programmer · 2 Sport" bg={A.c.groupedBg}>
      <StepHeader step={2} title="Quel sport ?" sub="On adapte les blocs et l'allure en conséquence."/>
      <div style={{ padding: '0 16px' }}>
        <Group inset={false}>
          {sports.map((s, i) => (
            <Cell key={s.n} icon={s.e} iconBg={s.bg} title={s.n} subtitle={s.s} accessory={s.sel ? 'check' : null} last={i === sports.length-1}/>
          ))}
        </Group>
      </div>
      <div style={ctaFloat}><PillBtn full large>Continuer</PillBtn></div>
    </Phone>
  );
}

function ScreenStep3() {
  const days = ['L','M','M','J','V','S','D'];
  const dates = [12,13,14,15,16,17,18];
  return (
    <Phone label="10 Programmer · 3 Date" bg={A.c.groupedBg}>
      <StepHeader step={3} title="Quand ?" sub="Choisis une date et une heure de départ."/>
      <div style={{ padding: '0 16px' }}>
        <div style={{ background: A.c.cell, borderRadius: 14, padding: '14px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 10px' }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.4 }}>Mai 2026</div>
            <div style={{ display: 'flex', gap: 12, color: A.c.blue }}>
              <span>‹</span><span>›</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {dates.map((d, i) => (
              <div key={i} style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: i === 0 ? A.c.blue : 'transparent', color: i === 0 ? '#fff' : A.c.ink }}>
                <div style={{ fontSize: 11, opacity: 0.6 }}>{days[i]}</div>
                <div style={{ fontFamily: A.font.display, fontSize: 18, fontWeight: 600 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Group title="Heure de départ" footer="Durée estimée 1h 18 — basé sur tes records">
        <Cell title="Heure" value="18:30" last/>
      </Group>
      <div style={{ padding: '0 16px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['07:00', '12:00', '18:30', '20:00'].map((t, i) => (
          <PillBtn key={t} secondary={i!==2}>{t}</PillBtn>
        ))}
      </div>
      <div style={ctaFloat}><PillBtn full large>Continuer</PillBtn></div>
    </Phone>
  );
}

function ScreenStep4() {
  return (
    <Phone label="11 Programmer · 4 Détails" bg={A.c.groupedBg}>
      <StepHeader step={4} title="Compose ta séance" sub="Glisse les blocs pour structurer l'effort."/>
      <div style={{ padding: '0 16px' }}>
        <div style={{ background: A.c.cell, borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: A.c.ink60, fontWeight: 500 }}>SCHÉMA · 4 BLOCS</div>
            <div style={{ fontSize: 15, color: A.c.blue, fontWeight: 500 }}>Modifier</div>
          </div>
          <svg viewBox="0 0 320 80" style={{ width: '100%', height: 70 }}>
            <rect x="0" y="50" width="50" height="30" rx="3" fill="#34c759"/>
            <rect x="55" y="20" width="35" height="60" rx="3" fill="#0066cc"/>
            <rect x="95" y="40" width="20" height="40" rx="3" fill="#5ac8fa"/>
            <rect x="120" y="20" width="35" height="60" rx="3" fill="#0066cc"/>
            <rect x="160" y="40" width="20" height="40" rx="3" fill="#5ac8fa"/>
            <rect x="185" y="20" width="35" height="60" rx="3" fill="#0066cc"/>
            <rect x="225" y="40" width="20" height="40" rx="3" fill="#5ac8fa"/>
            <rect x="250" y="55" width="70" height="25" rx="3" fill="#34c759"/>
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: A.c.ink60, marginTop: 4 }}>
            <span>Échauffement</span><span>3×1km @ Z5</span><span>Retour</span>
          </div>
        </div>
      </div>
      <Group title="Médias">
        <Cell icon="📷" iconBg="#ff9500" title="Ajouter une photo" accessory="chevron"/>
        <Cell icon="🗺️" iconBg="#34c759" title="Itinéraire lié" subtitle="Tour du Pâquier · 14,2 km" accessory="chevron" last/>
      </Group>
      <Group title="Visibilité" footer="Le suivi live partage ta position en temps réel pendant la séance, comme sur la page « En direct ».">
        <Cell icon="👥" iconBg={A.c.blue} title="Mes amis" subtitle="124 amis" accessory="check"/>
        <Cell icon="🌍" iconBg={A.c.ink} title="Tout le monde" subtitle="Premium · visibilité globale" accessory="chevron"/>
        <Cell icon="📡" iconBg="#ff3b30" title="Live tracking" subtitle="Diffuse ma position pendant la séance" last><Toggle on/></Cell>
        <div style={{ padding: '12px 16px', borderTop: `0.5px solid ${A.c.sep}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,59,48,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: '#ff3b30', boxShadow: '0 0 0 4px rgba(255,59,48,0.18)' }}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.3 }}>Aperçu live</div>
            <div style={{ fontSize: 12, color: A.c.ink60, marginTop: 1 }}>Avatars visibles sur la carte · auto-stop à l'arrivée</div>
          </div>
          <PillBtn secondary>Voir</PillBtn>
        </div>
      </Group>
      <div style={ctaFloat}><PillBtn full large>Continuer</PillBtn></div>
    </Phone>
  );
}

function ScreenStep5() {
  return (
    <Phone label="12 Programmer · 5 Booster" bg={A.c.groupedBg}>
      <StepHeader step={5} title="Tout est prêt." sub="Booste pour multiplier ta visibilité."/>
      <div style={{ padding: '0 16px' }}>
        <div style={{ borderRadius: 18, overflow: 'hidden', background: A.c.cell }}>
          <div style={{ height: 160, position: 'relative' }}>
            <MiniMap/>
            <AvatarPin x={170} y={120} init="FF" color={A.c.blue}/>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: A.c.blue, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>SORTIE LONGUE · 14 KM</div>
            <div style={{ fontFamily: A.font.display, fontSize: 24, fontWeight: 600, letterSpacing: -0.5, marginTop: 4 }}>Mardi · 18:30</div>
            <div style={{ fontSize: 15, color: A.c.ink60, marginTop: 2 }}>Pâquier, Annecy · 124 amis invités</div>
          </div>
        </div>
      </div>
      <Group title="Booster">
        <Cell icon="⚡" iconBg={A.c.blue} title="Visibilité globale" subtitle="Affiché en tête de la carte"/>
        <Cell icon="📺" iconBg="#ff9500" title="Regarder une vidéo · 15s" subtitle="Pour activer le boost gratuitement" accessory="chevron"/>
        <Cell icon="✨" iconBg="#af52de" title="Passer Premium" subtitle="Boost illimité · 4,99 €/mois" accessory="chevron" accent last/>
      </Group>
      <div style={ctaFloat}><PillBtn full large>Programmer & booster</PillBtn></div>
    </Phone>
  );
}

// ─────────────────────────────────────────────
// MES SÉANCES + COACHING
// ─────────────────────────────────────────────
function ScreenSessions() {
  // Apple Calendar.app style month grid
  const month = [
    [null, null, null, 1, 2, 3, 4],
    [5, 6, 7, 8, 9, 10, 11],
    [12, 13, 14, 15, 16, 17, 18],
    [19, 20, 21, 22, 23, 24, 25],
    [26, 27, 28, 29, 30, 31, null],
  ];
  // dot color by sport for some days
  const marks = {
    1:[A.c.blue], 3:['#ff9500','#5ac8fa'], 5:[A.c.blue], 7:['#ff9500'],
    8:[A.c.blue,'#ff3b30'], 10:[A.c.blue], 11:['#34c759'], 14:[A.c.blue],
    16:['#5ac8fa'], 18:['#ff9500'], 22:[A.c.blue], 24:['#ff3b30'],
    26:[A.c.blue,'#ff9500'], 28:['#34c759'],
  };
  const today = 8;
  const weekDays = ['L','M','M','J','V','S','D'];
  return (
    <Phone label="13 Mes séances" bg={A.c.groupedBg}>
      <NavBar title="Séances" leading={<span style={{ color: A.c.blue, fontSize: 17 }}>Calendriers</span>} trailing={<span style={{ color: A.c.blue }}>{SF.plus}</span>}/>
      {/* Month picker bar */}
      <div style={{ padding: '0 16px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: A.font.display, fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: A.c.blue }}>Mai 2026 <span style={{ color: A.c.blue, fontSize: 13 }}>{SF.arrow}</span></div>
        <div style={{ display: 'flex', gap: 14, color: A.c.blue, fontSize: 17 }}>
          <span>⌕</span><span>{SF.plus}</span>
        </div>
      </div>
      {/* Weekday header */}
      <div style={{ margin: '10px 16px 0', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', fontSize: 11, color: A.c.ink60, fontWeight: 500 }}>
        {weekDays.map((w, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '4px 0', color: i >= 5 ? A.c.ink30 : A.c.ink60 }}>{w}</div>
        ))}
      </div>
      <div style={{ height: 0.5, background: A.c.hair, margin: '0 16px' }}/>
      {/* Month grid */}
      <div style={{ margin: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
        {month.flat().map((d, i) => {
          const isToday = d === today;
          const isWeekend = (i % 7) >= 5;
          return (
            <div key={i} style={{ aspectRatio: '1 / 1.05', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6, gap: 3, borderTop: i >= 7 ? `0.5px solid ${A.c.hair}` : 'none' }}>
              {d && (
                <>
                  <div style={{
                    width: 26, height: 26, borderRadius: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isToday ? A.c.sysRed : 'transparent',
                    color: isToday ? '#fff' : (isWeekend ? A.c.ink30 : A.c.ink),
                    fontFamily: A.font.display, fontSize: 16, fontWeight: isToday ? 600 : 400, letterSpacing: -0.3,
                  }}>{d}</div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {(marks[d] || []).slice(0,3).map((c, j) => (
                      <div key={j} style={{ width: 4, height: 4, borderRadius: 2, background: c }}/>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      {/* Day list (Apple Calendar's bottom panel for selected day) */}
      <div style={{ height: 8 }}/>
      <div style={{ background: A.c.cell, borderTop: `0.5px solid ${A.c.sep}` }}>
        <div style={{ padding: '14px 16px 6px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontFamily: A.font.display, fontSize: 17, fontWeight: 700, letterSpacing: -0.4 }}>jeudi 8</div>
          <div style={{ fontSize: 13, color: A.c.ink60 }}>aujourd'hui · 1 séance</div>
        </div>
        <SessionRow title="Sortie longue · Pâquier" sub="18:30 · 14 km · 4 amis" iconBg={A.c.blue} icon="🏃" last/>
      </div>
      <TabBar active="sessions"/>
    </Phone>
  );
}

function ScreenAthletePlan() {
  return (
    <Phone label="14 Coaching · Mon plan" bg={A.c.groupedBg}>
      <NavBar title="Coaching" trailing={<div style={{ width: 32, height: 32, borderRadius: 16, background: '#dcdce0', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>MD</div>}/>
      <div style={{ padding: '0 16px' }}>
        <div style={{ background: A.c.ink, color: '#fff', borderRadius: 18, padding: 18 }}>
          <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 500, letterSpacing: 0.4, textTransform: 'uppercase' }}>SEMAINE 12 · COACH MARC</div>
          <div style={{ fontFamily: A.font.display, fontSize: 28, fontWeight: 600, letterSpacing: -0.4, marginTop: 6 }}>3 sur 5 séances</div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.15)', marginTop: 12 }}>
            <div style={{ width: '60%', height: '100%', borderRadius: 3, background: A.c.blueDark }}/>
          </div>
        </div>
      </div>
      <Group title="À faire">
        <PlanCell day="JEU" date="8" title="Fractionné 10×400" sub="Z5 · 8 km" status="today"/>
        <PlanCell day="SAM" date="10" title="Sortie longue" sub="Z2 · 18 km" status="planned"/>
        <PlanCell day="DIM" date="11" title="Récup active" sub="Z1 · 6 km" status="planned" last/>
      </Group>
      <Group title="Réalisées">
        <PlanCell day="MER" date="7" title="Tour vélo lac" sub="Z2 · 32 km" status="done" last/>
      </Group>
      <TabBar active="plan"/>
    </Phone>
  );
}
function PlanCell({ day, date, title, sub, status, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: last ? 'none' : `0.5px solid ${A.c.sep}` }}>
      <div style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: A.c.ink60 }}>{day}</div>
        <div style={{ fontFamily: A.font.display, fontSize: 22, fontWeight: 600, color: status === 'today' ? A.c.blue : A.c.ink }}>{date}</div>
      </div>
      <div style={{ width: 0.5, height: 32, background: A.c.sep }}/>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.4 }}>{title}</div>
        <div style={{ fontSize: 13, color: A.c.ink60 }}>{sub}</div>
      </div>
      {status === 'done' && <div style={{ width: 22, height: 22, borderRadius: 11, background: A.c.sysGreen, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✓</div>}
      {status === 'today' && <PillBtn>Démarrer</PillBtn>}
      {status === 'planned' && <span style={{ color: A.c.ink30 }}>{SF.arrow}</span>}
    </div>
  );
}

function ScreenCoachBuild() {
  return (
    <Phone label="15 Coaching · Schéma" bg={A.c.groupedBg}>
      <NavBar title="" large={false} leading={<div style={{ color: A.c.blue }}>Annuler</div>} trailing={<div style={{ color: A.c.blue, fontWeight: 600 }}>OK</div>}/>
      <div style={{ padding: '0 16px' }}>
        <input style={{ width: '100%', height: 44, border: 'none', background: A.c.cell, borderRadius: 12, padding: '0 14px', fontFamily: A.font.display, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, outline: 'none' }} defaultValue="Fractionné 10×400"/>
        <div style={{ fontSize: 13, color: A.c.ink60, marginTop: 6, padding: '0 4px' }}>8,2 km · ~42 min · RPE <span style={{ color: A.c.blue, fontWeight: 600 }}>8/10</span></div>
      </div>
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ background: '#0e0e0f', borderRadius: 18, padding: 16, height: 200, position: 'relative' }}>
          {[1,2,3,4,5].map(z => (
            <div key={z} style={{ position: 'absolute', left: 16, right: 16, bottom: 16 + (z-1)*30, height: 0.5, background: 'rgba(255,255,255,0.1)' }}>
              <div style={{ position: 'absolute', left: 0, top: -8, fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>Z{z}</div>
            </div>
          ))}
          <svg viewBox="0 0 320 160" style={{ position: 'absolute', inset: 16, width: 'calc(100% - 32px)', height: 'calc(100% - 32px)' }}>
            <rect x="0" y="100" width="40" height="60" rx="3" fill="#34c759"/>
            {Array.from({ length: 10 }).map((_, i) => (
              <g key={i}>
                <rect x={45 + i*23} y="20" width="14" height="140" rx="2" fill="#0066cc"/>
                {i < 9 && <rect x={59 + i*23} y="70" width="9" height="90" rx="2" fill="#5ac8fa"/>}
              </g>
            ))}
            <rect x="278" y="115" width="42" height="45" rx="3" fill="#34c759"/>
          </svg>
        </div>
      </div>
      <Group title="Bloc · Intervalle">
        <Cell title="Répétitions" value="10×"/>
        <Cell title="Distance" value="400 m"/>
        <Cell title="Allure cible" value="3:30 /km"/>
        <Cell title="Récupération" value="60 s" last/>
      </Group>
      <div style={{ padding: '0 16px', display: 'flex', gap: 6 }}>
        {[
          {k:'Continu', c:'#34c759'},{k:'Intervalle', c:A.c.blue},{k:'Permis', c:'#5ac8fa'},{k:'Variation', c:'#af52de'},
        ].map(b => (
          <div key={b.k} style={{ flex: 1, padding: '10px 4px', borderRadius: 12, background: A.c.cell, textAlign: 'center' }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: b.c, margin: '0 auto 4px' }}/>
            <div style={{ fontSize: 11, fontWeight: 500 }}>{b.k}</div>
          </div>
        ))}
      </div>
    </Phone>
  );
}

function ScreenCoachAthlete() {
  return (
    <Phone label="16 Coaching · Athlète" bg={A.c.groupedBg}>
      <NavBar title="" large={false} leading={<div style={{ color: A.c.blue, fontSize: 17, display: 'flex', gap: 4 }}>{SF.back}Athlètes</div>} trailing={<span style={{ color: A.c.blue }}>{SF.ellipsis}</span>}/>
      <div style={{ padding: '0 16px', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: 40, background: '#ff375f', color: '#fff', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 600 }}>SM</div>
        <div style={{ fontFamily: A.font.display, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, marginTop: 12 }}>Sara Martin</div>
        <div style={{ fontSize: 13, color: A.c.ink60 }}>Annecy · 8 mois</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14 }}>
          <PillBtn>Message</PillBtn>
          <PillBtn secondary>Voir profil</PillBtn>
        </div>
      </div>
      <Group title="Cette semaine">
        <div style={{ padding: 10, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {[
            {v: 'ok'}, {v: 'rest'}, {v: 'ok'}, {v: 'miss'}, {v: 'ok'}, {v: 'today'}, {v: 'planned'},
          ].map((d, i) => {
            const cfg = {
              ok: { bg: A.c.sysGreen, c: '#fff', t: '✓' },
              miss: { bg: A.c.sysRed, c: '#fff', t: '✕' },
              rest: { bg: 'rgba(118,118,128,0.12)', c: A.c.ink60, t: '–' },
              today: { bg: A.c.blue, c: '#fff', t: '●' },
              planned: { bg: 'transparent', c: A.c.ink60, t: '○', border: true },
            }[d.v];
            return (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 10, background: cfg.bg, color: cfg.c, border: cfg.border ? `0.5px solid ${A.c.hair}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600 }}>{cfg.t}</div>
            );
          })}
        </div>
      </Group>
      <Group title="Records personnels" footer="Mis à jour il y a 2 jours">
        <Cell title="5 km" value="22:14"/>
        <Cell title="10 km" value="46:40"/>
        <Cell title="Semi" value="1:42:15" last/>
      </Group>
      <div style={{ padding: '0 16px' }}>
        <PillBtn full large>Envoyer une nouvelle séance</PillBtn>
      </div>
    </Phone>
  );
}

// ─────────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────────
function ScreenMessages() {
  return (
    <Phone label="17 Messages" bg={A.c.groupedBg}>
      <NavBar title="Messages" leading={<span style={{ color: A.c.blue, fontSize: 17 }}>Modifier</span>} trailing={<span style={{ color: A.c.blue }}>{SF.plus}</span>}/>
      <SearchBar/>
      {/* Stories rail */}
      <div style={{ display: 'flex', gap: 12, padding: '6px 16px 18px', overflowX: 'hidden' }}>
        {[
          { name: 'Toi', mine: true, c: '#dcdce0' },
          { name: 'Lucas', c: A.c.blue },
          { name: 'Sara', c: '#ff375f' },
          { name: 'Tom', c: '#34c759' },
          { name: 'Eli', c: '#5ac8fa' },
          { name: 'Max', c: '#ff9500' },
          { name: 'Léa', c: '#af52de' },
        ].map((s) => (
          <div key={s.name} style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, padding: 2.5, background: s.mine ? '#dcdce0' : `conic-gradient(from 200deg, ${A.c.blue}, ${A.c.blueDark}, ${A.c.blue})`, position: 'relative' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: 30, padding: 2, background: A.c.groupedBg }}>
                <div style={{ width: 54, height: 54, borderRadius: 27, background: s.c, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 18 }}>{s.name[0]}</div>
              </div>
              {s.mine && <div style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, background: A.c.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2.5px solid '+A.c.groupedBg }}>{SF.plus}</div>}
            </div>
            <div style={{ fontSize: 11, marginTop: 6, color: s.mine ? A.c.ink60 : A.c.ink }}>{s.name}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '0 16px', display: 'flex', gap: 6, marginBottom: 8 }}>
        {['Conversations', 'Clubs · 4', 'Groupes · 2'].map((t, i) => (
          <PillBtn key={t} secondary={i!==0}>{t}</PillBtn>
        ))}
      </div>
      <Group>
        <ConvRow name="Lucas Robert" msg="On part du Pâquier 18:30 ?" time="12:42" tone={A.c.blue} unread/>
        <ConvRow name="Annecy Runners · Club" msg="Sara : Sortie longue dimanche 8h" time="11:08" tone="#34c759" unread="3" badge="🏛"/>
        <ConvRow name="Sara Martin" msg="Vu ton record sur le 10K 🔥" time="Hier" tone="#ff375f"/>
        <ConvRow name="Mes athlètes · Groupe" msg="Coach Marc : Plans envoyés" time="Hier" tone="#7a7a7a" badge="👥"/>
        <ConvRow name="Tom Brillant" msg="Pool 20h ?" time="Mar" tone="#5ac8fa" last/>
      </Group>
      <TabBar active="msg"/>
    </Phone>
  );
}
function ConvRow({ name, msg, time, tone, unread, badge, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: last ? 'none' : `0.5px solid ${A.c.sep}` }}>
      <div style={{ position: 'relative' }}>
        <div style={{ width: 50, height: 50, borderRadius: 25, background: tone, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 16 }}>{name.split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
        {badge && <div style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, background: A.c.cell, border: `2px solid ${A.c.cell}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{badge}</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.4 }}>{name}</div>
          <div style={{ fontSize: 13, color: A.c.ink60 }}>{time}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          <div style={{ fontSize: 14, color: A.c.ink60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{msg}</div>
          {unread === true && <div style={{ width: 10, height: 10, borderRadius: 5, background: A.c.blue, marginLeft: 8 }}/>}
          {typeof unread === 'string' && <div style={{ minWidth: 22, height: 22, padding: '0 7px', borderRadius: 11, background: A.c.blue, color: '#fff', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>{unread}</div>}
        </div>
      </div>
    </div>
  );
}

function ScreenConv() {
  return (
    <Phone label="18 Messages · Conv" bg={A.c.groupedBg}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 100, background: 'rgba(249,249,249,0.94)', backdropFilter: 'blur(20px) saturate(180%)', borderBottom: `0.33px solid ${A.c.hair}`, padding: '50px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: A.c.blue, fontSize: 17, display: 'flex', gap: 4 }}>{SF.back}</span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: A.c.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>LR</div>
          <div style={{ fontSize: 11, fontWeight: 600 }}>Lucas Robert</div>
        </div>
        <span style={{ color: A.c.blue }}>{SF.ellipsis}</span>
      </div>
      <div style={{ padding: '110px 16px 100px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Bubble side="them">Salut, sortie ce soir ?</Bubble>
        <Bubble side="me">Yes carrément. T'as une idée ?</Bubble>
        <SessionShare/>
        <Bubble side="them">J'ai créé celle-là 👆</Bubble>
        <Bubble side="me">Parfait, j'arrive 👌</Bubble>
        <div style={{ alignSelf: 'center', fontSize: 11, color: A.c.ink60, marginTop: 4 }}>en train d'écrire…</div>
      </div>
      <div style={{ position: 'absolute', bottom: 24, left: 12, right: 12, height: 44, borderRadius: 22, background: A.c.cell, border: `0.5px solid ${A.c.hair}`, display: 'flex', alignItems: 'center', padding: '0 4px 0 14px', gap: 8 }}>
        <span style={{ color: A.c.blue, fontSize: 18 }}>{SF.plus}</span>
        <div style={{ flex: 1, fontSize: 15, color: A.c.ink60 }}>iMessage</div>
        <button style={{ width: 36, height: 36, borderRadius: 18, background: A.c.blue, color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>↑</button>
      </div>
    </Phone>
  );
}
function Bubble({ side, children }) {
  const isMe = side === 'me';
  return (
    <div style={{
      alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '76%',
      background: isMe ? A.c.blue : '#e9e9eb', color: isMe ? '#fff' : A.c.ink,
      padding: '8px 14px', borderRadius: 18, fontSize: 16, lineHeight: 1.3, letterSpacing: -0.3,
    }}>{children}</div>
  );
}
function SessionShare() {
  return (
    <div style={{ alignSelf: 'flex-start', width: 240, borderRadius: 18, overflow: 'hidden', background: A.c.cell, border: `0.5px solid ${A.c.hair}` }}>
      <div style={{ height: 100 }}><MiniMap/></div>
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 11, color: A.c.blue, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>RUNCONNECT</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2, letterSpacing: -0.4 }}>Sortie longue · Pâquier</div>
        <div style={{ fontSize: 12, color: A.c.ink60 }}>Mar 18:30 · 14 km</div>
      </div>
    </div>
  );
}

function ScreenClub() {
  return (
    <Phone label="24 Messages · Club" bg={A.c.groupedBg}>
      <NavBar title="" large={false} leading={<div style={{ color: A.c.blue, fontSize: 17, display: 'flex', gap: 4 }}>{SF.back}Clubs</div>} trailing={<span style={{ color: A.c.blue }}>{SF.ellipsis}</span>}/>
      <div style={{ textAlign: 'center', padding: '0 16px' }}>
        <div style={{ width: 80, height: 80, margin: '0 auto', borderRadius: 18, background: '#34c759', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🏛</div>
        <div style={{ fontFamily: A.font.display, fontSize: 24, fontWeight: 600, letterSpacing: -0.5, marginTop: 12 }}>Annecy Runners</div>
        <div style={{ fontSize: 13, color: A.c.ink60 }}>Club · 124 membres</div>
      </div>
      <Group title="Code d'accès" footer="Partage ce code avec d'autres coureurs.">
        <Cell title="ANC-RUN-26" value="Copier" accent last/>
      </Group>
      <Group title="Membres récents">
        <div style={{ padding: 12, display: 'flex' }}>
          {['#0066cc','#ff375f','#34c759','#5ac8fa','#ff9500','#af52de'].map((c, i) => (
            <div key={i} style={{ width: 40, height: 40, borderRadius: 20, background: c, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, border: '2px solid #fff', marginLeft: i === 0 ? 0 : -8 }}>{String.fromCharCode(65+i)}</div>
          ))}
          <div style={{ marginLeft: -8, width: 40, height: 40, borderRadius: 20, background: 'rgba(118,118,128,0.16)', color: A.c.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, border: '2px solid #fff' }}>+117</div>
        </div>
      </Group>
      <Group>
        <Cell icon="📅" iconBg={A.c.blue} title="Séances du club" value="12 à venir" accessory="chevron"/>
        <Cell icon="💬" iconBg="#34c759" title="Conversation du club" accessory="chevron"/>
        <Cell icon="🔗" iconBg="#ff9500" title="Inviter via lien" accessory="chevron" last/>
      </Group>
    </Phone>
  );
}

// ─────────────────────────────────────────────
// PROFIL + PARAMÈTRES (Settings.app perfect match)
// ─────────────────────────────────────────────
function ScreenProfile() {
  return (
    <Phone label="19 Profil" bg={A.c.groupedBg}>
      <NavBar title="Profil" trailing={<span style={{ color: A.c.blue }}>{SF.share}</span>}/>
      {/* Apple-ID-style banner */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ background: A.c.cell, borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: A.c.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 600 }}>FF</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: A.font.display, fontSize: 22, fontWeight: 600, letterSpacing: -0.4 }}>Ferdinand Froidefont</div>
            <div style={{ fontSize: 13, color: A.c.ink60, marginTop: 2 }}>@ferdi · Annecy · Premium ✓</div>
          </div>
          <span style={{ color: A.c.ink30 }}>{SF.arrow}</span>
        </div>
      </div>
      <div style={{ padding: '12px 16px 0', display: 'flex', gap: 8 }}>
        <StatTile value="187" label="Séances"/>
        <StatTile value="1.2k" label="Abonnés"/>
        <StatTile value="438" label="Suivis"/>
      </div>
      <Group title="Records personnels" footer="Visibles par tes amis.">
        <Cell title="5 km" value="19:42"/>
        <Cell title="10 km" value="41:18"/>
        <Cell title="Semi-marathon" value="1:38:22" last/>
      </Group>
      <Group>
        <Cell icon="📸" iconBg="#ff9500" title="Mes stories" subtitle="3 publiées · 12 vues" accessory="chevron"/>
        <Cell icon="🏆" iconBg={A.c.sysOrange} title="Mes podiums" subtitle="2 victoires de défi" accessory="chevron"/>
        <Cell icon="📅" iconBg={A.c.blue} title="Historique des séances" accessory="chevron" last/>
      </Group>
      <TabBar active="profile"/>
    </Phone>
  );
}
function StatTile({ value, label }) {
  return (
    <div style={{ flex: 1, background: A.c.cell, borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ fontFamily: A.font.display, fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>{value}</div>
      <div style={{ fontSize: 13, color: A.c.ink60, marginTop: 1 }}>{label}</div>
    </div>
  );
}

function ScreenSettings() {
  const { theme, setTheme } = useTheme();
  return (
    <Phone label="20 Paramètres" bg={A.c.groupedBg}>
      <NavBar title="Réglages"/>
      <SearchBar/>
      <div style={{ padding: '0 16px' }}>
        <div style={{ background: A.c.cell, borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: 30, background: A.c.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 22 }}>FF</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: A.font.display, fontSize: 19, fontWeight: 600, letterSpacing: -0.4 }}>Ferdinand Froidefont</div>
            <div style={{ fontSize: 13, color: A.c.ink60, marginTop: 1 }}>Compte · Premium · Famille</div>
          </div>
          <span style={{ color: A.c.ink30 }}>{SF.arrow}</span>
        </div>
      </div>
      <Group title="" inset>
        <Cell icon="✈️" iconBg="#ff9500" title="Mode Avion"><Toggle on={false}/></Cell>
        <Cell icon="📡" iconBg={A.c.blue} title="Données" subtitle="Activé en arrière-plan" accessory="chevron"/>
        <Cell icon="🔔" iconBg="#ff3b30" title="Notifications" value="Activées" accessory="chevron" last/>
      </Group>
      <Group footer="Le mode sombre s'applique à toutes les pages — comme dans iOS.">
        <Cell icon="🌍" iconBg={A.c.sysGreen} title="Langue & région" value="Français" accessory="chevron"/>
        <div style={{ padding: '11px 16px', borderBottom: `0.5px solid ${A.c.sep}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 29, height: 29, borderRadius: 6.5, background: '#af52de', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🎨</div>
          <div style={{ flex: 1, fontSize: 17, color: A.c.ink, letterSpacing: -0.4 }}>Apparence</div>
          <div style={{ display: 'flex', background: 'var(--c-search-fill)', borderRadius: 9, padding: 2, gap: 0 }}>
            {[{ k: 'light', l: 'Clair' }, { k: 'dark', l: 'Sombre' }].map(o => (
              <button key={o.k} onClick={() => setTheme(o.k)} style={{
                border: 'none', cursor: 'pointer',
                padding: '5px 11px', borderRadius: 7, fontSize: 13, fontWeight: 500, letterSpacing: -0.2,
                background: theme === o.k ? A.c.cell : 'transparent',
                color: A.c.ink,
                boxShadow: theme === o.k ? '0 1px 2px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.04)' : 'none',
              }}>{o.l}</button>
            ))}
          </div>
        </div>
        <Cell icon="📏" iconBg="#5ac8fa" title="Unités" value="Métrique" accessory="chevron" last/>
      </Group>
      <Group title="RunConnect">
        <Cell icon="⚡" iconBg={A.c.blue} title="Premium" subtitle="Boost illimité · visibilité globale" accessory="chevron" accent/>
        <Cell icon="🎁" iconBg="#ff375f" title="Code de parrainage" value="FERDI-2026" accessory="chevron"/>
        <Cell icon="🔗" iconBg="#34c759" title="Connexions" subtitle="Apple Santé · Strava" accessory="chevron"/>
        <Cell icon="🛡" iconBg="#7a7a7a" title="Confidentialité · RGPD" accessory="chevron" last/>
      </Group>
      <Group>
        <Cell icon="💬" iconBg={A.c.sysGreen} title="Contacter le support" accessory="chevron"/>
        <Cell icon="📚" iconBg="#ff9500" title="Tutoriels" value="14 disponibles" accessory="chevron" last/>
      </Group>
      <Group>
        <Cell title="Se déconnecter" danger accessory={null} last/>
      </Group>
      <div style={{ height: 40 }}/>
    </Phone>
  );
}

function ScreenRecord() {
  return (
    <Phone label="21 Profil · Ajouter record" bg={A.c.groupedBg}>
      <NavBar title="" large={false} leading={<div style={{ color: A.c.blue }}>Annuler</div>} trailing={<div style={{ color: A.c.blue, fontWeight: 600 }}>OK</div>}/>
      <div style={{ padding: '0 16px', textAlign: 'center' }}>
        <div style={{ fontFamily: A.font.display, fontSize: 22, fontWeight: 600, letterSpacing: -0.4 }}>Nouveau record</div>
        <div style={{ fontSize: 13, color: A.c.ink60, marginTop: 4 }}>Renseigne ton meilleur temps.</div>
      </div>
      <Group title="Sport">
        <Cell icon="🏃" iconBg={A.c.blue} title="Course à pied" accessory="check"/>
        <Cell icon="🚴" iconBg="#ff9500" title="Vélo"/>
        <Cell icon="🏊" iconBg="#5ac8fa" title="Natation" last/>
      </Group>
      <Group title="Distance">
        <div style={{ padding: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['1 km', '5 km', '10 km', 'Semi', 'Marathon', 'Autre'].map((d, i) => (
            <PillBtn key={d} secondary={i!==2}>{d}</PillBtn>
          ))}
        </div>
      </Group>
      <Group title="Temps" footer="Allure calculée 4:08 /km · Nouveau PR ✓">
        <div style={{ padding: '20px 16px', textAlign: 'center', fontFamily: A.font.display, fontSize: 48, fontWeight: 600, letterSpacing: -1.5 }}>
          00<span style={{ color: A.c.ink60, fontSize: 22 }}>h</span>{' '}
          <span style={{ color: A.c.blue }}>41</span><span style={{ color: A.c.ink60, fontSize: 22 }}>m</span>{' '}
          18<span style={{ color: A.c.ink60, fontSize: 22 }}>s</span>
        </div>
      </Group>
    </Phone>
  );
}

function ScreenStory() {
  return (
    <Phone label="22 Profil · Créer story" bg="#000" statusDark>
      <div style={{ position: 'absolute', inset: 0 }}><MiniMap dark/></div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.7) 100%)' }}/>
      <div style={{ position: 'absolute', top: 56, left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }}>
        <button style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(40,40,42,0.7)', border: 'none', color: '#fff', backdropFilter: 'blur(20px)' }}>✕</button>
        <button style={{ height: 36, padding: '0 14px', borderRadius: 18, background: 'rgba(40,40,42,0.7)', color: '#fff', border: 'none', backdropFilter: 'blur(20px)', fontSize: 14, fontWeight: 500 }}>Galerie</button>
      </div>
      <div style={{ position: 'absolute', top: 220, left: 30, right: 30 }}>
        <div style={{ borderRadius: 18, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: A.c.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>FF</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3 }}>Ferdinand F.</div>
              <div style={{ fontSize: 12, color: A.c.ink60 }}>il y a 1h · Annecy</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: A.c.blue, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 14 }}>SORTIE LONGUE · TERMINÉE</div>
          <div style={{ fontFamily: A.font.display, fontSize: 24, fontWeight: 600, letterSpacing: -0.5, marginTop: 4, lineHeight: 1.1 }}>14 km autour<br/>du lac d'Annecy</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 14, paddingTop: 12, borderTop: `0.5px solid ${A.c.hair}` }}>
            <div><div style={{ fontFamily: A.font.display, fontSize: 18, fontWeight: 600 }}>1:18</div><div style={{ fontSize: 11, color: A.c.ink60 }}>Temps</div></div>
            <div><div style={{ fontFamily: A.font.display, fontSize: 18, fontWeight: 600 }}>5:34</div><div style={{ fontSize: 11, color: A.c.ink60 }}>Allure</div></div>
            <div><div style={{ fontFamily: A.font.display, fontSize: 18, fontWeight: 600 }}>148</div><div style={{ fontSize: 11, color: A.c.ink60 }}>FC moy</div></div>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', right: 14, top: 130, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {['Aa','😀','🎵','✨'].map(t => (
          <button key={t} style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(40,40,42,0.7)', border: 'none', color: '#fff', backdropFilter: 'blur(20px)', fontSize: 14, fontWeight: 600 }}>{t}</button>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 30, left: 16, right: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 44, borderRadius: 22, background: 'rgba(40,40,42,0.7)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', padding: '0 16px', color: '#fff', fontSize: 15 }}>Ta story</div>
        <PillBtn>Publier</PillBtn>
      </div>
    </Phone>
  );
}

function ScreenFeed() {
  return (
    <Phone label="23 Découvrir · Voir tout" bg={A.c.groupedBg}>
      <NavBar title="Activités" leading={<div style={{ color: A.c.blue, fontSize: 17, display: 'flex', gap: 4 }}>{SF.back}</div>}/>
      <div style={{ padding: '0 16px', display: 'flex', gap: 6 }}>
        <PillBtn>Amis · 12</PillBtn>
        <PillBtn secondary>Découvrir</PillBtn>
      </div>
      <div style={{ padding: '14px 16px 100px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FeedTile who="Lucas Robert" when="programme · 18:30" title="Sortie longue · Pâquier" sport="🏃" km="14" tone={A.c.blue}/>
        <FeedTile who="Sara Martin" when="EN COURS · live" title="Tour du lac · vélo" sport="🚴" km="42" tone="#ff375f" live/>
        <FeedTile who="Tom Brillant" when="programme · ce soir 20h" title="Nage open water" sport="🏊" km="2" tone="#5ac8fa"/>
      </div>
      <TabBar active="discover"/>
    </Phone>
  );
}
function FeedTile({ who, when, title, sport, km, tone, live }) {
  return (
    <div style={{ borderRadius: 18, background: A.c.cell, overflow: 'hidden' }}>
      <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: tone, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>{who.split(' ').map(s=>s[0]).join('')}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.4 }}>{who}</div>
          <div style={{ fontSize: 13, color: live ? A.c.sysGreen : A.c.ink60 }}>{when}</div>
        </div>
        {live && <div style={{ width: 8, height: 8, borderRadius: 4, background: A.c.sysGreen }}/>}
      </div>
      <div style={{ height: 130, position: 'relative' }}><MiniMap/>
        <div style={{ position: 'absolute', left: 14, bottom: 14, color: '#1d1d1f' }}>
          <span style={{ fontSize: 22 }}>{sport}</span>{' '}
          <span style={{ fontFamily: A.font.display, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>{km}</span>{' '}
          <span style={{ fontSize: 13 }}>km</span>
        </div>
      </div>
      <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `0.5px solid ${A.c.sep}` }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
        <PillBtn>{live ? 'Suivre' : 'Rejoindre'}</PillBtn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// APP ICON — résume la marque (carte + pin signature + trail)
// ─────────────────────────────────────────────
function AppIconMark({ size = 1024 }) {
  const r = size * 0.225; // iOS continuous-corner radius (squircle approximation)
  return (
    <div style={{
      width: size, height: size, borderRadius: r, overflow: 'hidden', position: 'relative',
      background: `linear-gradient(160deg, #4A9BFF 0%, ${A.c.blue} 38%, ${A.c.blueDark} 100%)`,
      boxShadow: size > 200 ? '0 30px 60px -20px rgba(0,102,204,0.4), 0 0 0 1px rgba(0,0,0,0.04)' : 'none',
    }}>
      {/* subtle Apple-style top sheen */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 45%)' }}/>
      {/* abstract map grid — straight + curve roads, like Apple Maps icon */}
      <svg viewBox="0 0 1024 1024" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {/* faint contour rings (terrain) */}
        <circle cx="512" cy="560" r="320" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2"/>
        <circle cx="512" cy="560" r="240" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="2"/>
        <circle cx="512" cy="560" r="160" fill="none" stroke="rgba(255,255,255,0.11)" strokeWidth="2"/>
        {/* trail / route — the runner's path, wraps under the pin */}
        <path d="M 120 820 C 240 760, 280 640, 380 600 S 580 660, 640 540 S 760 380, 900 320"
          fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="42" strokeLinecap="round" strokeDasharray="0,0"/>
        <path d="M 120 820 C 240 760, 280 640, 380 600 S 580 660, 640 540 S 760 380, 900 320"
          fill="none" stroke="#fff" strokeWidth="20" strokeLinecap="round" strokeDasharray="46 32"/>
        {/* start dot */}
        <circle cx="120" cy="820" r="22" fill="#fff"/>
        <circle cx="120" cy="820" r="10" fill={A.c.blue}/>
        {/* finish flag dot */}
        <circle cx="900" cy="320" r="22" fill="#fff"/>
        <circle cx="900" cy="320" r="10" fill="#ff3b30"/>
      </svg>
      {/* AVATAR PIN — the signature (centered) */}
      <div style={{
        position: 'absolute', left: '50%', top: '49%', transform: 'translate(-50%, -50%)',
        filter: 'drop-shadow(0 18px 30px rgba(0,0,0,0.32))',
      }}>
        <svg width={size * 0.46} height={size * 0.55} viewBox="0 0 460 550">
          {/* tail */}
          <path d="M 230 550 L 130 380 A 130 130 0 1 1 330 380 Z" fill="#fff"/>
          {/* avatar disc */}
          <circle cx="230" cy="220" r="160" fill={A.c.blue}/>
          {/* runner glyph inside the disc — abstract silhouette */}
          <g fill="#fff">
            {/* head */}
            <circle cx="245" cy="138" r="26"/>
            {/* torso + legs simplified, dynamic running pose */}
            <path d="M 178 248 L 225 198 L 268 220 L 296 264 L 322 246 L 332 268 L 295 296 L 258 270 L 248 312 L 280 350 L 268 372 L 226 332 L 212 286 L 178 286 Z"/>
            {/* trailing arm */}
            <path d="M 188 232 L 162 212 L 154 230 L 178 252 Z"/>
          </g>
        </svg>
      </div>
    </div>
  );
}

function ScreenAppIcon() {
  return (
    <Phone label="25 App Icon" bg={A.c.groupedBg}>
      <div style={{ padding: '0 24px' }}>
        <div style={{ fontFamily: A.font.display, fontSize: 32, fontWeight: 700, letterSpacing: -0.6 }}>App Icon</div>
        <div style={{ fontSize: 14, color: A.c.ink60, marginTop: 4 }}>Carte · Trail · Pin signature · Action Blue</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
        <div style={{ width: 220, height: 220 }}>
          <AppIconMark size={220}/>
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        <div style={{ padding: '0 24px 8px', fontSize: 11, fontWeight: 600, letterSpacing: 0.6, color: A.c.ink60, textTransform: 'uppercase' }}>TAILLES</div>
        <div style={{ background: A.c.cell, margin: '0 16px', borderRadius: 14, padding: '20px 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: 12 }}>
          {[120, 80, 60, 40].map((s) => (
            <div key={s} style={{ textAlign: 'center' }}>
              <AppIconMark size={s}/>
              <div style={{ fontSize: 10, color: A.c.ink60, marginTop: 8, fontFamily: A.font.text }}>{s}px</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ margin: '14px 16px 0', background: 'linear-gradient(135deg, #c8d4e0, #a3b3c4)', borderRadius: 18, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <AppIconMark size={56}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', letterSpacing: -0.3 }}>RunConnect</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Aperçu sur écran d'accueil</div>
        </div>
      </div>
    </Phone>
  );
}

Object.assign(window, {
  ScreenAuthSplash, ScreenSignIn, ScreenCreate,
  ScreenDiscover, ScreenSessionDetail, ScreenLive, ScreenRoute,
  ScreenStep1, ScreenStep2, ScreenStep3, ScreenStep4, ScreenStep5,
  ScreenSessions, ScreenAthletePlan, ScreenCoachBuild, ScreenCoachAthlete,
  ScreenMessages, ScreenConv, ScreenClub,
  ScreenProfile, ScreenSettings, ScreenRecord, ScreenStory, ScreenFeed,
  ScreenAppIcon, AppIconMark,
});
