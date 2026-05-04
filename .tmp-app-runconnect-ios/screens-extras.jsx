// Profile detail extras: records page + create story + extras

function ScreenRecordEdit() {
  return (
    <Phone label="21 Profil · Ajouter record" bg="#fff">
      <div style={{ padding: '70px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button style={iconBtn}><IconClose/></button>
          <Title size={18}>Ajouter un record</Title>
          <button style={{ ...iconBtn, background: RC.c.fire, border: 'none', color: '#fff' }}><IconCheck/></button>
        </div>
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: RC.c.ink3, letterSpacing: 0.6, textTransform: 'uppercase' }}>Sport</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {['🏃','🚴','🏊','🥾'].map((e, i) => (
              <div key={e} style={{ width: 56, height: 56, borderRadius: 14, background: i===0 ? RC.c.ink : '#FAFAF7', color: i===0?'#fff':RC.c.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, border: i===0?'none':`1.5px solid ${RC.c.line}` }}>{e}</div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: RC.c.ink3, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 }}>Distance</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['1 km', '5 km', '10 km', 'Semi', 'Marathon', 'Autre'].map((d, i) => (
              <div key={d} style={{
                padding: '10px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700,
                background: i===2 ? RC.c.fire : '#FAFAF7', color: i===2?'#fff':RC.c.ink,
                border: i===2?'none':`1px solid ${RC.c.line}`,
              }}>{d}</div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 22, padding: 18, borderRadius: 18, background: '#FAFAF7', border: `1.5px solid ${RC.c.line}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: RC.c.ink3, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 }}>Temps</div>
          <div style={{ fontFamily: RC.font.display, fontSize: 56, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            00<span style={{ fontSize: 20, fontWeight: 500, color: RC.c.ink3 }}>h</span>
            <span style={{ color: RC.c.fire }}>41</span><span style={{ fontSize: 20, fontWeight: 500, color: RC.c.ink3 }}>m</span>
            18<span style={{ fontSize: 20, fontWeight: 500, color: RC.c.ink3 }}>s</span>
          </div>
          <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: RC.c.ink3, letterSpacing: 0.6, textTransform: 'uppercase' }}>Allure calculée</div>
              <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 18 }}>4:08 /km</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: RC.c.fire, padding: '4px 10px', borderRadius: 999, background: '#FFF6F2' }}>NOUVEAU PR</div>
          </div>
        </div>
      </div>
    </Phone>
  );
}

function ScreenCreateStory() {
  return (
    <Phone label="22 Profil · Créer story" bg="#0E0E0F" statusDark>
      {/* Photo backdrop */}
      <Photo tone="dusk" style={{ position: 'absolute', inset: 0 }}/>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.5) 100%)' }}/>
      <div style={{ position: 'absolute', top: 60, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
        <button style={{ ...iconBtn, background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', backdropFilter: 'blur(20px)' }}><IconClose/></button>
        <button style={{ height: 44, padding: '0 16px', borderRadius: 22, background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', backdropFilter: 'blur(20px)', fontWeight: 600, fontSize: 13 }}>Galerie</button>
      </div>
      {/* Centered session card preview */}
      <div style={{ position: 'absolute', top: 220, left: 30, right: 30, padding: 22, borderRadius: 26, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', boxShadow: '0 30px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Avatar name="Ferdinand F" tone="fire" size={36}/>
          <div>
            <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 14 }}>Ferdinand F.</div>
            <div style={{ fontSize: 11, color: RC.c.ink3 }}>il y a 1h · Annecy</div>
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: RC.c.fire }}>SORTIE LONGUE · TERMINÉE</div>
        <Title size={28} style={{ marginTop: 4, lineHeight: 1.05 }}>14 km autour<br/>du lac d'Annecy</Title>
        <div style={{ display: 'flex', gap: 14, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${RC.c.line}` }}>
          <Stat value="1:18" label="Temps"/>
          <Stat value="5:34" unit="/km" label="Allure"/>
          <Stat value="148" unit="bpm" label="FC moy"/>
        </div>
        <div style={{ marginTop: 14, height: 70, borderRadius: 12, background: RC.c.bgDeep, position: 'relative', overflow: 'hidden' }}>
          <MapBg/>
          <RouteLine d="M20 50 Q60 30 110 40 T200 30 T300 50" color={RC.c.fire}/>
        </div>
      </div>
      {/* Story tools right */}
      <div style={{ position: 'absolute', right: 14, top: 130, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {['Aa', '😀', '🎵', '✨'].map(t => (
          <button key={t} style={{ width: 44, height: 44, borderRadius: 22, background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', backdropFilter: 'blur(20px)', fontSize: 16, fontWeight: 700 }}>{t}</button>
        ))}
      </div>
      {/* Bottom share row */}
      <div style={{ position: 'absolute', bottom: 30, left: 16, right: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 52, borderRadius: 26, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', padding: '0 16px', color: '#fff', fontSize: 14, fontWeight: 600 }}>Ta story</div>
        <button style={{ height: 52, padding: '0 22px', borderRadius: 26, background: RC.c.fire, color: '#fff', border: 'none', fontFamily: RC.font.display, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          Publier <IconArrowR size={16}/>
        </button>
      </div>
    </Phone>
  );
}

// Voir tout — fil d'activités amis
function ScreenFeedAll() {
  return (
    <Phone label="23 Accueil · Voir tout" bg={RC.c.bg}>
      <div style={{ padding: '70px 20px 100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button style={iconBtn}><IconChevL/></button>
          <button style={iconBtn}><IconSearch size={16}/></button>
        </div>
        <Title size={32} style={{ marginTop: 16 }}>Le fil</Title>
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          <Chip active>Amis · 12</Chip>
          <Chip>Découvrir</Chip>
        </div>
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FeedCard who="Lucas Robert" tone="sky" when="programme une séance · 18:30" title="Sortie longue · Pâquier" sport="🏃" km="14"/>
          <FeedCard who="Sara Martin" tone="rose" when="EN COURS · live" title="Tour du lac · vélo" sport="🚴" km="42" live/>
          <FeedCard who="Tom Brillant" tone="live" when="programme une séance · ce soir 20h" title="Nage open water" sport="🏊" km="2"/>
        </div>
      </div>
      <TabBar active="home"/>
    </Phone>
  );
}

function FeedCard({ who, tone, when, title, sport, km, live }) {
  return (
    <div style={{ borderRadius: 20, background: '#fff', border: `1px solid ${RC.c.line}`, overflow: 'hidden' }}>
      <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name={who} tone={tone} size={40}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 14 }}>{who}</div>
          <div style={{ fontSize: 11, color: live ? RC.c.live : RC.c.ink3, fontWeight: live ? 700 : 500 }}>{when}</div>
        </div>
        {live && <LiveDot/>}
      </div>
      <div style={{ height: 130, position: 'relative' }}>
        <MapBg/>
        <RouteLine d="M20 80 Q90 50 160 70 T320 60 T380 50" color={live ? RC.c.live : RC.c.fire} glow/>
        <div style={{ position: 'absolute', left: 14, bottom: 14, display: 'flex', alignItems: 'baseline', gap: 4, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
          <span style={{ fontSize: 24 }}>{sport}</span>
          <span style={{ fontFamily: RC.font.display, fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>{km}</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>km</span>
        </div>
      </div>
      <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 16 }}>{title}</div>
        <button style={{ height: 36, padding: '0 14px', borderRadius: 18, background: live?RC.c.live:RC.c.fire, color: '#fff', border: 'none', fontWeight: 700, fontSize: 12 }}>{live ? 'Suivre' : 'Rejoindre'}</button>
      </div>
    </div>
  );
}

// Club profile
function ScreenClub() {
  return (
    <Phone label="24 Messages · Club" bg={RC.c.bg}>
      {/* Hero */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 240 }}>
        <Photo tone="forest" style={{ position: 'absolute', inset: 0 }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)' }}/>
        <div style={{ position: 'absolute', top: 60, left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }}>
          <button style={{ ...iconBtn, background: 'rgba(0,0,0,0.3)', border: 'none', color: '#fff', backdropFilter: 'blur(20px)' }}><IconChevL size={16}/></button>
          <button style={{ ...iconBtn, background: 'rgba(0,0,0,0.3)', border: 'none', color: '#fff', backdropFilter: 'blur(20px)' }}><IconMore size={16}/></button>
        </div>
        <div style={{ position: 'absolute', bottom: 18, left: 20, right: 20, color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, opacity: 0.8 }}>🏛 CLUB · 124 MEMBRES</div>
          <Title size={32} style={{ color: '#fff', marginTop: 6 }}>Annecy Runners</Title>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 256, left: 0, right: 0, padding: '0 20px' }}>
        {/* Code */}
        <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: `1.5px solid ${RC.c.line}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 22 }}>🔑</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: RC.c.ink3, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>Code d'accès</div>
            <div style={{ fontFamily: RC.font.mono, fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>ANC-RUN-26</div>
          </div>
          <button style={{ ...iconBtn, width: 36, height: 36 }}><IconShare size={14}/></button>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button style={{ flex: 1, height: 48, borderRadius: 14, background: RC.c.ink, color: '#fff', border: 'none', fontFamily: RC.font.display, fontWeight: 700, fontSize: 13 }}>Inviter</button>
          <button style={{ flex: 1, height: 48, borderRadius: 14, background: '#fff', color: RC.c.ink, border: `1.5px solid ${RC.c.line}`, fontWeight: 700, fontSize: 13 }}>Conversation</button>
        </div>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: RC.c.ink3, marginBottom: 10 }}>Membres récents · 124</div>
          <div style={{ display: 'flex', gap: -8, marginLeft: 8 }}>
            {['fire','sky','rose','live','moss','sun','plum'].map((t, i) => (
              <div key={i} style={{ marginLeft: -8, position: 'relative', zIndex: 10-i }}>
                <Avatar name={'X'+i} tone={t} size={42} ring ringColor="#fff"/>
              </div>
            ))}
            <div style={{ marginLeft: -8, width: 42, height: 42, borderRadius: 21, background: RC.c.ink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2.5px solid #fff', fontSize: 11, fontWeight: 700 }}>+117</div>
          </div>
        </div>
      </div>
    </Phone>
  );
}

Object.assign(window, { ScreenRecordEdit, ScreenCreateStory, ScreenFeedAll, FeedCard, ScreenClub });
