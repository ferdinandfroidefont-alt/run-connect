// Apple design tokens — Settings + App Store aesthetic
// Theme-aware: every color resolves to a CSS variable that flips between
// :root (light) and :root.theme-dark, just like iOS semantic colors.
const A = {
  c: {
    // Action (system blue: #0066CC light, #0A84FF dark — Apple's actual values)
    blue: 'var(--c-blue)',
    blueFocus: 'var(--c-blue-focus)',
    blueDark: 'var(--c-blue-dark)',
    // Surface
    canvas: 'var(--c-canvas)',
    parchment: 'var(--c-parchment)',
    pearl: 'var(--c-pearl)',
    groupedBg: 'var(--c-grouped-bg)',
    cell: 'var(--c-cell)',
    // Text
    ink: 'var(--c-ink)',
    ink80: 'var(--c-ink-80)',
    ink60: 'var(--c-ink-60)',
    ink30: 'var(--c-ink-30)',
    inkMuted: 'var(--c-ink-muted)',
    onDark: '#ffffff',
    // Tile (dark bezels, fixed)
    tile1: '#272729',
    tile2: '#2a2a2c',
    tile3: '#252527',
    black: '#000000',
    // Hairline
    hair: 'var(--c-hair)',
    sep: 'var(--c-sep)',
    // iOS system semantics — flip dynamic ranges in dark
    sysRed: 'var(--c-sys-red)',
    sysGreen: 'var(--c-sys-green)',
    sysOrange: 'var(--c-sys-orange)',
  },
  font: {
    display: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif',
    text: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif',
    rounded: '"SF Pro Rounded", -apple-system, system-ui, sans-serif',
  },
  r: { xs: 5, sm: 8, md: 11, lg: 18, pill: 9999 },
  s: { xxs: 4, xs: 8, sm: 12, md: 17, lg: 24, xl: 32, xxl: 48 },
};

// PHONE shell — light, App-Store-ish; very minimal chrome
function Phone({ label, bg = A.c.groupedBg, statusDark = false, children }) {
  return (
    <div data-screen-label={label} style={{
      width: 390, height: 844, position: 'relative',
      borderRadius: 48, background: bg,
      overflow: 'hidden', fontFamily: A.font.text, color: A.c.ink,
      boxShadow: 'var(--c-phone-shadow)',
      border: '1px solid var(--c-phone-border)',
    }}>
      {/* Status bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 50,
        padding: '14px 32px 0', display: 'flex', justifyContent: 'space-between',
        fontFamily: A.font.text, fontSize: 16, fontWeight: 600, letterSpacing: -0.3,
        color: statusDark ? '#fff' : A.c.ink, zIndex: 50, pointerEvents: 'none',
      }}>
        <span>9:41</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <svg width="18" height="11" viewBox="0 0 18 11" fill="currentColor"><rect x="0" y="6" width="3" height="5" rx="1"/><rect x="5" y="4" width="3" height="7" rx="1"/><rect x="10" y="2" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="11" rx="1"/></svg>
          <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M8 2.4c2 0 3.7.8 5 2l1.5-1.5C12.7 1.4 10.4.5 8 .5S3.3 1.4 1.5 2.9L3 4.4c1.3-1.2 3-2 5-2zm0 3c1.2 0 2.3.4 3.2 1.2l1.4-1.4C11.4 4.1 9.7 3.5 8 3.5S4.6 4.1 3.4 5.2L4.8 6.6c.9-.8 2-1.2 3.2-1.2zm0 3c.6 0 1.2.2 1.6.6L8 10.5 6.4 8.9c.4-.4 1-.6 1.6-.6z"/></svg>
          <div style={{ width: 25, height: 11, border: '1px solid currentColor', borderRadius: 3, position: 'relative', opacity: 0.4 }}>
            <div style={{ position: 'absolute', inset: 1.5, background: 'currentColor', borderRadius: 1, width: 18 }}/>
            <div style={{ position: 'absolute', right: -2.5, top: 3.5, width: 1.5, height: 4, background: 'currentColor', borderRadius: 1 }}/>
          </div>
        </div>
      </div>
      {/* Dynamic island */}
      <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 122, height: 36, background: '#000', borderRadius: 20, zIndex: 49 }}/>
      {children}
      {/* Home indicator */}
      <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: 134, height: 5, borderRadius: 3, background: statusDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', zIndex: 50 }}/>
    </div>
  );
}

// iOS-style large title navbar
function NavBar({ title, large = true, leading, trailing, transparent = false }) {
  return (
    <div style={{
      paddingTop: 56, paddingLeft: 16, paddingRight: 16,
      background: transparent ? 'transparent' : 'transparent',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 44 }}>
        <div style={{ minWidth: 60 }}>{leading}</div>
        {!large && <div style={{ fontSize: 17, fontWeight: 600, fontFamily: A.font.text, letterSpacing: -0.4 }}>{title}</div>}
        <div style={{ minWidth: 60, display: 'flex', justifyContent: 'flex-end', gap: 16 }}>{trailing}</div>
      </div>
      {large && (
        <div style={{ fontFamily: A.font.display, fontSize: 34, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.05, marginTop: 6, marginBottom: 6 }}>{title}</div>
      )}
    </div>
  );
}

// Search bar — iOS field
function SearchBar({ placeholder = 'Recherche', value }) {
  return (
    <div style={{ padding: '0 16px 8px' }}>
      <div style={{
        height: 36, borderRadius: 10, background: 'var(--c-search-fill)',
        display: 'flex', alignItems: 'center', padding: '0 8px', gap: 6,
        fontSize: 17, color: A.c.ink60, fontFamily: A.font.text,
      }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11.5 10h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L16.49 15zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/></svg>
        <span>{value || placeholder}</span>
      </div>
    </div>
  );
}

// iOS Grouped section
function Group({ title, footer, children, inset = true }) {
  return (
    <div style={{ padding: inset ? '0 16px' : 0, marginBottom: 24 }}>
      {title && (
        <div style={{
          fontSize: 13, color: A.c.ink60, fontWeight: 400,
          textTransform: 'uppercase', letterSpacing: 0.3,
          padding: '0 16px 6px', fontFamily: A.font.text,
        }}>{title}</div>
      )}
      <div style={{
        background: A.c.cell, borderRadius: 10, overflow: 'hidden',
      }}>{children}</div>
      {footer && (
        <div style={{ fontSize: 13, color: A.c.ink60, padding: '6px 16px 0', lineHeight: 1.3, fontFamily: A.font.text }}>{footer}</div>
      )}
    </div>
  );
}

// iOS Cell
function Cell({ icon, iconBg, title, subtitle, value, accessory = 'chevron', last, danger, accent, onClick, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 16px', minHeight: 44,
      borderBottom: last ? 'none' : `0.5px solid ${A.c.sep}`,
      cursor: onClick ? 'pointer' : 'default',
    }}>
      {icon && (
        <div style={{
          width: 29, height: 29, borderRadius: 6.5,
          background: iconBg || A.c.blue, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          fontSize: 15,
        }}>{icon}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 400, color: danger ? A.c.sysRed : (accent ? A.c.blue : A.c.ink), letterSpacing: -0.4, fontFamily: A.font.text, lineHeight: 1.2 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: A.c.ink60, marginTop: 2, lineHeight: 1.3 }}>{subtitle}</div>}
      </div>
      {children}
      {value && <div style={{ fontSize: 17, color: A.c.ink60, fontFamily: A.font.text, letterSpacing: -0.3 }}>{value}</div>}
      {accessory === 'chevron' && (
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ color: A.c.ink30 }}><path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      )}
      {accessory === 'check' && (
        <svg width="14" height="11" viewBox="0 0 14 11" style={{ color: A.c.blue }}><path d="M1 5.5l4 4 8-8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
      )}
    </div>
  );
}

// iOS toggle
function Toggle({ on = true }) {
  return (
    <div style={{
      width: 51, height: 31, borderRadius: 31,
      background: on ? A.c.sysGreen : 'var(--c-toggle-off)',
      position: 'relative', transition: 'all 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 22 : 2,
        width: 27, height: 27, borderRadius: 27, background: '#fff',
        boxShadow: '0 3px 8px rgba(0,0,0,0.15), 0 3px 1px rgba(0,0,0,0.06)',
      }}/>
    </div>
  );
}

// Button — Apple action blue pill
function PillBtn({ children, secondary, dark, large, full, color }) {
  const bg = dark ? A.c.ink : (secondary ? 'transparent' : (color || A.c.blue));
  const fg = secondary ? (color || A.c.blue) : '#fff';
  return (
    <button style={{
      height: large ? 50 : 36, padding: large ? '0 28px' : '0 18px',
      borderRadius: 9999, border: secondary ? `1px solid ${color || A.c.blue}` : 'none',
      background: bg, color: fg,
      fontFamily: A.font.text, fontSize: large ? 17 : 15, fontWeight: 400, letterSpacing: -0.3,
      cursor: 'pointer', width: full ? '100%' : 'auto',
    }}>{children}</button>
  );
}

// App Store style App Card (small)
function AppRow({ icon, name, sub, btn = 'OBTENIR', last, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px', borderBottom: last ? 'none' : `0.5px solid ${A.c.sep}` }}>
      <div style={{
        width: 60, height: 60, borderRadius: 13, background: icon?.bg || A.c.blue,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
        position: 'relative', overflow: 'hidden',
      }}>{icon?.glyph}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: A.font.text, fontSize: 15, fontWeight: 600, letterSpacing: -0.3, color: A.c.ink }}>{name}</div>
        <div style={{ fontSize: 13, color: A.c.ink60, marginTop: 2 }}>{sub}</div>
      </div>
      <button style={{
        background: 'rgba(118,118,128,0.12)', color: A.c.blue,
        border: 'none', borderRadius: 9999, padding: '6px 18px', minWidth: 78,
        fontFamily: A.font.text, fontSize: 15, fontWeight: 600, letterSpacing: -0.3, cursor: 'pointer',
      }}>{btn}</button>
    </div>
  );
}

// Tab bar — iOS
function TabBar({ active }) {
  const tabs = [
    { id: 'discover', label: 'Découvrir', icon: <svg width="26" height="26" viewBox="0 0 26 26" fill="currentColor"><circle cx="13" cy="13" r="11" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M8 8l4 6-3 5 5-3 6-4-7 1z"/></svg> },
    { id: 'sessions', label: 'Séances', icon: <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="20" height="18" rx="3"/><path d="M3 10h20M8 2v4M18 2v4M8 14h4M8 18h8"/></svg> },
    { id: 'plan', label: 'Coaching', icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="14" cy="14" r="12"/><path d="M14 6v8l5 3"/></svg> },
    { id: 'msg', label: 'Messages', icon: <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 13a9 9 0 1 1-3.5-7.1L23 4l-1.1 4.5A9 9 0 0 1 23 13z"/></svg>, badge: 4 },
    { id: 'profile', label: 'Profil', icon: <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13" cy="9" r="5"/><path d="M3 24c2-5.5 6-8 10-8s8 2.5 10 8"/></svg> },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 83,
      paddingBottom: 26, paddingTop: 6, display: 'flex',
      background: 'var(--c-tab-bg)', backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderTop: `0.33px solid ${A.c.hair}`,
    }}>
      {tabs.map(t => (
        <div key={t.id} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          color: active === t.id ? A.c.blue : A.c.ink60, position: 'relative',
        }}>
          <div style={{ position: 'relative' }}>
            {t.icon}
            {t.badge && <div style={{ position: 'absolute', top: -3, right: -10, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: A.c.sysRed, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.badge}</div>}
          </div>
          <div style={{ fontSize: 10, fontWeight: 500, fontFamily: A.font.text, letterSpacing: -0.1 }}>{t.label}</div>
        </div>
      ))}
    </div>
  );
}

// SF Symbols-ish glyphs (drawn ourselves)
const SF = {
  arrow: <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6.5h11M7.5 1.5l5 5-5 5"/></svg>,
  back: <svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L2 10l8 8"/></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M7 1v12M1 7h12"/></svg>,
  ellipsis: <svg width="20" height="5" viewBox="0 0 20 5" fill="currentColor"><circle cx="2.5" cy="2.5" r="2"/><circle cx="10" cy="2.5" r="2"/><circle cx="17.5" cy="2.5" r="2"/></svg>,
  share: <svg width="18" height="22" viewBox="0 0 18 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 1v15M3 7l6-6 6 6M2 14v5a2 2 0 002 2h10a2 2 0 002-2v-5"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M11.5 10h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L16.49 15zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/></svg>,
  loc: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 1v2M7 11v2M1 7h2M11 7h2"/><circle cx="7" cy="7" r="4"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg>,
};

Object.assign(window, { A, Phone, NavBar, SearchBar, Group, Cell, Toggle, PillBtn, AppRow, TabBar, SF });

// ─────────────────────────────────────────────
// THEME — Apple-style light + dark, toggled at the root.
// ─────────────────────────────────────────────
const THEME_CSS = `
:root {
  --c-blue: #0066cc;
  --c-blue-focus: #0071e3;
  --c-blue-dark: #2997ff;
  --c-canvas: #ffffff;
  --c-parchment: #f5f5f7;
  --c-pearl: #fafafc;
  --c-grouped-bg: #f2f2f7;
  --c-cell: #ffffff;
  --c-ink: #1d1d1f;
  --c-ink-80: #3c3c43;
  --c-ink-60: rgba(60,60,67,0.6);
  --c-ink-30: rgba(60,60,67,0.3);
  --c-ink-muted: #7a7a7a;
  --c-hair: rgba(60,60,67,0.18);
  --c-sep: rgba(60,60,67,0.12);
  --c-sys-red: #ff3b30;
  --c-sys-green: #34c759;
  --c-sys-orange: #ff9500;
  --c-phone-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 30px 60px -20px rgba(0,0,0,0.18);
  --c-phone-border: rgba(0,0,0,0.06);
  --c-tab-bg: rgba(249,249,249,0.94);
  --c-nav-bg: rgba(249,249,249,0.94);
  --c-search-fill: rgba(118,118,128,0.12);
  --c-toggle-off: rgba(120,120,128,0.16);
}
.theme-dark {
  --c-blue: #0a84ff;
  --c-blue-focus: #409cff;
  --c-blue-dark: #5e5ce6;
  --c-canvas: #000000;
  --c-parchment: #1c1c1e;
  --c-pearl: #1c1c1e;
  --c-grouped-bg: #000000;
  --c-cell: #1c1c1e;
  --c-ink: #ffffff;
  --c-ink-80: rgba(235,235,245,0.85);
  --c-ink-60: rgba(235,235,245,0.6);
  --c-ink-30: rgba(235,235,245,0.3);
  --c-ink-muted: #98989f;
  --c-hair: rgba(84,84,88,0.65);
  --c-sep: rgba(84,84,88,0.4);
  --c-sys-red: #ff453a;
  --c-sys-green: #30d158;
  --c-sys-orange: #ff9f0a;
  --c-phone-shadow: 0 1px 0 rgba(255,255,255,0.04), 0 30px 60px -20px rgba(0,0,0,0.7);
  --c-phone-border: rgba(255,255,255,0.08);
  --c-tab-bg: rgba(28,28,30,0.86);
  --c-nav-bg: rgba(28,28,30,0.86);
  --c-search-fill: rgba(118,118,128,0.24);
  --c-toggle-off: rgba(120,120,128,0.32);
}
`;

(function injectThemeCss() {
  if (typeof document === 'undefined' || document.getElementById('__theme-css')) return;
  const s = document.createElement('style');
  s.id = '__theme-css';
  s.textContent = THEME_CSS;
  document.head.appendChild(s);
})();

// Global theme state — read by all screens, written by Réglages toggle.
const ThemeContext = React.createContext({ theme: 'light', setTheme: () => {} });
function ThemeProvider({ children }) {
  const [theme, setTheme] = React.useState(() => {
    try { return localStorage.getItem('rc-theme') || 'light'; } catch (e) { return 'light'; }
  });
  React.useEffect(() => {
    try { localStorage.setItem('rc-theme', theme); } catch (e) {}
    // Toggle the class on the canvas root so every screen flips at once.
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('theme-dark');
    else root.classList.remove('theme-dark');
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
function useTheme() { return React.useContext(ThemeContext); }

// Wrapper that locally forces a theme — used for the "Mode sombre" mirror section.
// Renders a regular div so CSS variables scope correctly to all descendants.
function ThemedArea({ theme, children }) {
  return (
    <div className={theme === 'dark' ? 'theme-dark' : ''} style={{ width: '100%', height: '100%' }}>
      {children}
    </div>
  );
}

Object.assign(window, { ThemeContext, ThemeProvider, useTheme, ThemedArea });

