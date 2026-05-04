// Reusable visual primitives — Map, photo placeholders, profile bubbles, charts

// Photo placeholder — gradient + grain. Used for "real photo" slots without external assets.
function Photo({ tone = 'forest', radius = 0, style = {}, children }) {
  const tones = {
    forest:   ['#1d3a2a', '#2d5a3f', '#5a7a52'],   // green outdoor
    dusk:     ['#3a1d12', '#7a3a1d', '#d96b3a'],   // sunset run
    asphalt:  ['#1a1a1d', '#2c2c30', '#4a4845'],   // urban dark
    morning:  ['#7a8caf', '#c2b9a3', '#f0d9a8'],   // soft morning
    track:    ['#5a2418', '#8a3a20', '#c45c2e'],   // red track
    pool:     ['#0f3a52', '#1a6a8c', '#5acce0'],   // pool blue
    snow:     ['#a8b8c2', '#d0d8de', '#f0f4f6'],   // alpine
    cream:    ['#d8cdb8', '#bfb198', '#9d8e75'],
  };
  const [a, b, c] = tones[tone] || tones.forest;
  return (
    <div style={{
      borderRadius: radius, overflow: 'hidden', position: 'relative',
      background: `radial-gradient(120% 80% at 30% 20%, ${c} 0%, ${b} 45%, ${a} 100%)`,
      ...style,
    }}>
      {/* subtle grain via SVG turbulence */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.18, mixBlendMode: 'overlay' }}>
        <filter id={'g'+tone}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/></filter>
        <rect width="100%" height="100%" filter={`url(#g${tone})`}/>
      </svg>
      {/* horizon line */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.35) 100%)` }} />
      {children}
    </div>
  );
}

// Avatar — colored circle with initials, optional ring
function Avatar({ name = '?', tone = 'fire', size = 36, ring = false, ringColor }) {
  const tones = {
    fire: ['#FF4D1A', '#FFB199'], live: ['#1FB386', '#A6E5D0'],
    sky: ['#3B5BFF', '#A8B6FF'], plum: ['#6B2D1A', '#C99378'],
    ash: ['#3A3936', '#7A7771'], cream: ['#9D8E75', '#D8CDB8'],
    rose: ['#C9456E', '#F0A8BC'], moss: ['#4A6E3A', '#A8C89A'],
    sun: ['#E5A332', '#F5D88A'],
  };
  const [a, b] = tones[tone] || tones.ash;
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: size/2, position: 'relative',
      background: `radial-gradient(120% 120% at 30% 25%, ${b} 0%, ${a} 80%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontFamily: window.RC.font.display, fontWeight: 700,
      fontSize: size * 0.38, letterSpacing: -0.3,
      boxShadow: ring ? `0 0 0 2.5px ${ringColor || '#fff'}, 0 0 0 4.5px ${window.RC.c.fire}` : 'none',
      flexShrink: 0,
    }}>{initials}</div>
  );
}

// Mapbox-like static map background
function MapBg({ style = {}, dark = false, density = 'med' }) {
  const land = dark ? '#1A1815' : '#EFE8DA';
  const water = dark ? '#0F1218' : '#D8E4EC';
  const road = dark ? '#3A332A' : '#FFFFFF';
  const roadAlt = dark ? '#2A2520' : '#F4ECDD';
  const park = dark ? '#1F2A1B' : '#DCE7C8';
  return (
    <div style={{ position: 'absolute', inset: 0, background: land, overflow: 'hidden', ...style }}>
      <svg width="100%" height="100%" viewBox="0 0 390 600" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
        {/* water river */}
        <path d="M-20 380 Q60 360 120 400 T280 380 T420 360 L420 460 L-20 460 Z" fill={water}/>
        <path d="M-20 380 Q60 360 120 400 T280 380 T420 360" fill="none" stroke={dark ? '#1A2230' : '#C5D4DE'} strokeWidth="0.5"/>
        {/* park blocks */}
        <path d="M30 80 L130 70 L150 160 L40 170 Z" fill={park}/>
        <path d="M250 480 L370 470 L380 580 L260 590 Z" fill={park}/>
        {/* major roads */}
        <path d="M-20 250 L420 220" stroke={road} strokeWidth="14" fill="none"/>
        <path d="M-20 250 L420 220" stroke={dark ? '#5A4F3F' : '#E8DDC7'} strokeWidth="14.5" fill="none" opacity="0.5"/>
        <path d="M180 -20 L210 620" stroke={road} strokeWidth="11" fill="none"/>
        <path d="M-20 130 L420 110" stroke={road} strokeWidth="9" fill="none"/>
        <path d="M40 -20 L60 620" stroke={road} strokeWidth="8" fill="none"/>
        <path d="M320 -20 L300 620" stroke={road} strokeWidth="7" fill="none"/>
        {/* minor roads grid */}
        {[60, 110, 160, 200, 290, 340, 400, 480, 540].map(y => (
          <path key={y} d={`M-20 ${y} L420 ${y-5}`} stroke={roadAlt} strokeWidth="3" fill="none"/>
        ))}
        {[20, 90, 130, 230, 270, 360].map(x => (
          <path key={x} d={`M${x} -20 L${x+8} 620`} stroke={roadAlt} strokeWidth="2.5" fill="none"/>
        ))}
        {/* building blocks */}
        {density !== 'low' && Array.from({ length: 28 }).map((_, i) => {
          const x = 15 + (i*47) % 360;
          const y = 30 + ((i*83) % 540);
          const w = 18 + (i*7) % 24;
          const h = 14 + (i*11) % 22;
          return <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill={dark ? '#26221C' : '#E5DCC8'} opacity="0.8"/>;
        })}
      </svg>
    </div>
  );
}

// Activity pin with avatar
function MapPin({ x, y, name, tone, sport = '🏃', live = false }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -100%)' }}>
      <div style={{
        position: 'relative', padding: 3,
        background: '#fff', borderRadius: 999,
        boxShadow: '0 6px 14px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
      }}>
        <Avatar name={name} tone={tone} size={36} />
        {live && (
          <div style={{
            position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: 7,
            background: window.RC.c.live, border: '2px solid #fff',
            animation: 'pulse 1.6s infinite',
          }} />
        )}
        <div style={{
          position: 'absolute', bottom: -3, right: -3, width: 22, height: 22, borderRadius: 11,
          background: '#fff', border: `2px solid ${window.RC.c.ink}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
        }}>{sport}</div>
      </div>
      <div style={{
        width: 0, height: 0, margin: '0 auto',
        borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
        borderTop: '8px solid #fff',
      }} />
    </div>
  );
}

// Route polyline — drawn over map
function RouteLine({ d, color, glow = false }) {
  return (
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} viewBox="0 0 390 600" preserveAspectRatio="xMidYMid slice">
      {glow && <path d={d} stroke={color} strokeWidth="10" fill="none" opacity="0.3" strokeLinecap="round"/>}
      <path d={d} stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round"/>
      <path d={d} stroke={color} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

// Big number stat block
function Stat({ value, unit, label, dark = false }) {
  return (
    <div>
      <div style={{
        fontFamily: window.RC.font.display, fontWeight: 700,
        fontSize: 38, lineHeight: 1, letterSpacing: -1.6,
        color: dark ? '#fff' : window.RC.c.ink,
        display: 'flex', alignItems: 'baseline', gap: 4,
      }}>
        {value}
        {unit && <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: 0, color: dark ? 'rgba(255,255,255,0.6)' : window.RC.c.ink3 }}>{unit}</span>}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase',
        color: dark ? 'rgba(255,255,255,0.55)' : window.RC.c.ink3, marginTop: 4,
      }}>{label}</div>
    </div>
  );
}

// Pill / chip
function Chip({ children, active = false, dark = false, icon, onClick }) {
  return (
    <div onClick={onClick} style={{
      height: 34, padding: '0 14px', borderRadius: 999,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 13, fontWeight: 600, letterSpacing: -0.1,
      background: active ? window.RC.c.ink : (dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.95)'),
      color: active ? '#fff' : (dark ? '#fff' : window.RC.c.ink),
      border: active ? 'none' : `1px solid ${dark ? 'rgba(255,255,255,0.15)' : window.RC.c.line}`,
      whiteSpace: 'nowrap', flexShrink: 0,
      boxShadow: active ? 'none' : '0 1px 2px rgba(0,0,0,0.04)',
    }}>
      {icon}{children}
    </div>
  );
}

// Section header strip
function SectionH({ children, action, style = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 20px', marginBottom: 12, ...style }}>
      <div style={{
        fontFamily: window.RC.font.display, fontWeight: 700, fontSize: 13,
        letterSpacing: 1.5, textTransform: 'uppercase', color: window.RC.c.ink3,
      }}>{children}</div>
      {action && <div style={{ fontSize: 13, fontWeight: 600, color: window.RC.c.fire }}>{action}</div>}
    </div>
  );
}

// Big title
function Title({ children, size = 32, style = {} }) {
  return (
    <div style={{
      fontFamily: window.RC.font.display, fontWeight: 700, fontSize: size,
      letterSpacing: -size * 0.04, lineHeight: 1.02, color: window.RC.c.ink,
      ...style,
    }}>{children}</div>
  );
}

// Live dot
function LiveDot({ size = 8 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: size/2,
      background: window.RC.c.live, boxShadow: `0 0 0 3px ${window.RC.c.live}33`,
      animation: 'pulse 1.4s infinite',
    }} />
  );
}

Object.assign(window, { Photo, Avatar, MapBg, MapPin, RouteLine, Stat, Chip, SectionH, Title, LiveDot });
