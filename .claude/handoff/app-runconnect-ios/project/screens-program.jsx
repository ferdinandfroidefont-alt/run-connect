// PROGRAMMER UNE SÉANCE — flux 5 étapes

function StepHeader({ step, total = 5, title, sub }) {
  return (
    <div style={{ padding: '70px 20px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <button style={iconBtn}><IconChevL/></button>
        <div style={{ fontSize: 13, fontWeight: 700, color: RC.c.ink3 }}>Étape {step}/{total}</div>
        <button style={iconBtn}><IconClose/></button>
      </div>
      {/* Progress segments */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < step ? RC.c.fire : RC.c.line }}/>
        ))}
      </div>
      <Title size={32}>{title}</Title>
      {sub && <div style={{ fontSize: 14, color: RC.c.ink3, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

const cta = { position: 'absolute', left: 20, right: 20, bottom: 50, height: 56, borderRadius: 16, border: 'none', background: RC.c.fire, color: '#fff', fontFamily: RC.font.display, fontWeight: 700, fontSize: 16, cursor: 'pointer' };

// Step 1 — Lieu
function ScreenStep1Place() {
  return (
    <Phone label="08 Programmer · 1 Lieu" bg="#fff">
      <StepHeader step={1} title="Où ça se passe ?" sub="Cherche un lieu ou pose un point sur la carte."/>
      <div style={{ padding: '0 20px' }}>
        <div style={{ height: 54, borderRadius: 14, border: `1.5px solid ${RC.c.line}`, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10, background: '#FAFAF7' }}>
          <IconSearch size={16}/>
          <span style={{ color: RC.c.ink3, fontSize: 15 }}>Cherche un parc, une rue...</span>
        </div>
      </div>
      {/* Map preview */}
      <div style={{ position: 'absolute', left: 20, right: 20, top: 320, height: 280, borderRadius: 22, overflow: 'hidden', border: `1px solid ${RC.c.line}` }}>
        <MapBg/>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -100%)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: RC.c.fire, border: '4px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}/>
        </div>
        <div style={{ position: 'absolute', bottom: 10, left: 10, padding: '8px 14px', borderRadius: 999, background: '#fff', fontSize: 13, fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>Pâquier · Annecy</div>
        <button style={{ ...mapBtn, position: 'absolute', right: 10, top: 10 }}><IconLocate size={16}/></button>
      </div>
      <div style={{ position: 'absolute', left: 20, right: 20, top: 230, display: 'flex', gap: 8 }}>
        <Chip active icon={<IconLocate size={12}/>}>Ma position</Chip>
        <Chip>Centrer la carte</Chip>
      </div>
      <button style={cta}>Continuer</button>
    </Phone>
  );
}

// Step 2 — Sport
function ScreenStep2Sport() {
  const sports = [
    { e: '🏃', name: 'Course', sub: 'Trail · route' },
    { e: '🚴', name: 'Vélo', sub: 'Route · gravel · MTB' },
    { e: '🏊', name: 'Natation', sub: 'Piscine · open water' },
    { e: '🥾', name: 'Randonnée', sub: 'Marche · trek' },
    { e: '⛷️', name: 'Ski', sub: 'Alpin · rando' },
    { e: '🧘', name: 'Yoga', sub: 'Étirements · mobilité' },
  ];
  return (
    <Phone label="09 Programmer · 2 Sport" bg="#fff">
      <StepHeader step={2} title="Quel sport ?" sub="On adapte les blocs et l'allure en conséquence."/>
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {sports.map((s, i) => (
          <div key={s.name} style={{
            padding: 16, borderRadius: 18,
            border: i===0 ? `2px solid ${RC.c.fire}` : `1.5px solid ${RC.c.line}`,
            background: i===0 ? '#FFF6F2' : '#fff', position: 'relative',
          }}>
            <div style={{ fontSize: 28 }}>{s.e}</div>
            <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 16, marginTop: 8 }}>{s.name}</div>
            <div style={{ fontSize: 12, color: RC.c.ink3, marginTop: 2 }}>{s.sub}</div>
            {i===0 && <div style={{ position: 'absolute', top: 12, right: 12, width: 22, height: 22, borderRadius: 11, background: RC.c.fire, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCheck size={12}/></div>}
          </div>
        ))}
      </div>
      <button style={cta}>Continuer</button>
    </Phone>
  );
}

// Step 3 — Date & heure
function ScreenStep3Time() {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const dates = [12, 13, 14, 15, 16, 17, 18];
  return (
    <Phone label="10 Programmer · 3 Date" bg="#fff">
      <StepHeader step={3} title="Quand ?" sub="Choisis une date et une heure de départ."/>
      {/* Calendar strip */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 18 }}>Mai 2026</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={{ ...iconBtn, width: 36, height: 36 }}><IconChevL size={14}/></button>
            <button style={{ ...iconBtn, width: 36, height: 36 }}><IconChevR size={14}/></button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {dates.map((d, i) => (
            <div key={i} style={{
              height: 64, borderRadius: 14, position: 'relative',
              background: i===0 ? RC.c.ink : '#FAFAF7',
              color: i===0 ? '#fff' : RC.c.ink,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.6 }}>{days[i]}</div>
              <div style={{ fontFamily: RC.font.display, fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>{d}</div>
            </div>
          ))}
        </div>
        {/* Time wheel */}
        <div style={{ marginTop: 24, padding: 18, borderRadius: 18, background: '#FAFAF7', border: `1.5px solid ${RC.c.line}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: RC.c.ink3, letterSpacing: 1, textTransform: 'uppercase' }}>Heure de départ</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ fontFamily: RC.font.display, fontSize: 56, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1 }}>18:30</div>
            <div style={{ fontSize: 13, color: RC.c.ink3, fontWeight: 600 }}>Mardi 12 mai</div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            {['07:00', '12:00', '18:30', '20:00'].map((t, i) => (
              <div key={t} style={{
                padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                background: i===2 ? RC.c.fire : '#fff',
                color: i===2 ? '#fff' : RC.c.ink2,
                border: i===2 ? 'none' : `1px solid ${RC.c.line}`,
              }}>{t}</div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 16, background: '#FFF6F2', display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: RC.c.fire, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>⏱</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Durée estimée · 1h 18</div>
            <div style={{ fontSize: 12, color: RC.c.ink3 }}>14 km à 5:30/km — basé sur tes records</div>
          </div>
        </div>
      </div>
      <button style={cta}>Continuer</button>
    </Phone>
  );
}

// Step 4 — Détails (blocs + photos + visibilité)
function ScreenStep4Details() {
  return (
    <Phone label="11 Programmer · 4 Détails" bg="#fff">
      <StepHeader step={4} title="Compose ta séance" sub="Glisse les blocs pour structurer l'effort."/>
      <div style={{ padding: '0 20px' }}>
        {/* Workout schema mini */}
        <div style={{ padding: 14, borderRadius: 18, background: RC.c.bgDeep, border: `1px solid ${RC.c.line}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: RC.c.ink3 }}>Schéma · 4 blocs</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: RC.c.fire }}>Modifier →</div>
          </div>
          {/* Schema bars by zone */}
          <svg viewBox="0 0 320 80" style={{ width: '100%', height: 80 }}>
            <defs>
              <linearGradient id="z1" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#A8C89A"/><stop offset="1" stopColor="#7AA866"/></linearGradient>
              <linearGradient id="z3" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FFD089"/><stop offset="1" stopColor="#E5A332"/></linearGradient>
              <linearGradient id="z5" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FF7A4A"/><stop offset="1" stopColor="#FF4D1A"/></linearGradient>
            </defs>
            <rect x="0" y="50" width="50" height="30" rx="3" fill="url(#z1)"/>
            <rect x="55" y="20" width="35" height="60" rx="3" fill="url(#z5)"/>
            <rect x="95" y="40" width="20" height="40" rx="3" fill="url(#z3)"/>
            <rect x="120" y="20" width="35" height="60" rx="3" fill="url(#z5)"/>
            <rect x="160" y="40" width="20" height="40" rx="3" fill="url(#z3)"/>
            <rect x="185" y="20" width="35" height="60" rx="3" fill="url(#z5)"/>
            <rect x="225" y="40" width="20" height="40" rx="3" fill="url(#z3)"/>
            <rect x="250" y="55" width="70" height="25" rx="3" fill="url(#z1)"/>
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 600, color: RC.c.ink3, marginTop: 4 }}>
            <span>Échauffement</span><span>3 × 1km @ Z5</span><span>Retour</span>
          </div>
        </div>
        {/* Photo + itinéraire row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
          <div style={{ height: 96, borderRadius: 14, border: `1.5px dashed ${RC.c.line}`, background: '#FAFAF7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <IconCamera size={20}/>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Ajouter photo</div>
          </div>
          <div style={{ height: 96, borderRadius: 14, padding: 12, background: RC.c.bgDeep, position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: RC.c.ink3, letterSpacing: 0.5, textTransform: 'uppercase' }}>Itinéraire lié</div>
            <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 14, marginTop: 4 }}>Tour du Pâquier</div>
            <div style={{ fontSize: 11, color: RC.c.ink3 }}>14,2 km</div>
            <svg viewBox="0 0 100 30" style={{ position: 'absolute', right: 8, bottom: 8, width: 80, height: 30 }}>
              <path d="M5 20 Q 20 5 35 18 T 65 12 T 95 8" stroke={RC.c.fire} strokeWidth="2" fill="none"/>
            </svg>
          </div>
        </div>
        {/* Visibility */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: RC.c.ink3, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 }}>Visibilité</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, padding: 14, borderRadius: 14, border: `2px solid ${RC.c.fire}`, background: '#FFF6F2', position: 'relative' }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>👥</div>
              <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 14 }}>Mes amis</div>
              <div style={{ fontSize: 11, color: RC.c.ink3 }}>Visible par 124 amis</div>
            </div>
            <div style={{ flex: 1, padding: 14, borderRadius: 14, border: `1.5px solid ${RC.c.line}`, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 700, color: RC.c.fire, padding: '2px 6px', borderRadius: 4, background: '#FFF6F2' }}>PREMIUM</div>
              <div style={{ fontSize: 18, marginBottom: 4 }}>🌍</div>
              <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 14 }}>Tout le monde</div>
              <div style={{ fontSize: 11, color: RC.c.ink3 }}>Visible globalement</div>
            </div>
          </div>
        </div>
      </div>
      <button style={cta}>Continuer</button>
    </Phone>
  );
}

// Step 5 — Confirmation + booster
function ScreenStep5Boost() {
  return (
    <Phone label="12 Programmer · 5 Booster" bg={RC.c.bg}>
      <StepHeader step={5} title="Tout est prêt." sub="Booste pour multiplier ta visibilité."/>
      <div style={{ padding: '0 20px' }}>
        {/* Big card recap */}
        <div style={{ padding: 18, borderRadius: 22, background: RC.c.ink, color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${RC.c.fire}aa, transparent 70%)` }}/>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, opacity: 0.7, textTransform: 'uppercase' }}>Sortie longue · 14 km</div>
          <div style={{ fontFamily: RC.font.display, fontSize: 30, fontWeight: 700, letterSpacing: -1, marginTop: 6, lineHeight: 1.05 }}>Mardi · 18:30<br/>Pâquier, Annecy</div>
          <div style={{ display: 'flex', gap: 18, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            <Stat value="14" unit="km" label="Distance" dark/>
            <Stat value="1:18" label="Durée" dark/>
            <Stat value="124" label="Amis" dark/>
          </div>
        </div>
        {/* Booster */}
        <div style={{ marginTop: 18, padding: 18, borderRadius: 22, background: '#fff', border: `2px solid ${RC.c.fire}`, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: RC.c.fire, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconBolt size={22}/></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 17 }}>Booster la séance</div>
              <div style={{ fontSize: 12, color: RC.c.ink3, marginTop: 2 }}>Visible par tous, en haut de la carte</div>
            </div>
          </div>
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: '#FFF6F2', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 16 }}>📺</div>
            <div style={{ flex: 1, fontSize: 12, color: RC.c.ink2 }}>Regarder une vidéo de 15s, ou <b style={{ color: RC.c.fire }}>passer en Premium</b></div>
          </div>
        </div>
      </div>
      <button style={cta}>Programmer & booster</button>
    </Phone>
  );
}

Object.assign(window, { ScreenStep1Place, ScreenStep2Sport, ScreenStep3Time, ScreenStep4Details, ScreenStep5Boost });
