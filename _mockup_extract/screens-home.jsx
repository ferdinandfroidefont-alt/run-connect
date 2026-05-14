// HOME / MAP screens — the hero of the app

function ScreenMapPlanning() {
  return (
    <Phone label="04 Accueil · Carte planification" bg={RC.c.bg}>
      <MapBg />
      {/* Route demonstration */}
      <RouteLine d="M40 320 Q90 280 130 300 T220 290 T310 260 T370 240" color={RC.c.fire} glow/>
      {/* Pins */}
      <MapPin x={130} y={300} name="Lucas R" tone="fire" sport="🏃"/>
      <MapPin x={220} y={290} name="Sara M" tone="live" sport="🚴" live/>
      <MapPin x={310} y={260} name="Tom B" tone="sky" sport="🏊"/>
      <MapPin x={70} y={420} name="Eli K" tone="rose" sport="🏃"/>
      <MapPin x={290} y={460} name="Max V" tone="moss" sport="🥾"/>

      {/* Top header floating */}
      <div style={{ position: 'absolute', top: 60, left: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: '#fff', height: 44, borderRadius: 22, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.08)' }}>
            <IconSearch size={16}/>
            <span style={{ fontSize: 14, color: RC.c.ink3 }}>Annecy, lac · 12 amis</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={iconBtnSm}><IconBell size={18}/><span style={dotBadge}/></button>
          <button style={iconBtnSm}><IconSettings size={18}/></button>
        </div>
      </div>

      {/* Filter chips row */}
      <div style={{ position: 'absolute', top: 116, left: 0, right: 0, padding: '0 16px', display: 'flex', gap: 8, overflowX: 'hidden', zIndex: 10 }}>
        <Chip active icon={<IconBolt size={12}/>}>Tous</Chip>
        <Chip>🏃 Course</Chip>
        <Chip>🚴 Vélo</Chip>
        <Chip>🏊 Nage</Chip>
        <Chip>🥾 Rando</Chip>
      </div>

      {/* Map controls right side */}
      <div style={{ position: 'absolute', right: 14, top: 280, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
        <button style={mapBtn}><IconLayers size={18}/></button>
        <button style={mapBtn}><IconLocate size={18}/></button>
      </div>

      {/* Bottom slide-up panel — fil d'activités */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 290,
        background: RC.c.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        boxShadow: '0 -10px 30px rgba(0,0,0,0.08)', zIndex: 5, padding: '12px 0 0',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: RC.c.line, margin: '0 auto 14px' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 20px', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 20, letterSpacing: -0.5 }}>Aujourd'hui · 5 séances</div>
            <div style={{ fontSize: 12, color: RC.c.ink3, marginTop: 2 }}>Près de toi à Annecy</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: RC.c.fire }}>Voir tout</div>
        </div>
        {/* Horizontal cards */}
        <div style={{ display: 'flex', gap: 12, padding: '0 20px', overflowX: 'hidden' }}>
          <SessionCardMini title="Sortie longue" who="Lucas R · Sara M +3" time="18:30" tone="fire" sport="🏃" km="14"/>
          <SessionCardMini title="Tour du lac" who="Sara M · solo" time="19:00" tone="live" sport="🚴" km="42" live/>
          <SessionCardMini title="Nage open water" who="Tom B" time="20:00" tone="sky" sport="🏊" km="2"/>
        </div>
        {/* Programmer FAB */}
        <button style={{
          position: 'absolute', right: 20, top: -28, height: 56, padding: '0 22px',
          borderRadius: 28, border: 'none', cursor: 'pointer',
          background: RC.c.fire, color: '#fff',
          fontFamily: RC.font.display, fontWeight: 700, fontSize: 15, letterSpacing: -0.2,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 12px 24px rgba(255,77,26,0.4)',
        }}>
          <IconPlus size={18}/>Programmer
        </button>
      </div>
      <TabBar active="home"/>
    </Phone>
  );
}

const iconBtnSm = {
  position: 'relative',
  width: 44, height: 44, borderRadius: 22, border: 'none', cursor: 'pointer',
  background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
};
const dotBadge = { position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, background: RC.c.fire };
const mapBtn = {
  width: 44, height: 44, borderRadius: 14, border: 'none', cursor: 'pointer',
  background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

function SessionCardMini({ title, who, time, tone, sport, km, live }) {
  return (
    <div style={{
      width: 220, flexShrink: 0, borderRadius: 18, background: '#fff',
      border: `1px solid ${RC.c.line}`, padding: 14, position: 'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: RC.c.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{sport}</div>
        {live && <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: RC.c.live, textTransform: 'uppercase', letterSpacing: 0.5 }}><LiveDot size={6}/>Live</div>}
        {!live && <div style={{ fontSize: 12, fontWeight: 700, color: RC.c.ink3 }}>{time}</div>}
      </div>
      <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 16, marginTop: 12, letterSpacing: -0.3 }}>{title}</div>
      <div style={{ fontSize: 12, color: RC.c.ink3, marginTop: 4 }}>{who}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${RC.c.line}` }}>
        <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 18, letterSpacing: -0.5 }}>{km}<span style={{ fontSize: 11, color: RC.c.ink3, fontWeight: 500, marginLeft: 2 }}>km</span></div>
        <div style={{ fontSize: 12, fontWeight: 700, color: RC.c.fire }}>Rejoindre →</div>
      </div>
    </div>
  );
}

// ─── Détail séance (sheet style)
function ScreenSessionDetail() {
  return (
    <Phone label="05 Accueil · Détail séance" bg={RC.c.bg}>
      <MapBg />
      <RouteLine d="M40 100 Q90 80 130 110 T220 100 T310 70 T370 50" color={RC.c.fire} glow/>
      <div style={{ position: 'absolute', top: 60, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
        <button style={iconBtnSm}><IconChevL size={18}/></button>
        <button style={iconBtnSm}><IconShare size={16}/></button>
      </div>
      {/* Sheet */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 240, background: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: '14px 20px 0', overflow: 'hidden' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: RC.c.line, margin: '0 auto 16px' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <Avatar name="Lucas R" tone="fire" size={48}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: RC.c.ink3 }}>Organisé par</div>
            <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 16 }}>Lucas Robert</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: RC.c.bgDeep, color: RC.c.ink2 }}>+ 3 amis</div>
        </div>
        <Title size={28}>Sortie longue<br/>autour du lac</Title>
        <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingBottom: 16, borderBottom: `1px solid ${RC.c.line}` }}>
          <Stat value="14" unit="km" label="Distance"/>
          <Stat value="1:30" label="Durée"/>
          <Stat value="5:30" unit="/km" label="Allure"/>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: RC.c.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📍</div>
            <div><div style={{ fontSize: 11, color: RC.c.ink3, fontWeight: 600 }}>LIEU</div><div style={{ fontSize: 14, fontWeight: 600 }}>Pâquier · Annecy</div></div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: RC.c.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🕡</div>
            <div><div style={{ fontSize: 11, color: RC.c.ink3, fontWeight: 600 }}>DÉPART</div><div style={{ fontSize: 14, fontWeight: 600 }}>Mardi 12 mai · 18:30</div></div>
          </div>
        </div>
        <div style={{ position: 'absolute', left: 20, right: 20, bottom: 36, display: 'flex', gap: 10 }}>
          <button style={{ ...btnGhost, color: RC.c.ink, border: `1.5px solid ${RC.c.line}`, height: 52, fontSize: 14 }}>Question ?</button>
          <button style={{ ...btnPrimary, height: 52, fontSize: 15 }}>Rejoindre la séance</button>
        </div>
      </div>
    </Phone>
  );
}

// ─── Suivi temps réel
function ScreenLiveTracking() {
  return (
    <Phone label="06 Accueil · Suivi live" bg="#0E0E0F" statusDark>
      <MapBg dark style={{ filter: 'brightness(0.85)' }}/>
      {/* live route trail */}
      <RouteLine d="M50 280 Q100 240 160 250 T260 220 T360 200" color={RC.c.live} glow/>
      <MapPin x={50} y={280} name="Tu" tone="fire" sport="🏃"/>
      <MapPin x={160} y={250} name="Lucas R" tone="live" sport="🏃" live/>
      <MapPin x={260} y={220} name="Sara M" tone="rose" sport="🏃" live/>
      <MapPin x={360} y={200} name="Eli K" tone="sky" sport="🏃" live/>

      {/* Top — live banner */}
      <div style={{ position: 'absolute', top: 60, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
        <div style={{ height: 44, padding: '0 14px', background: '#fff', borderRadius: 22, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
          <LiveDot/>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>SUIVI LIVE</span>
          <span style={{ fontSize: 13, color: RC.c.ink3, fontWeight: 500 }}>· 4 coureurs</span>
        </div>
        <button style={{ ...iconBtnSm, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)' }}><IconClose size={16} color="#fff"/></button>
      </div>

      {/* Center hero stat */}
      <div style={{ position: 'absolute', top: 360, left: 0, right: 0, textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, opacity: 0.6, textTransform: 'uppercase' }}>Sortie longue · 32:14</div>
        <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 78, lineHeight: 0.95, letterSpacing: -3, margin: '8px 0' }}>
          7,42<span style={{ fontSize: 22, opacity: 0.6, fontWeight: 500, marginLeft: 6 }}>km</span>
        </div>
        <div style={{ display: 'inline-flex', gap: 14, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
          <span><b style={{ color: '#fff' }}>5:24</b> /km</span>
          <span>·</span>
          <span><b style={{ color: '#fff' }}>148</b> bpm</span>
          <span>·</span>
          <span><b style={{ color: '#fff' }}>+82</b> m</span>
        </div>
      </div>

      {/* Bottom panel — runners list */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 240, background: '#15110D', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: '14px 0 0', color: '#fff' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 14px' }}/>
        <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 16 }}>Membres en course</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>EN DIRECT</div>
        </div>
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <RunnerLiveRow name="Lucas Robert" tone="fire" pace="5:18" km="7.81" lead/>
          <RunnerLiveRow name="Sara Martin" tone="rose" pace="5:24" km="7.62"/>
          <RunnerLiveRow name="Eli Klein" tone="sky" pace="5:36" km="7.20"/>
        </div>
      </div>
    </Phone>
  );
}

function RunnerLiveRow({ name, tone, pace, km, lead }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Avatar name={name} tone={tone} size={36}/>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{name} {lead && <span style={{ fontSize: 11, color: RC.c.live, marginLeft: 4, fontWeight: 700 }}>· TÊTE</span>}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{pace} /km</div>
      </div>
      <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 18, letterSpacing: -0.5 }}>{km}<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginLeft: 3, fontWeight: 500 }}>km</span></div>
    </div>
  );
}

// ─── Création d'itinéraire
function ScreenRouteBuilder() {
  return (
    <Phone label="07 Accueil · Itinéraire" bg={RC.c.bg}>
      <MapBg />
      <RouteLine d="M50 200 L120 220 L180 180 L240 240 L300 220 L350 280" color={RC.c.fire} glow/>
      {/* waypoints */}
      {[[50,200],[120,220],[180,180],[240,240],[300,220],[350,280]].map(([x,y], i) => (
        <div key={i} style={{ position: 'absolute', left: x-7, top: y-7, width: 14, height: 14, borderRadius: 7, background: '#fff', border: `3px solid ${RC.c.fire}`, boxShadow: '0 2px 6px rgba(0,0,0,0.2)', zIndex: 5 }}/>
      ))}
      <div style={{ position: 'absolute', top: 60, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <button style={iconBtnSm}><IconChevL size={18}/></button>
        <div style={{ background: '#fff', borderRadius: 999, padding: 4, display: 'flex', boxShadow: '0 4px 14px rgba(0,0,0,0.08)' }}>
          {['Guide', 'Manuel'].map((t, i) => (
            <div key={t} style={{ padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700, background: i===0 ? RC.c.ink : 'transparent', color: i===0 ? '#fff' : RC.c.ink3 }}>{t}</div>
          ))}
        </div>
        <button style={iconBtnSm}><IconMore size={18}/></button>
      </div>
      {/* Side controls */}
      <div style={{ position: 'absolute', right: 14, top: 200, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
        <button style={mapBtn}><IconLocate size={18}/></button>
        <button style={mapBtn}><IconLayers size={18}/></button>
        <button style={{ ...mapBtn, background: RC.c.ink, color: '#fff' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
      </div>
      {/* Bottom panel with elevation */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: '14px 20px 110px' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: RC.c.line, margin: '0 auto 14px' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: RC.c.ink3, letterSpacing: 1, textTransform: 'uppercase' }}>Itinéraire en cours</div>
            <Title size={22} style={{ marginTop: 4 }}>Annecy · Lac retour</Title>
          </div>
          <Chip>Brouillon</Chip>
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 14, paddingBottom: 14, borderBottom: `1px solid ${RC.c.line}` }}>
          <Stat value="14,2" unit="km" label="Distance"/>
          <Stat value="240" unit="m D+" label="Dénivelé"/>
          <Stat value="6" label="Étapes"/>
        </div>
        {/* Elevation chart */}
        <div style={{ marginTop: 14, height: 60 }}>
          <svg viewBox="0 0 320 60" style={{ width: '100%', height: '100%' }}>
            <defs><linearGradient id="elev" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={RC.c.fire} stopOpacity="0.4"/><stop offset="1" stopColor={RC.c.fire} stopOpacity="0"/></linearGradient></defs>
            <path d="M0 50 L20 40 L50 25 L80 32 L110 18 L150 22 L190 30 L230 14 L270 28 L300 35 L320 42 L320 60 L0 60 Z" fill="url(#elev)"/>
            <path d="M0 50 L20 40 L50 25 L80 32 L110 18 L150 22 L190 30 L230 14 L270 28 L300 35 L320 42" stroke={RC.c.fire} strokeWidth="2" fill="none"/>
          </svg>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button style={{ flex: 1, height: 50, borderRadius: 14, border: `1.5px solid ${RC.c.line}`, background: '#fff', fontFamily: RC.font.display, fontWeight: 700, fontSize: 14 }}>Sauver brouillon</button>
          <button style={{ flex: 1.4, height: 50, borderRadius: 14, border: 'none', background: RC.c.fire, color: '#fff', fontFamily: RC.font.display, fontWeight: 700, fontSize: 14 }}>Programmer une séance</button>
        </div>
      </div>
    </Phone>
  );
}

Object.assign(window, { ScreenMapPlanning, ScreenSessionDetail, ScreenLiveTracking, ScreenRouteBuilder, SessionCardMini, RunnerLiveRow });
