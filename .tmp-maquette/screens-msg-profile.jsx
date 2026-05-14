// MESSAGES + PROFIL screens

function ScreenMessages() {
  const stories = [
    { name: 'Toi', tone: 'fire', mine: true },
    { name: 'Lucas', tone: 'sky' },
    { name: 'Sara', tone: 'rose' },
    { name: 'Tom', tone: 'live' },
    { name: 'Eli', tone: 'moss' },
    { name: 'Max', tone: 'sun' },
    { name: 'Léa', tone: 'plum' },
  ];
  return (
    <Phone label="17 Messages · Conversations" bg={RC.c.bg}>
      <div style={{ padding: '70px 0 0' }}>
        <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title size={36}>Messages</Title>
          <button style={{ ...iconBtn, background: RC.c.ink, color: '#fff', border: 'none' }}><IconPlus/></button>
        </div>
        {/* Search */}
        <div style={{ padding: '14px 20px 0' }}>
          <div style={{ height: 44, borderRadius: 22, background: '#fff', border: `1px solid ${RC.c.line}`, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconSearch size={14}/><span style={{ fontSize: 13, color: RC.c.ink3 }}>Rechercher amis · clubs · groupes</span>
          </div>
        </div>
        {/* Stories rail */}
        <div style={{ display: 'flex', gap: 14, padding: '20px 20px 4px', overflowX: 'hidden' }}>
          {stories.map((s, i) => (
            <div key={s.name} style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 32, padding: 2.5,
                  background: s.mine ? RC.c.line : `conic-gradient(from 200deg, ${RC.c.fire}, ${RC.c.fireGlow}, ${RC.c.fire})`,
                }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: 30, padding: 2, background: RC.c.bg }}>
                    <Avatar name={s.name} tone={s.tone} size={54}/>
                  </div>
                </div>
                {s.mine && <div style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, background: RC.c.fire, color: '#fff', border: '2.5px solid '+RC.c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconPlus size={12}/></div>}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 6, color: s.mine ? RC.c.ink3 : RC.c.ink }}>{s.name}</div>
            </div>
          ))}
        </div>
        {/* Tabs */}
        <div style={{ padding: '14px 20px 0', display: 'flex', gap: 6 }}>
          <Chip active>Conversations</Chip>
          <Chip>Clubs · 4</Chip>
          <Chip>Groupes · 2</Chip>
        </div>
        {/* Conversations list */}
        <div style={{ padding: '14px 0 0', background: '#fff', marginTop: 14, borderRadius: '24px 24px 0 0', minHeight: 380 }}>
          <ConvRow name="Lucas Robert" tone="sky" msg="On part du Pâquier 18:30 ?" time="12:42" unread/>
          <ConvRow name="Annecy Runners · Club" tone="moss" msg="Sara : Sortie longue dimanche 8h" time="11:08" club unread="3"/>
          <ConvRow name="Sara Martin" tone="rose" msg="Vu ton record sur le 10K 🔥" time="Hier"/>
          <ConvRow name="Mes athlètes · Groupe" tone="ash" msg="Coach Marc : Plans de la semaine envoyés" time="Hier" group/>
          <ConvRow name="Tom Brillant" tone="live" msg="Pool 20h ?" time="Mar"/>
          <ConvRow name="Eli Klein" tone="fire" msg="J'ai rejoint ta séance" time="Lun" last/>
        </div>
      </div>
      <TabBar active="msg"/>
    </Phone>
  );
}

function ConvRow({ name, tone, msg, time, unread, club, group, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: last ? 'none' : `1px solid ${RC.c.line}` }}>
      <div style={{ position: 'relative' }}>
        <Avatar name={name} tone={tone} size={50}/>
        {(club || group) && <div style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, background: '#fff', border: `2px solid ${RC.c.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{club ? '🏛' : '👥'}</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 15 }}>{name}</div>
          <div style={{ fontSize: 11, color: unread ? RC.c.fire : RC.c.ink3, fontWeight: unread ? 700 : 500 }}>{time}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
          <div style={{ fontSize: 13, color: RC.c.ink3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{msg}</div>
          {unread === true && <div style={{ width: 8, height: 8, borderRadius: 4, background: RC.c.fire, marginLeft: 8 }}/>}
          {typeof unread === 'string' && <div style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: RC.c.fire, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>{unread}</div>}
        </div>
      </div>
    </div>
  );
}

// Conversation
function ScreenConversation() {
  return (
    <Phone label="18 Messages · Conv" bg={RC.c.bg}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 110, background: '#fff', borderBottom: `1px solid ${RC.c.line}`, padding: '60px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={{ ...iconBtn, width: 36, height: 36, border: 'none' }}><IconChevL size={16}/></button>
        <Avatar name="Lucas Robert" tone="sky" size={36}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 15 }}>Lucas Robert</div>
          <div style={{ fontSize: 11, color: RC.c.live, fontWeight: 600 }}>● En ligne</div>
        </div>
        <button style={{ ...iconBtn, width: 36, height: 36, border: 'none' }}><IconMore size={16}/></button>
      </div>
      <div style={{ padding: '120px 16px 100px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Bubble side="them">Salut, sortie ce soir ?</Bubble>
        <Bubble side="me">Yes carrément. T'as une idée ?</Bubble>
        <SessionShareCard/>
        <Bubble side="them">J'ai créé celle-là 👆</Bubble>
        <Bubble side="me">Parfait, j'arrive 👌</Bubble>
        <div style={{ alignSelf: 'center', fontSize: 10, color: RC.c.ink3, fontWeight: 600, letterSpacing: 0.5, marginTop: 6 }}>EN TRAIN D'ÉCRIRE…</div>
      </div>
      {/* Input bar */}
      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 26, height: 52, borderRadius: 26, background: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.08)', padding: '0 6px 0 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={{ ...iconBtn, width: 36, height: 36, background: RC.c.bgDeep, border: 'none' }}><IconPlus size={16}/></button>
        <div style={{ flex: 1, fontSize: 14, color: RC.c.ink3 }}>Message…</div>
        <button style={{ ...iconBtn, width: 40, height: 40, background: RC.c.fire, border: 'none', color: '#fff' }}><IconMic size={16}/></button>
      </div>
    </Phone>
  );
}

function Bubble({ side, children }) {
  const isMe = side === 'me';
  return (
    <div style={{
      alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '78%',
      background: isMe ? RC.c.ink : '#fff',
      color: isMe ? '#fff' : RC.c.ink,
      padding: '10px 14px', borderRadius: 18,
      borderBottomRightRadius: isMe ? 6 : 18,
      borderBottomLeftRadius: isMe ? 18 : 6,
      fontSize: 14, lineHeight: 1.4,
      border: isMe ? 'none' : `1px solid ${RC.c.line}`,
    }}>{children}</div>
  );
}

function SessionShareCard() {
  return (
    <div style={{ alignSelf: 'flex-start', width: 240, borderRadius: 18, overflow: 'hidden', background: '#fff', border: `1px solid ${RC.c.line}` }}>
      <div style={{ height: 80, position: 'relative' }}>
        <MapBg style={{ height: 80, position: 'absolute' }}/>
        <RouteLine d="M20 50 Q60 30 110 40 T200 30" color={RC.c.fire}/>
        <div style={{ position: 'absolute', top: 8, left: 8, padding: '4px 8px', borderRadius: 999, background: '#fff', fontSize: 10, fontWeight: 700 }}>🏃 Course</div>
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 14 }}>Sortie longue · Pâquier</div>
        <div style={{ fontSize: 11, color: RC.c.ink3, marginTop: 2 }}>Mardi 18:30 · 14 km</div>
        <button style={{ width: '100%', marginTop: 8, height: 32, borderRadius: 8, background: RC.c.fire, color: '#fff', border: 'none', fontWeight: 700, fontSize: 12 }}>Rejoindre</button>
      </div>
    </div>
  );
}

// PROFIL
function ScreenProfile() {
  return (
    <Phone label="19 Profil · Mon profil" bg={RC.c.bg}>
      {/* Hero */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 290 }}>
        <Photo tone="dusk" style={{ position: 'absolute', inset: 0 }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(246,242,236,1) 100%)' }}/>
        <div style={{ position: 'absolute', top: 60, left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }}>
          <button style={{ ...iconBtn, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)' }}><IconShare size={14}/></button>
          <button style={{ ...iconBtn, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)' }}><IconSettings size={16}/></button>
        </div>
      </div>
      {/* Avatar + identity */}
      <div style={{ position: 'absolute', top: 180, left: 0, right: 0, padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <Avatar name="Ferdinand Froidefont" tone="fire" size={92} ring ringColor="#fff"/>
          <div style={{ paddingBottom: 8 }}>
            <Title size={26}>Ferdinand F.</Title>
            <div style={{ fontSize: 13, color: RC.c.ink3, marginTop: 2 }}>@ferdi · Annecy · 24 ans</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 13 }}>
          <div><b style={{ fontFamily: RC.font.display, fontSize: 18 }}>187</b> séances</div>
          <div><b style={{ fontFamily: RC.font.display, fontSize: 18 }}>1.2k</b> abonnés</div>
          <div><b style={{ fontFamily: RC.font.display, fontSize: 18 }}>438</b> abonnements</div>
        </div>
        <div style={{ fontSize: 14, color: RC.c.ink2, marginTop: 14, lineHeight: 1.4 }}>
          Trail · 5K route · cherche groupe pour le marathon de Genève 🏃‍♂️
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button style={{ flex: 1, height: 44, borderRadius: 12, background: RC.c.ink, color: '#fff', border: 'none', fontFamily: RC.font.display, fontWeight: 700, fontSize: 13 }}>Modifier le profil</button>
          <button style={{ ...iconBtn, width: 44, height: 44 }}><IconShare size={14}/></button>
        </div>
        {/* Sub-tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${RC.c.line}`, marginTop: 22 }}>
          {['Profil', 'Records', 'Stories'].map((t, i) => (
            <div key={t} style={{ flex: 1, textAlign: 'center', padding: '12px 0', fontSize: 13, fontWeight: 700, color: i===0 ? RC.c.ink : RC.c.ink3, borderBottom: i===0 ? `2px solid ${RC.c.fire}` : 'none', marginBottom: -1 }}>{t}</div>
          ))}
        </div>
        {/* Records cards */}
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <RecordCard d="5 km" t="19:42" pace="3:56/km" tone="fire"/>
          <RecordCard d="10 km" t="41:18" pace="4:08/km" tone="ink"/>
        </div>
      </div>
      <TabBar active="profile"/>
    </Phone>
  );
}

function RecordCard({ d, t, pace, tone }) {
  const dark = tone === 'ink';
  return (
    <div style={{
      padding: 14, borderRadius: 18,
      background: dark ? RC.c.ink : '#fff',
      border: dark ? 'none' : `1.5px solid ${RC.c.line}`,
      color: dark ? '#fff' : RC.c.ink, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, letterSpacing: 0.6, textTransform: 'uppercase' }}>Record · {d}</div>
      <div style={{ fontFamily: RC.font.display, fontSize: 28, fontWeight: 700, letterSpacing: -1, marginTop: 8 }}>{t}</div>
      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2, fontWeight: 600 }}>{pace}</div>
      <div style={{ position: 'absolute', right: 10, top: 10, width: 28, height: 28, borderRadius: 14, background: tone === 'fire' ? RC.c.fire : 'rgba(255,255,255,0.1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <IconBolt size={12}/>
      </div>
    </div>
  );
}

// Settings
function ScreenSettings() {
  return (
    <Phone label="20 Paramètres" bg={RC.c.bg}>
      <div style={{ padding: '70px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button style={iconBtn}><IconChevL/></button>
          <Title size={20} style={{ flex: 1, textAlign: 'center' }}>Paramètres</Title>
          <div style={{ width: 44 }}/>
        </div>
        {/* Share card */}
        <div style={{ marginTop: 18, padding: 18, borderRadius: 22, background: RC.c.ink, color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <Photo tone="dusk" style={{ position: 'absolute', inset: 0, opacity: 0.4 }}/>
          <div style={{ position: 'relative', display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar name="Ferdinand F" tone="fire" size={52} ring ringColor="#fff"/>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 17 }}>Ferdinand F.</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>1.2k abonnés · 187 séances</div>
            </div>
            <button style={{ height: 36, padding: '0 14px', borderRadius: 18, background: '#fff', color: RC.c.ink, border: 'none', fontWeight: 700, fontSize: 12 }}>Partager</button>
          </div>
        </div>
        {/* List */}
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SettingsGroup title="Compte" items={[
            { e: '👤', t: 'Général', d: 'Langue · thème · unités' },
            { e: '🔔', t: 'Notifications', d: '12 types' },
            { e: '🔗', t: 'Connexion', d: 'Instagram · contacts' },
          ]}/>
          <SettingsGroup title="Premium · Parrainage" items={[
            { e: '🎁', t: 'Mon code de parrainage', d: 'FERDI-2026 · 4 filleuls' },
            { e: '⚡', t: 'Passer Premium', d: 'Boost illimité · visibilité globale', accent: true },
          ]}/>
          <SettingsGroup title="Support" items={[
            { e: '🛡', t: 'Confidentialité · RGPD', d: '' },
            { e: '💬', t: 'Contacter le support', d: '' },
            { e: '📚', t: 'Catalogue de tutoriels', d: '14 disponibles' },
          ]}/>
          <button style={{ width: '100%', height: 50, borderRadius: 14, background: '#fff', color: RC.c.fire, border: `1.5px solid ${RC.c.line}`, fontWeight: 700, fontSize: 14, marginTop: 4 }}>Se déconnecter</button>
        </div>
      </div>
    </Phone>
  );
}

function SettingsGroup({ title, items }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: RC.c.ink3, padding: '0 4px 8px' }}>{title}</div>
      <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${RC.c.line}` }}>
        {items.map((it, i) => (
          <div key={it.t} style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < items.length-1 ? `1px solid ${RC.c.line}` : 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: it.accent ? RC.c.fire : RC.c.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{it.e}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: RC.font.display, fontWeight: 700, fontSize: 14, color: it.accent ? RC.c.fire : RC.c.ink }}>{it.t}</div>
              {it.d && <div style={{ fontSize: 11, color: RC.c.ink3, marginTop: 1 }}>{it.d}</div>}
            </div>
            <IconChevR size={14}/>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ScreenMessages, ScreenConversation, ScreenProfile, ScreenSettings });
