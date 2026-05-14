// AUTH screens — splash carrousel + sign in + create account

function ScreenAuthSplash() {
  return (
    <Phone label="01 Auth · Splash" statusDark={true} bg="#0E0E0F">
      {/* Hero photo 75% */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 640 }}>
        <Photo tone="dusk" style={{ position: 'absolute', inset: 0 }}>
          {/* Silhouette runner — abstract */}
          <svg viewBox="0 0 390 640" style={{ position: 'absolute', inset: 0 }} preserveAspectRatio="xMidYMid slice">
            <defs>
              <radialGradient id="sun" cx="78%" cy="35%" r="30%">
                <stop offset="0" stopColor="#FFD89A" stopOpacity="1"/>
                <stop offset="1" stopColor="#FFD89A" stopOpacity="0"/>
              </radialGradient>
            </defs>
            <rect width="390" height="640" fill="url(#sun)"/>
            {/* horizon hills */}
            <path d="M0 480 Q80 440 160 460 T320 450 L390 470 L390 640 L0 640 Z" fill="#1a0a05" opacity="0.85"/>
            <path d="M0 520 Q100 490 200 510 T390 500 L390 640 L0 640 Z" fill="#0a0503"/>
            {/* runner silhouette */}
            <g transform="translate(170 360)" fill="#0a0503">
              <ellipse cx="20" cy="-30" rx="11" ry="13"/>
              <path d="M5 -10 L40 -5 L48 25 L42 60 L48 95 L42 100 L36 65 L24 50 L18 90 L8 95 L14 55 L10 25 L0 10 Z"/>
              <path d="M40 0 L62 18 L70 14 L72 18 L60 25 L42 12"/>
              <path d="M10 5 L-15 -5 L-22 -2 L-21 4 L-12 5 L8 15"/>
            </g>
          </svg>
          {/* Top brand mark */}
          <div style={{ position: 'absolute', top: 70, left: 24, color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RCMark size={28}/>
              <div style={{ fontFamily: RC.font.display, fontWeight: 800, fontSize: 18, letterSpacing: -0.2 }}>RunConnect</div>
            </div>
          </div>
        </Photo>
        {/* tag overlay */}
        <div style={{ position: 'absolute', left: 24, right: 24, bottom: 100, color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.7, marginBottom: 8 }}>01 — La carte</div>
          <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 44, lineHeight: 0.95, letterSpacing: -2 }}>
            Trouve ta<br/>prochaine course<span style={{ color: RC.c.fire }}>.</span>
          </div>
        </div>
        {/* dots */}
        <div style={{ position: 'absolute', left: 24, bottom: 60, display: 'flex', gap: 6 }}>
          {[0,1,2,3].map(i => <div key={i} style={{ width: i===0?22:6, height: 6, borderRadius: 3, background: i===0?'#fff':'rgba(255,255,255,0.4)' }}/>)}
        </div>
      </div>
      {/* Bottom 25% */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 20px 100px', background: '#0E0E0F' }}>
        <button style={btnPrimary}>Créer un compte gratuitement</button>
        <button style={btnGhost}>J'ai déjà un compte</button>
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
          ou <span style={{ color: RC.c.fire, fontWeight: 600 }}>continuer en visiteur</span>
        </div>
      </div>
    </Phone>
  );
}

const btnPrimary = {
  width: '100%', height: 56, borderRadius: 16, border: 'none',
  background: RC.c.fire, color: '#fff',
  fontFamily: RC.font.display, fontWeight: 700, fontSize: 16, letterSpacing: -0.2,
  marginBottom: 10, cursor: 'pointer',
};
const btnGhost = {
  width: '100%', height: 56, borderRadius: 16,
  background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.2)',
  fontFamily: RC.font.display, fontWeight: 600, fontSize: 16, letterSpacing: -0.2,
  cursor: 'pointer',
};

function RCMark({ size = 28, color = '#fff' }) {
  // Simple iconic mark — running silhouette in fire-ring
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="15" fill={RC.c.fire}/>
      <path d="M11 22 L14 14 L19 16 L17 22 Z M19 11 a2 2 0 100-4 a2 2 0 000 4 M14 14 L20 13 L23 17 M11 19 L8 19" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ScreenSignIn() {
  return (
    <Phone label="02 Auth · Sign in" bg="#fff">
      <div style={{ padding: '70px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
          <button style={iconBtn}><IconChevL/></button>
        </div>
        <div style={{ marginTop: 32 }}>
          <Title size={42}>Bon retour<span style={{ color: RC.c.fire }}>.</span></Title>
          <div style={{ fontSize: 16, color: RC.c.ink3, marginTop: 8, lineHeight: 1.4 }}>Connecte-toi pour retrouver ta communauté.</div>
        </div>
        <div style={{ marginTop: 32 }}>
          <Field label="Email" value="ferdinand@runconnect.fr"/>
          <Field label="Mot de passe" value="••••••••••" trailing="Oublié ?"/>
        </div>
        <button style={{ ...btnPrimary, marginTop: 24 }}>Se connecter</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0' }}>
          <div style={{ flex: 1, height: 1, background: RC.c.line }}/>
          <div style={{ fontSize: 11, color: RC.c.ink3, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>ou</div>
          <div style={{ flex: 1, height: 1, background: RC.c.line }}/>
        </div>
        <SocialBtn label="Continuer avec Apple"
 icon={<svg width="18" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.94-3.08.45-1.09-.5-2.08-.5-3.24 0-1.45.62-2.21.44-3.07-.45C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.78.98-.05 1.92-.66 3.18-.74 1.51.12 2.65.72 3.4 1.81-3.04 1.83-2.55 5.83.36 7.07-.61 1.6-1.41 3.2-2.02 4.05M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>}/>
          <SocialBtn label="Continuer avec Google" icon={<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285f4" d="M22.6 12.2c0-.7 0-1.4-.2-2H12v3.8h6c-.3 1.4-1 2.6-2.3 3.4v2.8h3.7c2.1-2 3.3-4.9 3.3-8z"/><path fill="#34a853" d="M12 23c3 0 5.6-1 7.4-2.8l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H1.9v2.9C3.7 20.5 7.5 23 12 23z"/><path fill="#fbbc04" d="M5.7 13.9c-.2-.7-.3-1.4-.3-2.2s.1-1.5.3-2.2V6.6H1.9C1.1 8.2.7 10 .7 12s.4 3.8 1.2 5.4l3.8-3z"/><path fill="#ea4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.5 2 15 1 12 1 7.5 1 3.7 3.5 1.9 7.1l3.8 2.9c.9-2.6 3.4-4.6 6.3-4.6z"/></svg>}/>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 50, textAlign: 'center', fontSize: 14, color: RC.c.ink3 }}>
        Pas encore de compte ? <span style={{ color: RC.c.fire, fontWeight: 700 }}>Créer un compte</span>
      </div>
    </Phone>
  );
}

const iconBtn = {
  width: 44, height: 44, borderRadius: 22, border: `1px solid ${RC.c.line}`,
  background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
};

function Field({ label, value, trailing }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: RC.c.ink3 }}>{label}</div>
        {trailing && <div style={{ fontSize: 12, color: RC.c.fire, fontWeight: 600 }}>{trailing}</div>}
      </div>
      <div style={{
        height: 54, borderRadius: 14, border: `1.5px solid ${RC.c.line}`,
        background: '#FAFAF7', padding: '0 16px',
        display: 'flex', alignItems: 'center', fontSize: 16, color: RC.c.ink, fontWeight: 500,
      }}>{value}</div>
    </div>
  );
}

function SocialBtn({ label, icon }) {
  return (
    <button style={{
      width: '100%', height: 54, borderRadius: 14, marginBottom: 10,
      background: '#FAFAF7', border: `1.5px solid ${RC.c.line}`, color: RC.c.ink,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontFamily: RC.font.display, fontWeight: 600, fontSize: 15, cursor: 'pointer',
    }}>{icon}{label}</button>
  );
}

function ScreenCreateAccount() {
  return (
    <Phone label="03 Auth · Créer un compte" bg="#fff">
      <div style={{ padding: '70px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
          <button style={iconBtn}><IconChevL/></button>
          <div style={{ fontSize: 13, fontWeight: 600, color: RC.c.ink3 }}>Étape 2/3</div>
        </div>
        <div style={{ marginTop: 28 }}>
          <Title size={36}>Quelques infos<br/>pour démarrer<span style={{ color: RC.c.fire }}>.</span></Title>
        </div>
        {/* Photo upload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 28 }}>
          <div style={{
            width: 86, height: 86, borderRadius: 43, position: 'relative',
            background: `radial-gradient(120% 120% at 30% 25%, ${RC.c.fireGlow}, ${RC.c.fire})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            fontFamily: RC.font.display, fontSize: 32, fontWeight: 700,
          }}>
            FF
            <div style={{ position: 'absolute', right: -4, bottom: -4, width: 30, height: 30, borderRadius: 15, background: RC.c.ink, border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <IconCamera size={14}/>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 17 }}>Ajoute une photo</div>
            <div style={{ fontSize: 13, color: RC.c.ink3, marginTop: 4 }}>Tes amis te reconnaîtront sur la carte.</div>
          </div>
        </div>
        <div style={{ marginTop: 28 }}>
          <Field label="Prénom" value="Ferdinand"/>
          <Field label="Ville" value="Annecy, France"/>
          <Field label="Code de parrainage (optionnel)" value="LUCAS-3J"/>
        </div>
        {/* Premium gift banner */}
        <div style={{
          marginTop: 18, padding: '14px 16px', borderRadius: 16,
          background: RC.c.ink, color: '#fff', display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: RC.c.fire, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconBolt size={18}/>
          </div>
          <div style={{ flex: 1, fontSize: 13, lineHeight: 1.35 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>3 jours de Premium offerts</div>
            <div style={{ opacity: 0.7 }}>Code de Lucas · activé à la création</div>
          </div>
        </div>
        <button style={{ ...btnPrimary, position: 'absolute', left: 24, right: 24, bottom: 50, width: 'calc(100% - 48px)' }}>Continuer</button>
      </div>
    </Phone>
  );
}

Object.assign(window, { ScreenAuthSplash, ScreenSignIn, ScreenCreateAccount, RCMark });
