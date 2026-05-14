// MES SÉANCES + COACHING screens

function ScreenSessionsList() {
  return (
    <Phone label="13 Mes séances · Liste" bg={RC.c.bg}>
      <div style={{ padding: '70px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title size={36}>Mes séances</Title>
          <button style={iconBtn}><IconPlus/></button>
        </div>
        {/* Mini calendar week */}
        <div style={{ display: 'flex', gap: 6, marginTop: 24, overflowX: 'hidden' }}>
          {[
            { d: 'L', n: 5, e: '🏃', km: 8 },
            { d: 'M', n: 6, e: '😴', km: 0 },
            { d: 'M', n: 7, e: '🚴', km: 32 },
            { d: 'J', n: 8, e: '🏃', km: 6, today: true },
            { d: 'V', n: 9, e: '', km: 0 },
            { d: 'S', n: 10, e: '🏃', km: 14 },
            { d: 'D', n: 11, e: '🥾', km: 18 },
          ].map((d, i) => (
            <div key={i} style={{
              flex: 1, padding: 8, borderRadius: 14, textAlign: 'center',
              background: d.today ? RC.c.ink : '#fff',
              color: d.today ? '#fff' : RC.c.ink,
              border: d.today ? 'none' : `1px solid ${RC.c.line}`,
            }}>
              <div style={{ fontSize: 10, opacity: 0.6, fontWeight: 600 }}>{d.d}</div>
              <div style={{ fontFamily: RC.font.display, fontSize: 16, fontWeight: 700, margin: '2px 0' }}>{d.n}</div>
              <div style={{ fontSize: 14, height: 18 }}>{d.e}</div>
              <div style={{ fontSize: 9, opacity: 0.6, fontWeight: 600 }}>{d.km > 0 ? `${d.km}km` : '—'}</div>
            </div>
          ))}
        </div>
        {/* Filter */}
        <div style={{ display: 'flex', gap: 6, marginTop: 18 }}>
          <Chip active>À venir</Chip>
          <Chip>Réalisées</Chip>
          <Chip>Toutes</Chip>
        </div>
        {/* Cards */}
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SessionRow date="JEU · 8 MAI" time="18:30" sport="🏃" title="Sortie longue" detail="14 km · 1h 18 · avec 3 amis" tone="fire"/>
          <SessionRow date="SAM · 10 MAI" time="09:00" sport="🏃" title="Fractionné 10×400" detail="8 km · Z5 · solo" tone="ink"/>
          <SessionRow date="DIM · 11 MAI" time="08:30" sport="🥾" title="Rando Tournette" detail="18 km · +1100 D+ · groupe" tone="moss"/>
        </div>
      </div>
      <TabBar active="sessions"/>
    </Phone>
  );
}

function SessionRow({ date, time, sport, title, detail, tone }) {
  return (
    <div style={{ background: '#fff', borderRadius: 18, padding: 14, display: 'flex', gap: 12, alignItems: 'center', border: `1px solid ${RC.c.line}` }}>
      <div style={{
        width: 60, height: 60, borderRadius: 14, background: RC.c.bgDeep,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 22 }}>{sport}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: RC.c.ink3 }}>{date} · {time}</div>
        <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 16, marginTop: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: RC.c.ink3, marginTop: 2 }}>{detail}</div>
      </div>
      <IconChevR/>
    </div>
  );
}

// COACHING — Schéma Zwift-like
function ScreenCoachBuild() {
  return (
    <Phone label="15 Coaching · Schéma" bg={RC.c.bg}>
      <div style={{ padding: '70px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button style={iconBtn}><IconChevL/></button>
          <div style={{ background: '#fff', borderRadius: 999, padding: 4, display: 'flex' }}>
            {['Construire', 'Modèles'].map((t, i) => (
              <div key={t} style={{ padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: i===0 ? RC.c.ink : 'transparent', color: i===0 ? '#fff' : RC.c.ink3 }}>{t}</div>
            ))}
          </div>
          <button style={{ ...iconBtn, background: RC.c.fire, border: 'none', color: '#fff' }}><IconCheck/></button>
        </div>
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 26 }}>🔥</div>
            <input style={{
              flex: 1, height: 44, border: 'none', background: 'transparent',
              fontFamily: RC.font.display, fontWeight: 700, fontSize: 26, letterSpacing: -0.8,
              outline: 'none', color: RC.c.ink,
            }} defaultValue="Fractionné 10×400"/>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: RC.c.ink3, marginTop: 4, fontWeight: 600 }}>
            <span>8,2 km</span><span>·</span><span>~42 min</span><span>·</span><span style={{ color: RC.c.fire }}>RPE 8/10</span>
          </div>
        </div>
        {/* Big schema */}
        <div style={{ marginTop: 18, padding: 16, borderRadius: 20, background: '#0E0E0F', height: 180, position: 'relative', overflow: 'hidden' }}>
          {/* zone gridlines */}
          {[1,2,3,4,5].map(z => (
            <div key={z} style={{ position: 'absolute', left: 16, right: 16, bottom: 16 + (z-1)*28, height: 1, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{ position: 'absolute', left: 0, top: -8, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>Z{z}</div>
            </div>
          ))}
          <svg viewBox="0 0 320 140" style={{ position: 'absolute', left: 16, top: 16, right: 16, bottom: 16, width: 'calc(100% - 32px)', height: 'calc(100% - 32px)' }}>
            <defs>
              <linearGradient id="zg5" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FF7A4A"/><stop offset="1" stopColor="#D9370A"/></linearGradient>
              <linearGradient id="zg2" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#A8C89A"/><stop offset="1" stopColor="#7AA866"/></linearGradient>
              <linearGradient id="zg3" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FFD089"/><stop offset="1" stopColor="#E5A332"/></linearGradient>
            </defs>
            {/* warmup */}
            <rect x="0" y="84" width="40" height="56" rx="3" fill="url(#zg2)"/>
            {/* 10 intervals */}
            {Array.from({ length: 10 }).map((_, i) => (
              <g key={i}>
                <rect x={45 + i*23} y="14" width="14" height="126" rx="2" fill="url(#zg5)"/>
                {i < 9 && <rect x={59 + i*23} y="56" width="9" height="84" rx="2" fill="url(#zg3)"/>}
              </g>
            ))}
            <rect x="278" y="98" width="42" height="42" rx="3" fill="url(#zg2)"/>
          </svg>
          <div style={{ position: 'absolute', top: 14, right: 14, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>SCHÉMA · 12 BLOCS</div>
        </div>
        {/* Block palette */}
        <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
          {[
            { k: 'Continu', c: '#7AA866' },
            { k: 'Intervalle', c: RC.c.fire },
            { k: 'Permis', c: '#E5A332' },
            { k: 'Variation', c: '#3B5BFF' },
          ].map(b => (
            <div key={b.k} style={{
              flex: 1, padding: '10px 8px', borderRadius: 12, background: '#fff',
              border: `1.5px solid ${RC.c.line}`, textAlign: 'center',
            }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, background: b.c, margin: '0 auto 4px' }}/>
              <div style={{ fontSize: 11, fontWeight: 700 }}>{b.k}</div>
            </div>
          ))}
        </div>
        {/* Block detail card */}
        <div style={{ marginTop: 12, padding: 14, borderRadius: 16, background: '#fff', border: `1.5px solid ${RC.c.fire}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: RC.c.fire, letterSpacing: 0.6, textTransform: 'uppercase' }}>Bloc sélectionné · Intervalle</div>
            <IconClose size={14}/>
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
            <Stat value="10×" label="Répétition"/>
            <Stat value="400" unit="m" label="Distance"/>
            <Stat value="3:30" unit="/km" label="Allure"/>
            <Stat value="60" unit="s" label="Récup"/>
          </div>
        </div>
      </div>
    </Phone>
  );
}

// COACHING — fiche athlète
function ScreenCoachAthlete() {
  return (
    <Phone label="16 Coaching · Athlète" bg={RC.c.bg}>
      <div style={{ padding: '70px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button style={iconBtn}><IconChevL/></button>
          <button style={iconBtn}><IconMore/></button>
        </div>
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar name="Sara Martin" tone="rose" size={64} ring/>
          <div style={{ flex: 1 }}>
            <Title size={24}>Sara Martin</Title>
            <div style={{ fontSize: 13, color: RC.c.ink3, marginTop: 2 }}>Athlète depuis 8 mois · Annecy</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button style={{ flex: 1, height: 44, borderRadius: 12, background: RC.c.ink, color: '#fff', border: 'none', fontFamily: RC.font.display, fontWeight: 700, fontSize: 13 }}>Message</button>
          <button style={{ flex: 1, height: 44, borderRadius: 12, background: '#fff', color: RC.c.ink, border: `1.5px solid ${RC.c.line}`, fontWeight: 700, fontSize: 13 }}>Voir profil</button>
          <button style={{ height: 44, padding: '0 14px', borderRadius: 12, background: RC.c.fire, color: '#fff', border: 'none', fontWeight: 700, fontSize: 13 }}>Relancer</button>
        </div>
        {/* Calendar grid */}
        <SectionH style={{ marginTop: 22 }}>Cette semaine</SectionH>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, padding: '0 0' }}>
          {[
            { v: 'ok' }, { v: 'rest' }, { v: 'ok' }, { v: 'miss' }, { v: 'ok' }, { v: 'today' }, { v: 'planned' },
          ].map((d, i) => {
            const styles = {
              ok: { bg: RC.c.live, c: '#fff', t: '✓' },
              miss: { bg: RC.c.fire, c: '#fff', t: '✕' },
              rest: { bg: RC.c.bgDeep, c: RC.c.ink3, t: '–' },
              today: { bg: RC.c.ink, c: '#fff', t: '●' },
              planned: { bg: '#fff', c: RC.c.ink3, t: '○' },
            }[d.v];
            return (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 10, background: styles.bg, color: styles.c, border: d.v==='planned' ? `1.5px solid ${RC.c.line}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>{styles.t}</div>
            );
          })}
        </div>
        {/* Records */}
        <SectionH style={{ marginTop: 22 }} action="Modifier">Records personnels</SectionH>
        <div style={{ background: '#fff', borderRadius: 16, padding: 14, border: `1px solid ${RC.c.line}` }}>
          <RecordRow d="5 km" t="22:14" zone="Z3 · 4:27/km"/>
          <RecordRow d="10 km" t="46:40" zone="Z3 · 4:40/km"/>
          <RecordRow d="Semi" t="1:42:15" zone="Z2 · 4:50/km" last/>
        </div>
        {/* Send session */}
        <button style={{ width: '100%', marginTop: 16, height: 56, borderRadius: 16, background: RC.c.fire, color: '#fff', border: 'none', fontFamily: RC.font.display, fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <IconPlus size={16}/>Envoyer une nouvelle séance
        </button>
      </div>
    </Phone>
  );
}

function RecordRow({ d, t, zone, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: last ? 'none' : `1px solid ${RC.c.line}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 15 }}>{d}</div>
        <div style={{ fontSize: 11, color: RC.c.ink3 }}>{zone}</div>
      </div>
      <div style={{ fontFamily: RC.font.mono, fontWeight: 700, fontSize: 16 }}>{t}</div>
    </div>
  );
}

// Vue athlète — Mon plan
function ScreenAthletePlan() {
  return (
    <Phone label="14 Coaching · Mon plan" bg={RC.c.bg}>
      <div style={{ padding: '70px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: RC.c.ink3, letterSpacing: 0.5, textTransform: 'uppercase' }}>Mon plan · Coach Marc</div>
            <Title size={30} style={{ marginTop: 4 }}>Cette semaine</Title>
          </div>
          <Avatar name="Marc D" tone="ash" size={40}/>
        </div>
        {/* Progress */}
        <div style={{ marginTop: 18, padding: 14, borderRadius: 16, background: RC.c.ink, color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 700, letterSpacing: 0.5 }}>SEMAINE 12 · COMPLÉTION</div>
            <div style={{ fontFamily: RC.font.display, fontSize: 22, fontWeight: 700 }}>3/5</div>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.12)' }}>
            <div style={{ width: '60%', height: '100%', borderRadius: 3, background: RC.c.fire }}/>
          </div>
        </div>
        <SectionH style={{ marginTop: 22 }}>À faire</SectionH>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PlanRow day="JEUDI" date="8 MAI" title="Fractionné 10×400" zone="Z5 · 8 km" status="today"/>
          <PlanRow day="SAMEDI" date="10 MAI" title="Sortie longue" zone="Z2 · 18 km" status="planned"/>
          <PlanRow day="DIMANCHE" date="11 MAI" title="Récup active" zone="Z1 · 6 km" status="planned"/>
        </div>
        <SectionH style={{ marginTop: 22 }}>Réalisées</SectionH>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PlanRow day="MERCREDI" date="7 MAI" title="Tour vélo lac" zone="Z2 · 32 km" status="done"/>
        </div>
      </div>
      <TabBar active="coach"/>
    </Phone>
  );
}

function PlanRow({ day, date, title, zone, status }) {
  const cfg = {
    today: { ring: RC.c.fire, bg: '#FFF6F2' },
    planned: { ring: RC.c.line, bg: '#fff' },
    done: { ring: RC.c.live, bg: '#fff' },
  }[status];
  return (
    <div style={{ background: cfg.bg, borderRadius: 16, padding: 14, display: 'flex', gap: 12, alignItems: 'center', border: `1.5px solid ${cfg.ring}` }}>
      <div style={{ width: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: RC.c.ink3, letterSpacing: 0.5 }}>{day}</div>
        <div style={{ fontFamily: RC.font.display, fontSize: 18, fontWeight: 700 }}>{date.split(' ')[0]}</div>
      </div>
      <div style={{ flex: 1, paddingLeft: 12, borderLeft: `1.5px solid ${RC.c.line}` }}>
        <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 12, color: RC.c.ink3 }}>{zone}</div>
      </div>
      {status === 'done' && <div style={{ width: 28, height: 28, borderRadius: 14, background: RC.c.live, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCheck size={14}/></div>}
      {status === 'today' && <button style={{ height: 36, padding: '0 14px', borderRadius: 18, background: RC.c.fire, color: '#fff', border: 'none', fontWeight: 700, fontSize: 12 }}>Démarrer</button>}
      {status === 'planned' && <IconChevR/>}
    </div>
  );
}

Object.assign(window, { ScreenSessionsList, ScreenCoachBuild, ScreenCoachAthlete, ScreenAthletePlan });
