// ON-CALL — El Último Turno | Platanus Hack 26 Arcade
const W = 800, H = 600, HS = 'oncall-board-v2';
const C = {
  bg: 0x050505, lime: 0xdfff00, green: 0xa3ff12, red: 0xff3535,
  text: 0xe8e4d0, dim: 0x2a2a22, gold: 0xffd700, cyan: 0x00ffe0,
  orange: 0xff6600, pink: 0xff4fd8, blue: 0x4488ff,
};
const F = 'Courier New, monospace';
const SHIRTS = [
  0xdfff00, 0x00ffe0, 0xff4fd8, 0xff6600, 0x4488ff, 0xffd700,
  0xff3535, 0xffffff, 0x222222, 0x9b59b6, 0x2ecc71, 0xff8fab,
];
const SKINS = [0xe8c4a0, 0xc9956b, 0x8d5524, 0xf1c27d, 0x6b3f2a];
const HAIRS = [
  0x1a1a12, 0x5c3317, 0xd4a017, 0xa3ff12, 0xe8e4d0, 0xff4fd8,
  0x4488ff, 0xff3535, 0x8b0000, 0xc0c0c0, 0x00ffe0, 0x4a2c0a,
];
const MAX_NAME = 8, TOP_N = 5;
const KEYS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'P', '_'],
  ['DEL', 'DEL', 'ESP', 'ESP', 'OK', 'OK', 'OK', 'OK', 'OK'],
];
const TERM = [
  'pagerDuty go brrr', '¿Quién tocó prod?', 'ERROR 500', 'hotfix un viernes',
  'En mi máquina sí', 'merge a main', 'CI falló', 'LGTM', 'rollback ya',
];
const OVER = [
  'El pager ganó esta vez.', 'Prod sigue en llamas.', 'Te van a llamar a las 3am.',
  '¿Probaste reiniciar el servicio?', 'LGTM... mentira.', 'Otro ingeniero caído.',
  'Incident channel locked.', 'Postmortem incoming.',
];

// DO NOT replace existing keys — physical cabinet wiring.
const CABINET_KEYS = {
  P1_U: ['w'], P1_D: ['s'], P1_L: ['a'], P1_R: ['d'],
  P1_1: ['u', ' '], P1_2: ['i'], P1_3: ['o'], P1_4: ['j'], P1_5: ['k'], P1_6: ['l'],
  P2_U: ['ArrowUp'], P2_D: ['ArrowDown'], P2_L: ['ArrowLeft'], P2_R: ['ArrowRight'],
  P2_1: ['r'], P2_2: ['t'], P2_3: ['y'], P2_4: ['f'], P2_5: ['g'], P2_6: ['h'],
  START1: ['Enter'], START2: ['2'],
};
const MAP = {};
for (const [c, keys] of Object.entries(CABINET_KEYS)) {
  for (const k of keys) MAP[k.length === 1 ? k.toLowerCase() : k] = c;
}
const held = Object.create(null), just = Object.create(null);
window.addEventListener('keydown', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const c = MAP[k]; if (!c) return;
  if (!held[c]) just[c] = true; held[c] = true;
  if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const c = MAP[k]; if (c) held[c] = false;
});
function tap(c) { if (just[c]) { just[c] = false; return true; } return false; }

let profile = { name: '', shirt: 0, skin: 0, hair: 0 };
let board = [];
let navCD = 0;
let navHeld = false;
const NAV_FIRST = 0.32; // delay before key-repeat
const NAV_REPEAT = 0.14;

function store() {
  if (window.platanusArcadeStorage) return window.platanusArcadeStorage;
  return {
    async get(k) {
      try {
        const r = localStorage.getItem(k);
        return r == null ? { found: false, value: null } : { found: true, value: JSON.parse(r) };
      } catch (_) { return { found: false, value: null }; }
    },
    async set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
  };
}
async function loadData() {
  const r = await store().get(HS);
  if (!r.found || !r.value) return;
  const v = r.value;
  if (Array.isArray(v.board)) {
    board = v.board.filter((e) => e && typeof e.score === 'number' && typeof e.name === 'string').slice(0, TOP_N);
  }
  if (v.profile && typeof v.profile === 'object') {
    profile.name = String(v.profile.name || '').slice(0, MAX_NAME);
    profile.shirt = Math.max(0, Math.min(SHIRTS.length - 1, v.profile.shirt | 0));
    profile.skin = Math.max(0, Math.min(SKINS.length - 1, v.profile.skin | 0));
    profile.hair = Math.max(0, Math.min(HAIRS.length - 1, v.profile.hair | 0));
  }
}
function saveData() {
  // fire-and-forget — never block UI on storage
  try {
    const p = store().set(HS, { board, profile: { ...profile } });
    if (p && typeof p.then === 'function') p.catch(() => {});
  } catch (_) {}
}
function pushScore(entry) {
  board.push(entry);
  board.sort((a, b) => b.score - a.score);
  board = board.slice(0, TOP_N);
  saveData();
}
function topScore() { return board.length ? board[0].score : 0; }

let actx, muted = false;
function ac() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function beep(f, d, type, vol, slide) {
  if (muted) return;
  try {
    const a = ac(), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, a.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), a.currentTime + d);
    g.gain.setValueAtTime(vol || 0.06, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + d);
    o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + d);
  } catch (_) {}
}
const SFX = {
  shoot() { beep(520, 0.04, 'square', 0.05); },
  hit() { beep(180, 0.05, 'sawtooth', 0.06); },
  kill() { beep(660, 0.05); setTimeout(() => beep(880, 0.07), 40); },
  hurt() { beep(110, 0.22, 'sawtooth', 0.1, -70); },
  power() { beep(440, 0.05); setTimeout(() => beep(990, 0.1), 60); },
  dash() { beep(200, 0.08, 'triangle', 0.07, 400); },
  wave() { beep(90, 0.15, 'square', 0.07); setTimeout(() => beep(140, 0.12), 80); },
  over() { beep(280, 0.15, 'sawtooth', 0.09, -180); setTimeout(() => beep(80, 0.35), 150); },
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.12), i * 80)); },
  ui() { beep(700, 0.03); },
  pickup() { beep(1000, 0.05, 'triangle', 0.05); },
  ok() { beep(880, 0.06); setTimeout(() => beep(1100, 0.08), 50); },
};

function tex(sc, key, w, h, draw) {
  if (sc.textures.exists(key)) sc.textures.remove(key);
  const g = sc.make.graphics({ x: 0, y: 0, add: false });
  draw(g); g.generateTexture(key, w, h); g.destroy();
}
function px(g, x, y, s, c, a) { g.fillStyle(c, a == null ? 1 : a); g.fillRect(x * s, y * s, s, s); }

function makeHero(sc, key, shirt, skin, hair) {
  const S = 3;
  tex(sc, key, 16 * S, 16 * S, (g) => {
    for (let y = 2; y <= 6; y++) for (let x = 5; x <= 10; x++) px(g, x, y, S, skin);
    for (let x = 5; x <= 10; x++) px(g, x, 2, S, hair);
    px(g, 5, 3, S, hair); px(g, 10, 3, S, hair);
    px(g, 9, 4, S, 0x111); px(g, 10, 4, S, 0x111);
    for (let y = 7; y <= 11; y++) for (let x = 5; x <= 10; x++) px(g, x, y, S, shirt);
    for (let x = 6; x <= 9; x++) px(g, x, 9, S, C.green);
    for (let y = 12; y <= 14; y++) { px(g, 6, y, S, 0x222); px(g, 9, y, S, 0x222); }
    for (let x = 11; x <= 14; x++) px(g, x, 8, S, 0x555);
    px(g, 14, 7, S, C.cyan); px(g, 14, 8, S, C.cyan);
  });
}
function refreshHero(sc) {
  makeHero(sc, 'hero', SHIRTS[profile.shirt], SKINS[profile.skin], HAIRS[profile.hair]);
}

function buildTex(sc) {
  refreshHero(sc);
  tex(sc, 'bug', 14, 14, (g) => {
    g.fillStyle(C.red, 0.3); g.fillCircle(7, 7, 7);
    g.fillStyle(C.red, 1); g.fillEllipse(7, 7, 11, 8);
    g.fillStyle(0xaa0000, 1); g.fillCircle(4, 5, 2); g.fillCircle(10, 5, 2);
  });
  tex(sc, 'bugF', 16, 16, (g) => {
    g.fillStyle(C.orange, 0.3); g.fillCircle(8, 8, 8);
    g.fillStyle(C.orange, 1); g.fillEllipse(8, 8, 13, 10);
    g.fillStyle(0xff2200, 1); g.fillCircle(5, 6, 2.5); g.fillCircle(11, 6, 2.5);
  });
  tex(sc, 'bugB', 28, 28, (g) => {
    g.fillStyle(C.pink, 0.25); g.fillCircle(14, 14, 14);
    g.fillStyle(C.pink, 1); g.fillEllipse(14, 14, 22, 16);
    g.fillStyle(C.red, 1); g.fillCircle(8, 11, 4); g.fillCircle(20, 11, 4);
  });
  tex(sc, 'bullet', 10, 6, (g) => {
    g.fillStyle(C.lime, 1); g.fillRoundedRect(0, 1, 10, 4, 2);
    g.fillStyle(0xffffff, 0.8); g.fillRect(6, 2, 3, 2);
  });
  tex(sc, 'bolt', 12, 12, (g) => {
    g.fillStyle(C.cyan, 1); g.fillCircle(6, 6, 5);
    g.fillStyle(0xffffff, 1); g.fillCircle(6, 6, 2);
  });
  tex(sc, 'hp', 14, 14, (g) => {
    g.fillStyle(C.red, 1); g.fillCircle(4, 5, 4); g.fillCircle(10, 5, 4); g.fillTriangle(1, 6, 13, 6, 7, 13);
  });
  tex(sc, 'rapid', 14, 14, (g) => {
    g.fillStyle(C.gold, 1); g.fillCircle(7, 7, 6);
    g.fillStyle(C.bg, 1); g.fillTriangle(7, 2, 11, 10, 3, 10);
  });
  tex(sc, 'shield', 14, 14, (g) => {
    g.fillStyle(C.cyan, 1); g.fillCircle(7, 7, 6); g.fillStyle(C.bg, 1); g.fillCircle(7, 7, 3);
  });
  tex(sc, 'xp', 10, 10, (g) => {
    g.fillStyle(C.lime, 1); g.fillCircle(5, 5, 4); g.fillStyle(C.green, 1); g.fillCircle(5, 5, 2);
  });
  tex(sc, 'dot', 4, 4, (g) => { g.fillStyle(0xffffff, 1); g.fillCircle(2, 2, 2); });
  tex(sc, 'floor', W, H, (g) => {
    g.fillStyle(0x080808, 1); g.fillRect(0, 0, W, H);
    g.lineStyle(1, C.lime, 0.07);
    for (let x = 40; x < W; x += 40) { g.beginPath(); g.moveTo(x, 40); g.lineTo(x, H - 40); g.strokePath(); }
    for (let y = 40; y < H; y += 40) { g.beginPath(); g.moveTo(40, y); g.lineTo(W - 40, y); g.strokePath(); }
    g.lineStyle(2, C.lime, 0.35); g.strokeRect(36, 36, W - 72, H - 72);
  });
  tex(sc, 'scan', W, H, (g) => {
    g.fillStyle(0x000000, 0.12);
    for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
  });
  tex(sc, 'glow', 40, 40, (g) => {
    g.fillStyle(C.lime, 0.1); g.fillCircle(20, 20, 20);
    g.fillStyle(C.lime, 0.2); g.fillCircle(20, 20, 10);
  });
}

new Phaser.Game({
  type: Phaser.AUTO, width: W, height: H, parent: 'game-root', backgroundColor: '#050505',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  scene: { create, update },
});

function create() {
  buildTex(this);
  this.mode = 'title'; this.hi = 0; this.root = this.add.container(0, 0);
  this.fx = this.add.particles(0, 0, 'dot', {
    speed: { min: 40, max: 200 }, lifespan: 400, scale: { start: 1.2, end: 0 },
    quantity: 0, emitting: false, gravityY: 80,
  }).setDepth(30);
  loadData().then(() => {
    this.hi = topScore();
    if (this.hiTxt) this.hiTxt.setText('RÉCORD  ' + this.hi);
    if (this.mode === 'title') title.call(this);
  });
  title.call(this);
}

function clearColliders(s) {
  try {
    const q = s.physics?.world?.colliders;
    if (!q) return;
    const list = (q.getActive && q.getActive().slice()) || (q.entries && q.entries.slice()) || [];
    for (let i = list.length - 1; i >= 0; i--) {
      try { list[i].destroy(); } catch (_) {}
    }
  } catch (_) {}
}
function wipe(s) {
  try { if (s.endUI) { s.endUI.destroy(true); s.endUI = null; } } catch (_) { s.endUI = null; }
  try { s.tweens.killAll(); } catch (_) {}
  try { s.time.removeAllEvents(); } catch (_) {}
  clearColliders(s);
  ['bugs', 'bullets', 'drops', 'ebullets'].forEach((k) => {
    try {
      if (s[k]) {
        (s[k].getChildren() || []).slice().forEach((o) => {
          try { if (o.body) o.body.enable = false; o.destroy(); } catch (_) {}
        });
        try { s[k].clear(true, true); } catch (_) {}
        try { s[k].destroy(true); } catch (_) {}
      }
    } catch (_) {}
    s[k] = null;
  });
  try { if (s.player) { if (s.player.body) s.player.body.enable = false; s.player.destroy(); } } catch (_) {}
  s.player = null;
  try { if (s.root) s.root.destroy(true); } catch (_) {}
  s.root = s.add.container(0, 0);
  s.kbCells = null; s.custUI = null;
  s._dying = false; s._wantEnd = false;
}
function scan(s) { s.root.add(s.add.image(W / 2, H / 2, 'scan').setDepth(50).setAlpha(0.5)); }
function boom(s, x, y, tint, n) { s.fx.setParticleTint(tint); s.fx.emitParticleAt(x, y, n || 10); }
function floatT(s, x, y, msg, col, big) {
  const t = s.add.text(x, y, msg, {
    fontFamily: F, fontSize: big ? '20px' : '14px', color: col, fontStyle: 'bold',
    stroke: '#050505', strokeThickness: 4,
  }).setOrigin(0.5).setDepth(40).setScale(0.5);
  s.root.add(t);
  s.tweens.add({ targets: t, y: y - 40, alpha: 0, scale: 1, duration: 600, onComplete: () => t.destroy() });
}
function toast(s, msg, col) {
  const hex = '#' + (col >>> 0).toString(16).padStart(6, '0');
  const t = s.add.text(W / 2, 80, msg, {
    fontFamily: F, fontSize: '22px', color: hex, fontStyle: 'bold', stroke: '#050505', strokeThickness: 5,
  }).setOrigin(0.5).setDepth(46).setScale(0.5).setAlpha(0);
  s.root.add(t);
  s.tweens.add({
    targets: t, scale: 1, alpha: 1, y: 68, duration: 200, ease: 'Back.out',
    yoyo: true, hold: 650, onComplete: () => t.destroy(),
  });
}
function ring(s, x, y, col) {
  const r = s.add.circle(x, y, 8, col, 0).setStrokeStyle(2, col, 0.9).setDepth(20);
  s.root.add(r);
  s.tweens.add({ targets: r, scale: 3.5, alpha: 0, duration: 300, onComplete: () => r.destroy() });
}

function joyStep(dt) {
  // clear one-shot flags so they don't leak into other handlers
  const edgeL = tap('P1_L'), edgeR = tap('P1_R'), edgeU = tap('P1_U'), edgeD = tap('P1_D');
  const anyHeld = !!(held.P1_L || held.P1_R || held.P1_U || held.P1_D);
  if (!anyHeld) {
    navHeld = false;
    navCD = 0;
    // still allow pure edge if somehow released same frame (already consumed above)
  }
  if (navCD > 0) navCD -= dt;

  let dx = 0, dy = 0;
  // prefer edges first — one physical press = one step
  if (edgeL) dx = -1;
  else if (edgeR) dx = 1;
  if (edgeU) dy = -1;
  else if (edgeD) dy = 1;

  if (dx || dy) {
    navHeld = anyHeld;
    navCD = NAV_FIRST; // wait longer before repeating
    return { dx, dy };
  }

  // key-repeat only after holding past NAV_FIRST
  if (anyHeld && navHeld && navCD <= 0) {
    if (held.P1_L) dx = -1;
    else if (held.P1_R) dx = 1;
    if (held.P1_U) dy = -1;
    else if (held.P1_D) dy = 1;
    if (dx || dy) {
      navCD = NAV_REPEAT;
      return { dx, dy };
    }
  }
  return null;
}

function corner(s, x, y, dx, dy) {
  const g = s.add.graphics().setDepth(5);
  g.lineStyle(2, C.lime, 0.55);
  g.beginPath(); g.moveTo(x, y + dy * 18); g.lineTo(x, y); g.lineTo(x + dx * 18, y); g.strokePath();
  s.root.add(g);
}

function title() {
  wipe(this); this.mode = 'title'; ac();
  if (this.cameras?.main?.resetFX) this.cameras.main.resetFX();
  this.cameras.main.setAlpha(1);
  refreshHero(this);
  const R = this.root;
  R.add(this.add.image(W / 2, H / 2, 'floor').setAlpha(0.95));
  R.add(this.add.rectangle(W / 2, H / 2, W, H, C.bg, 0.42));

  // ambient lime bloom behind the stage
  const bloom = this.add.image(W / 2, 250, 'glow').setScale(14).setAlpha(0.28).setTint(C.lime);
  R.add(bloom);
  this.tweens.add({ targets: bloom, alpha: 0.12, scale: 16, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  const bloomR = this.add.image(W / 2 + 180, 140, 'glow').setScale(7).setAlpha(0.14).setTint(C.red);
  R.add(bloomR);
  this.tweens.add({ targets: bloomR, alpha: 0.05, duration: 900, yoyo: true, repeat: -1 });

  // top chrome
  R.add(this.add.rectangle(W / 2, 20, W, 40, 0x070706, 0.92));
  R.add(this.add.rectangle(W / 2, 40, W, 2, C.lime, 0.55));
  R.add(this.add.text(18, 12, 'PLATANUS HACK 26', {
    fontFamily: F, fontSize: '13px', color: '#A3FF12', fontStyle: 'bold',
  }));
  this.alertDot = this.add.circle(W / 2 - 78, 20, 5, C.red);
  R.add(this.alertDot);
  this.tweens.add({ targets: this.alertDot, alpha: 0.15, duration: 380, yoyo: true, repeat: -1 });
  R.add(this.add.text(W / 2 - 66, 12, 'INCIDENT · SEV-1', {
    fontFamily: F, fontSize: '13px', color: '#FF3535', fontStyle: 'bold',
  }));
  this.muteLbl = this.add.text(W - 18, 12, muted ? 'MUTE' : 'AUDIO', {
    fontFamily: F, fontSize: '12px', color: '#A3FF12',
  }).setOrigin(1, 0);
  R.add(this.muteLbl);

  corner(this, 28, 56, 1, 1); corner(this, W - 28, 56, -1, 1);
  corner(this, 28, H - 56, 1, -1); corner(this, W - 28, H - 56, -1, -1);

  // brand stack — hero-level
  R.add(this.add.text(W / 2 + 4, 92, 'ON-CALL', {
    fontFamily: F, fontSize: '72px', color: '#1a1a10', fontStyle: 'bold',
  }).setOrigin(0.5));
  const titleTx = this.add.text(W / 2, 88, 'ON-CALL', {
    fontFamily: F, fontSize: '72px', color: '#DFFF00', fontStyle: 'bold',
    stroke: '#050505', strokeThickness: 10,
  }).setOrigin(0.5);
  R.add(titleTx);
  this.tweens.add({
    targets: titleTx, scaleX: 1.03, scaleY: 0.97, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut',
  });
  R.add(this.add.rectangle(W / 2, 132, 220, 3, C.lime, 0.85));
  R.add(this.add.text(W / 2 - 8, 150, 'EL ÚLTIMO TURNO', {
    fontFamily: F, fontSize: '18px', color: '#E8E4D0', letterSpacing: 4,
  }).setOrigin(0.5));
  this.cursor = this.add.text(W / 2 + 108, 150, '_', {
    fontFamily: F, fontSize: '18px', color: '#A3FF12',
  }).setOrigin(0.5);
  R.add(this.cursor);

  // live pager ticker
  this.termI = 0; this.termT = 0;
  R.add(this.add.rectangle(W / 2, 184, 420, 26, 0x0c0c0a, 0.85).setStrokeStyle(1, C.lime, 0.35));
  this.termTxt = this.add.text(W / 2, 184, '> ' + TERM[0], {
    fontFamily: F, fontSize: '13px', color: '#A3FF12',
  }).setOrigin(0.5);
  R.add(this.termTxt);

  // orbiting bugs around stage
  this.orbit = [];
  for (let i = 0; i < 8; i++) {
    const b = this.add.image(W / 2, 290, i % 2 ? 'bug' : 'bugF').setAlpha(0.55).setScale(1.15);
    R.add(b);
    this.orbit.push({ b, a: (i / 8) * Math.PI * 2, r: 100 + (i % 3) * 28, sp: 0.7 + i * 0.06 });
  }

  // hero pedestal
  R.add(this.add.ellipse(W / 2, 318, 90, 22, C.lime, 0.12).setStrokeStyle(1, C.lime, 0.4));
  const pulse = this.add.circle(W / 2, 278, 42, C.lime, 0).setStrokeStyle(2, C.lime, 0.5);
  R.add(pulse);
  this.tweens.add({ targets: pulse, scale: 1.35, alpha: 0, duration: 1200, repeat: -1 });
  this.hero = this.add.image(W / 2, 268, 'hero').setScale(2.4);
  R.add(this.hero);
  this.heroY = 268;

  // record + top panel
  this.hi = topScore();
  R.add(this.add.rectangle(W / 2, 372, 340, board.length ? 78 : 36, 0x0a0a08, 0.8)
    .setStrokeStyle(1, C.lime, 0.4));
  this.hiTxt = this.add.text(W / 2, board.length ? 348 : 372, 'RÉCORD  ' + this.hi, {
    fontFamily: F, fontSize: '15px', color: '#DFFF00', fontStyle: 'bold',
  }).setOrigin(0.5);
  R.add(this.hiTxt);
  if (board.length) {
    board.slice(0, 3).forEach((e, i) => {
      const col = i === 0 ? '#FFD700' : '#E8E4D0';
      R.add(this.add.text(W / 2, 366 + i * 16,
        (i + 1) + '  ' + (e.name || '???').padEnd(8, ' ') + ' ' + e.score,
        { fontFamily: F, fontSize: '12px', color: col }).setOrigin(0.5));
    });
  }

  // CTA
  const ctaBg = this.add.rectangle(W / 2, 460, 310, 52, C.lime).setStrokeStyle(3, 0xffffff, 0.35);
  R.add(ctaBg);
  this.tweens.add({
    targets: ctaBg, scaleX: 1.03, scaleY: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut',
  });
  R.add(this.add.text(W / 2, 460, '▶  CREAR ON-CALL', {
    fontFamily: F, fontSize: '22px', color: '#050505', fontStyle: 'bold',
  }).setOrigin(0.5));
  const hint = this.add.text(W / 2, 504, 'START  ·  BOTÓN 1', {
    fontFamily: F, fontSize: '14px', color: '#E8E4D0',
  }).setOrigin(0.5);
  R.add(hint);
  this.tweens.add({ targets: hint, alpha: 0.2, duration: 520, yoyo: true, repeat: -1 });
  R.add(this.add.text(W / 2, 528, 'Personaliza tu ingeniero y deja tu nombre en el top', {
    fontFamily: F, fontSize: '12px', color: '#5a5a48',
  }).setOrigin(0.5));

  // bottom status bar
  R.add(this.add.rectangle(W / 2, H - 16, W, 32, 0x070706, 0.95));
  R.add(this.add.rectangle(W / 2, H - 32, W, 2, C.lime, 0.35));
  R.add(this.add.text(18, H - 24, 'PAGER  ON   ·   AMMO REGEN   ·   WAVES ∞', {
    fontFamily: F, fontSize: '11px', color: '#6a6a55',
  }));
  R.add(this.add.text(W - 18, H - 24, 'v1.0 PROD', {
    fontFamily: F, fontSize: '11px', color: '#6a6a55',
  }).setOrigin(1, 0));

  scan(this);
}

function setup() {
  wipe(this); this.mode = 'setup'; ac(); SFX.ui();
  navCD = 0; navHeld = false;
  // consume leftover direction taps from title START
  tap('P1_U'); tap('P1_D'); tap('P1_L'); tap('P1_R');
  refreshHero(this);
  const R = this.root;
  R.add(this.add.rectangle(W / 2, H / 2, W, H, C.bg, 1));
  R.add(this.add.image(W / 2, H / 2, 'floor').setAlpha(0.25));
  R.add(this.add.text(W / 2, 24, 'TU ON-CALL', {
    fontFamily: F, fontSize: '26px', color: '#DFFF00', fontStyle: 'bold',
  }).setOrigin(0.5));
  R.add(this.add.text(W / 2, 52, 'Joystick navega  ·  Botón 1 elige  ·  Botón 2 borrar  ·  START jugar', {
    fontFamily: F, fontSize: '11px', color: '#A3FF12',
  }).setOrigin(0.5));

  // character preview
  this.setupHero = this.add.image(140, 160, 'hero').setScale(2.4);
  R.add(this.setupHero);
  R.add(this.add.text(140, 230, 'LOOK', { fontFamily: F, fontSize: '12px', color: '#A3FF12' }).setOrigin(0.5));

  // customization rows: shirt / skin / hair
  this.custFocus = 0; // 0 shirt, 1 skin, 2 hair, then keyboard takes over when in kb mode
  this.setupPart = 'cust'; // 'cust' | 'kb'
  this.custUI = [];
  const rows = [
    { label: 'POLERA', opts: SHIRTS, key: 'shirt' },
    { label: 'PIEL', opts: SKINS, key: 'skin' },
    { label: 'PELO', opts: HAIRS, key: 'hair' },
  ];
  rows.forEach((row, ri) => {
    const y = 95 + ri * 48;
    const lab = this.add.text(250, y, row.label, { fontFamily: F, fontSize: '13px', color: '#E8E4D0' });
    R.add(lab);
    const cells = [];
    const gap = row.opts.length > 8 ? 34 : 38;
    const bw = row.opts.length > 8 ? 26 : 30;
    const bh = 24;
    row.opts.forEach((col, ci) => {
      const x = 320 + ci * gap;
      const box = this.add.rectangle(x, y + 6, bw, bh, col).setStrokeStyle(2, 0x3a3a30);
      R.add(box);
      cells.push(box);
    });
    this.custUI.push({ key: row.key, cells, lab });
  });
  paintCust(this);

  // name field
  R.add(this.add.text(W / 2, 270, 'NOMBRE', { fontFamily: F, fontSize: '14px', color: '#A3FF12' }).setOrigin(0.5));
  this.nameBox = this.add.rectangle(W / 2, 300, 280, 40, C.dim).setStrokeStyle(2, C.lime);
  this.nameTxt = this.add.text(W / 2, 300, nameDisplay(), {
    fontFamily: F, fontSize: '24px', color: '#DFFF00', fontStyle: 'bold',
  }).setOrigin(0.5);
  R.add(this.nameBox); R.add(this.nameTxt);

  // keyboard
  this.kbR = 0; this.kbC = 0;
  this.kbCells = [];
  const ox = 120, oy = 350, cw = 62, ch = 42;
  for (let r = 0; r < 4; r++) {
    this.kbCells[r] = [];
    for (let c = 0; c < 9; c++) {
      const label = KEYS[r][c];
      // skip duplicate visual cells for wide keys
      if (c > 0 && KEYS[r][c] === KEYS[r][c - 1]) {
        this.kbCells[r][c] = this.kbCells[r][c - 1];
        continue;
      }
      let w = cw - 6;
      if (label === 'DEL') w = cw * 2 - 6;
      if (label === 'ESP') w = cw * 2 - 6;
      if (label === 'OK') w = cw * 5 - 6;
      const x = ox + c * cw + w / 2;
      const y = oy + r * ch;
      const bg = this.add.rectangle(x, y, w, ch - 6, C.dim).setStrokeStyle(2, 0x444433);
      const tx = this.add.text(x, y, label === 'ESP' ? '␣' : label, {
        fontFamily: F, fontSize: label.length > 2 ? '14px' : '18px', color: '#E8E4D0', fontStyle: 'bold',
      }).setOrigin(0.5);
      R.add(bg); R.add(tx);
      this.kbCells[r][c] = { bg, tx, label, x, y, w };
      // fill span
      let span = 1;
      while (c + span < 9 && KEYS[r][c + span] === label) span++;
      for (let k = 1; k < span; k++) this.kbCells[r][c + k] = this.kbCells[r][c];
    }
  }
  paintKb(this);
  this.muteLbl = this.add.text(W - 14, 12, muted ? 'MUTE' : 'AUDIO', {
    fontFamily: F, fontSize: '12px', color: '#A3FF12',
  }).setOrigin(1, 0);
  R.add(this.muteLbl);
  scan(this);
}

function nameDisplay() {
  const n = profile.name || '';
  return (n + '_'.repeat(MAX_NAME - n.length)).slice(0, MAX_NAME);
}
function paintCust(s) {
  if (!s.custUI) return;
  s.custUI.forEach((row, ri) => {
    const idx = profile[row.key];
    row.cells.forEach((box, ci) => {
      const on = ci === idx;
      const focus = s.setupPart === 'cust' && s.custFocus === ri;
      box.setStrokeStyle(focus && on ? 3 : 2, focus && on ? C.lime : (on ? C.green : 0x3a3a30));
      box.setScale(on ? 1.15 : 1);
    });
    row.lab.setColor(s.setupPart === 'cust' && s.custFocus === ri ? '#DFFF00' : '#E8E4D0');
  });
  if (s.setupHero) {
    refreshHero(s);
    s.setupHero.setTexture('hero');
  }
}
function paintKb(s) {
  if (!s.kbCells) return;
  const seen = new Set();
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = s.kbCells[r][c];
      if (!cell || seen.has(cell)) continue;
      seen.add(cell);
      const sel = s.setupPart === 'kb' && s.kbCells[s.kbR][s.kbC] === cell;
      cell.bg.setFillStyle(sel ? C.lime : C.dim);
      cell.tx.setColor(sel ? '#050505' : '#E8E4D0');
      cell.bg.setStrokeStyle(2, sel ? C.green : 0x444433);
    }
  }
  if (s.nameTxt) s.nameTxt.setText(nameDisplay());
  if (s.nameBox) s.nameBox.setStrokeStyle(2, s.setupPart === 'kb' ? C.lime : C.dim);
}

function keyStartCol(row, c) {
  const lab = KEYS[row][c];
  while (c > 0 && KEYS[row][c - 1] === lab) c--;
  return c;
}
function moveKb(s, dx, dy) {
  if (dy) {
    s.kbR = Phaser.Math.Clamp(s.kbR + dy, 0, 3);
    s.kbC = keyStartCol(s.kbR, Phaser.Math.Clamp(s.kbC, 0, 8));
  }
  if (dx > 0) {
    const cur = KEYS[s.kbR][s.kbC];
    let c = s.kbC;
    while (c < 8 && KEYS[s.kbR][c] === cur) c++;
    if (c <= 8 && KEYS[s.kbR][c] !== cur) s.kbC = c;
  } else if (dx < 0) {
    let c = keyStartCol(s.kbR, s.kbC);
    if (c > 0) s.kbC = keyStartCol(s.kbR, c - 1);
  }
}
function kbSelect(s) {
  const label = KEYS[s.kbR][s.kbC];
  SFX.ui();
  if (label === 'DEL') {
    profile.name = profile.name.slice(0, -1);
  } else if (label === 'ESP') {
    if (profile.name.length < MAX_NAME) profile.name += ' ';
  } else if (label === 'OK') {
    finishSetup(s);
    return;
  } else if (profile.name.length < MAX_NAME) {
    profile.name += label;
  }
  paintKb(s);
}

function finishSetup(s) {
  profile.name = (profile.name || 'DEV').trim().slice(0, MAX_NAME) || 'DEV';
  saveData(); // non-blocking
  SFX.ok();
  play.call(s);
}

function play() {
  try {
    wipe(this);
  } catch (_) {
    try { clearColliders(this); } catch (__) {}
    this.root = this.add.container(0, 0);
    this.endUI = null;
  }
  this.mode = 'play';
  this.alive = true;
  this._dying = false;
  this._wantEnd = false;
  this.endUI = null;
  ac(); SFX.ui();
  try {
    if (this.cameras?.main?.resetFX) this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
  } catch (_) {}
  refreshHero(this);
  const R = this.root;
  R.setVisible(true);
  R.add(this.add.image(W / 2, H / 2, 'floor'));
  this.physics.world.setBounds(48, 48, W - 96, H - 96);

  this.score = 0; this.disp = 0; this.lives = 3; this.wave = 0;
  this.kills = 0; this.combo = 0; this.bestCombo = 0;
  this.t0 = 0; this.fireCd = 0; this.dashCd = 0; this.inv = 1; // brief spawn protection
  this.rapid = 0; this.shield = 0; this.spawning = false;
  this.waveClear = true; this.facing = 0; this.egg = false; this.upN = 0;
  this.mult = 1; this.boss = null;
  this.ammo = 12; this.ammoMax = 12; this.ammoRegen = 0;

  this.flash = this.add.rectangle(W / 2, H / 2, W, H, C.red, 0).setDepth(2);
  R.add(this.flash);

  this.player = this.physics.add.sprite(W / 2, H / 2, 'hero').setDepth(12).setCollideWorldBounds(true);
  this.player.setDrag(900).setMaxVelocity(260);
  this.player.body.setSize(28, 28);
  this.player.clearTint();
  this.pGlow = this.add.image(W / 2, H / 2, 'glow').setDepth(11).setAlpha(0.45);
  R.add(this.pGlow);

  this.bugs = this.physics.add.group();
  this.bullets = this.physics.add.group();
  this.ebullets = this.physics.add.group();
  this.drops = this.physics.add.group();
  // Fresh colliders every run (old ones cleared in wipe)
  this.physics.add.overlap(this.bullets, this.bugs, (b, e) => hitBug(this, b, e));
  this.physics.add.overlap(this.player, this.bugs, (_, e) => hurt(this, e));
  this.physics.add.overlap(this.player, this.ebullets, (_, b) => { if (b.active) { b.destroy(); hurt(this, null); } });
  this.physics.add.overlap(this.player, this.drops, (_, d) => pickup(this, d));

  const st = { fontFamily: F, fontSize: '16px', color: '#E8E4D0' };
  this.hudScore = this.add.text(14, 8, 'PUNTAJE 0', st).setDepth(60);
  this.hudHi = this.add.text(14, 28, 'RÉCORD ' + topScore(), { ...st, fontSize: '12px', color: '#A3FF12' }).setDepth(60);
  this.hudName = this.add.text(14, 46, profile.name || 'DEV', { ...st, fontSize: '12px', color: '#DFFF00' }).setDepth(60);
  this.hudWave = this.add.text(W / 2, 8, 'OLEADA 1', { fontFamily: F, fontSize: '16px', color: '#DFFF00', fontStyle: 'bold' }).setOrigin(0.5, 0).setDepth(60);
  this.hudLives = this.add.text(W - 14, 8, '♥♥♥', { fontFamily: F, fontSize: '20px', color: '#FF3535' }).setOrigin(1, 0).setDepth(60);
  this.hudCombo = this.add.text(W / 2, 30, '', { fontFamily: F, fontSize: '14px', color: '#A3FF12' }).setOrigin(0.5, 0).setDepth(60);
  this.hudAmmo = this.add.text(14, H - 36, 'BALAS 12/12', { fontFamily: F, fontSize: '14px', color: '#DFFF00' }).setDepth(60);
  R.add(this.add.rectangle(14, H - 14, 140, 8, C.dim).setOrigin(0, 0.5).setDepth(60));
  this.ammoBar = this.add.rectangle(14, H - 14, 140, 8, C.lime).setOrigin(0, 0.5).setDepth(61);
  this.hudHelp = this.add.text(W / 2, H - 18, 'BOTÓN 1 disparar   ·   BOTÓN 2 dash', {
    fontFamily: F, fontSize: '12px', color: '#3a3a30',
  }).setOrigin(0.5).setDepth(60);
  this.muteLbl = this.add.text(W - 14, 36, muted ? 'MUTE' : 'AUDIO', {
    fontFamily: F, fontSize: '11px', color: '#A3FF12',
  }).setOrigin(1, 0).setDepth(60);
  this.warn = this.add.text(W / 2, H / 2, '', {
    fontFamily: F, fontSize: '36px', color: '#DFFF00', fontStyle: 'bold',
    stroke: '#050505', strokeThickness: 6,
  }).setOrigin(0.5).setDepth(45).setAlpha(0);
  [this.hudScore, this.hudHi, this.hudName, this.hudWave, this.hudLives, this.hudCombo, this.hudAmmo, this.ammoBar, this.hudHelp, this.muteLbl, this.warn]
    .forEach((o) => R.add(o));

  this.terms = [];
  for (let i = 0; i < 4; i++) {
    const t = this.add.text(Phaser.Math.Between(60, W - 200), Phaser.Math.Between(60, H - 60),
      '> ' + Phaser.Utils.Array.GetRandom(TERM), { fontFamily: F, fontSize: '11px', color: '#A3FF12' })
      .setAlpha(0.15).setDepth(1);
    R.add(t); this.terms.push(t);
  }
  scan(this);
  nextWave(this);
}

function nextWave(s) {
  s.wave++;
  s.waveClear = false;
  s.spawning = true;
  s.combo = 0;
  SFX.wave();
  s.hudWave.setText('OLEADA ' + s.wave);
  s.warn.setText('OLEADA ' + s.wave).setAlpha(1).setScale(0.4).setColor('#DFFF00');
  s.tweens.add({ targets: s.warn, scale: 1.15, duration: 250, ease: 'Back.out' });
  s.tweens.add({ targets: s.warn, alpha: 0, delay: 900, duration: 400 });
  const n = Math.min(28, 4 + s.wave * 2 + Math.floor(s.wave / 2));
  const hasFast = s.wave >= 2;
  const hasBoss = s.wave % 4 === 0;
  s.ammo = Math.min(s.ammoMax, s.ammo + 2);
  s.ammoMax = Math.min(24, 12 + Math.floor(s.wave / 3));
  for (let i = 0; i < n; i++) {
    s.time.delayedCall(350 + i * Math.max(90, 220 - s.wave * 6), () => {
      if (!s.alive || s.mode !== 'play') return;
      const type = hasFast && Math.random() < Math.min(0.55, 0.25 + s.wave * 0.02) ? 'fast' : 'normal';
      spawnBug(s, type);
      if (i === n - 1) {
        s.spawning = false;
        if (hasBoss) s.time.delayedCall(500, () => { if (s.alive) spawnBug(s, 'boss'); });
      }
    });
  }
}
function fireDelay(s) {
  const base = Math.max(0.08, 0.30 - s.wave * 0.015);
  return s.rapid > 0 ? Math.max(0.06, base * 0.55) : base;
}
function spawnBug(s, type) {
  const side = Phaser.Math.Between(0, 3);
  let x, y;
  if (side === 0) { x = Phaser.Math.Between(60, W - 60); y = 60; }
  else if (side === 1) { x = Phaser.Math.Between(60, W - 60); y = H - 60; }
  else if (side === 2) { x = 60; y = Phaser.Math.Between(60, H - 60); }
  else { x = W - 60; y = Phaser.Math.Between(60, H - 60); }
  let key = 'bug', hp = 1, spd = Math.min(160, 70 + s.wave * 5), pts = 50, scale = 1.3;
  if (type === 'fast') { key = 'bugF'; hp = 1; spd = Math.min(220, 125 + s.wave * 6); pts = 80; scale = 1.1; }
  if (type === 'boss') { key = 'bugB'; hp = 10 + s.wave * 2; spd = Math.min(90, 50 + s.wave); pts = 500; scale = 1.6; }
  const e = s.bugs.create(x, y, key);
  e.setDepth(8).setScale(0).setCollideWorldBounds(true).setBounce(1);
  e.setData('hp', hp); e.setData('pts', pts); e.setData('spd', spd); e.setData('type', type);
  e.setData('shot', 0);
  e.body.setCircle(key === 'bugB' ? 12 : 6);
  s.tweens.add({ targets: e, scale, duration: 200, ease: 'Back.out' });
  ring(s, x, y, type === 'boss' ? C.pink : C.red);
  if (type === 'boss') { s.boss = e; toast(s, '⚠️ INCIDENTE CRÍTICO', C.pink); SFX.wave(); }
}
function shoot(s) {
  if (s.fireCd > 0 || !s.alive) return;
  if (s.ammo < 1) {
    if (!s._ammoWarn || s.t0 > s._ammoWarn) {
      s._ammoWarn = s.t0 + 0.8;
      floatT(s, s.player.x, s.player.y - 24, 'SIN BALAS', '#FF3535');
      beep(90, 0.06, 'square', 0.04);
    }
    return;
  }
  s.ammo -= 1;
  s.fireCd = fireDelay(s);
  const ang = s.facing;
  const b = s.bullets.create(s.player.x + Math.cos(ang) * 22, s.player.y + Math.sin(ang) * 22, 'bullet');
  b.setDepth(15).setRotation(ang).setScale(1.2);
  s.physics.velocityFromRotation(ang, 480, b.body.velocity);
  b.setData('life', 0.7);
  SFX.shoot();
  s.tweens.add({ targets: s.player, scaleX: 0.85, scaleY: 1.1, duration: 40, yoyo: true });
  if (s.rapid > 0 && s.ammo >= 1) {
    s.ammo -= 1;
    const b2 = s.bullets.create(s.player.x, s.player.y, 'bolt');
    b2.setDepth(15);
    s.physics.velocityFromRotation(ang + (Math.random() * 0.3 - 0.15), 440, b2.body.velocity);
    b2.setData('life', 0.55);
  }
}
function dash(s) {
  if (s.dashCd > 0 || !s.alive) return;
  s.dashCd = 1.1; s.inv = Math.max(s.inv, 0.35);
  const ang = s.facing;
  s.player.setVelocity(Math.cos(ang) * 520, Math.sin(ang) * 520);
  SFX.dash(); ring(s, s.player.x, s.player.y, C.cyan); boom(s, s.player.x, s.player.y, C.cyan, 8);
}
function hitBug(s, bullet, enemy) {
  if (!bullet.active || !enemy.active) return;
  bullet.destroy();
  let hp = enemy.getData('hp') - 1;
  enemy.setData('hp', hp);
  boom(s, enemy.x, enemy.y, C.lime, 5); SFX.hit();
  enemy.setTintFill(0xffffff);
  s.time.delayedCall(50, () => { if (enemy.active) enemy.clearTint(); });
  if (hp <= 0) killBug(s, enemy);
}
function killBug(s, e) {
  if (!e.active) return;
  const x = e.x, y = e.y, pts = e.getData('pts') | 0, type = e.getData('type');
  e.destroy();
  if (s.boss === e) s.boss = null;
  s.kills++; s.combo++;
  if (s.combo > s.bestCombo) s.bestCombo = s.combo;
  const gained = Math.floor(pts * (1 + s.combo * 0.05) * s.mult);
  s.score += gained;
  if (s.score > topScore()) s.hudHi.setText('RÉCORD ' + s.score);
  boom(s, x, y, type === 'boss' ? C.pink : C.lime, type === 'boss' ? 28 : 14);
  ring(s, x, y, C.lime);
  floatT(s, x, y, '+' + gained, '#DFFF00', type === 'boss');
  SFX.kill();
  s.cameras.main.shake(type === 'boss' ? 180 : 40, type === 'boss' ? 0.01 : 0.003);
  const roll = Math.random();
  if (type === 'boss' || roll < 0.18) {
    const kinds = ['xp', 'xp', 'hp', 'rapid', 'shield'];
    const k = type === 'boss' ? (roll < 0.5 ? 'rapid' : 'shield') : kinds[Phaser.Math.Between(0, kinds.length - 1)];
    const d = s.drops.create(x, y, k === 'xp' ? 'xp' : k);
    d.setData('kind', k).setDepth(9).setScale(0);
    s.tweens.add({ targets: d, scale: 1.3, duration: 200, ease: 'Back.out' });
    s.tweens.add({ targets: d, y: y - 6, duration: 500, yoyo: true, repeat: -1 });
    s.time.delayedCall(6000, () => { if (d.active) d.destroy(); });
  }
}
function hurt(s, src) {
  if (!s.alive || s._dying || s.inv > 0 || s.shield > 0) {
    if (s.shield > 0 && src && s.player) boom(s, s.player.x, s.player.y, C.cyan, 6);
    return;
  }
  s.lives--; s.combo = 0; s.inv = 1.5;
  try { SFX.hurt(); } catch (_) {}
  try { s.cameras.main.shake(160, 0.012); } catch (_) {}
  if (s.flash) {
    s.flash.setAlpha(0.35);
    s.tweens.add({ targets: s.flash, alpha: 0, duration: 220 });
  }
  if (s.hudLives) {
    s.hudLives.setText('♥'.repeat(Math.max(0, s.lives)) + '♡'.repeat(Math.max(0, 3 - Math.min(3, s.lives))));
  }
  if (s.player) floatT(s, s.player.x, s.player.y - 20, '¡AUCH!', '#FF3535', true);
  if (s.lives <= 0) die(s);
}
function pickup(s, d) {
  if (!d.active || !s.alive) return;
  const k = d.getData('kind'); d.destroy(); SFX.pickup();
  boom(s, s.player.x, s.player.y, C.gold, 8);
  if (k === 'xp') { s.score += 30; floatT(s, s.player.x, s.player.y, '+30 COMMIT', '#A3FF12'); }
  else if (k === 'hp') { if (s.lives < 5) s.lives++; toast(s, '❤️ +VIDA', C.red); }
  else if (k === 'rapid') { s.ammo = Math.min(s.ammoMax, s.ammo + 8); s.rapid = 6; toast(s, '⚡ +BALAS / FIREHOSE', C.gold); SFX.power(); }
  else if (k === 'shield') { s.shield = 5; s.player.setTint(C.cyan); toast(s, '🛡️ ROLLBACK SHIELD', C.cyan); SFX.power(); }
}
function die(s) {
  if (s._dying || s.mode !== 'play') return;
  s._dying = true;
  s.alive = false;
  s._wantEnd = true; // processed at start of next update — never pause physics here
  s._endSnap = {
    score: s.score | 0, kills: s.kills | 0, wave: s.wave | 0,
    combo: s.bestCombo | 0, name: String(profile.name || 'DEV'),
  };
  if (s.warn) s.warn.setAlpha(0);
  if (s.hudLives) s.hudLives.setText('♡♡♡');
  // Only disable body — do NOT physics.world.pause() inside collision (freezes Phaser)
  try {
    if (s.player) {
      if (s.player.body) { s.player.body.enable = false; s.player.body.setVelocity(0, 0); }
      s.player.setTint(C.red);
    }
  } catch (_) {}
}
function showGameOver(scene) {
  if (!scene || scene.mode === 'end') return;
  const st = scene._endSnap || {
    score: scene.score | 0, kills: scene.kills | 0, wave: scene.wave | 0,
    combo: scene.bestCombo | 0, name: String(profile.name || 'DEV'),
  };
  scene.mode = 'end';
  scene._dying = false;
  scene._wantEnd = false;
  scene._endReady = false;
  scene._endAt = performance.now(); // ignore input for a moment
  // clear any pending edge flags
  ['P1_1', 'P1_2', 'P1_3', 'P1_4', 'P1_5', 'P1_6', 'P1_U', 'P1_D', 'P1_L', 'P1_R', 'START1', 'START2']
    .forEach((k) => { just[k] = false; });

  pushScore({
    name: st.name, score: st.score, wave: st.wave,
    kills: st.kills, shirt: profile.shirt | 0,
  });

  try { if (scene.cameras?.main?.resetFX) scene.cameras.main.resetFX(); scene.cameras.main.setAlpha(1); } catch (_) {}

  // Hide playfield objects without destroying physics groups
  try { if (scene.root) scene.root.setVisible(false); } catch (_) {}
  try { if (scene.player) scene.player.setVisible(false); } catch (_) {}
  try {
    [scene.bugs, scene.bullets, scene.ebullets, scene.drops].forEach((g) => {
      if (!g) return;
      g.getChildren().forEach((o) => { try { o.setVisible(false); if (o.body) o.body.enable = false; } catch (_) {} });
    });
  } catch (_) {}

  if (scene.endUI) { try { scene.endUI.destroy(true); } catch (_) {} }
  const R = scene.add.container(0, 0);
  R.setDepth(10000);
  scene.endUI = R;

  R.add(scene.add.rectangle(W / 2, H / 2, W + 4, H + 4, 0x050505, 1));
  try { SFX.over(); } catch (_) {}

  R.add(scene.add.text(W / 2, 40, 'INCIDENTE SIN RESOLVER', {
    fontFamily: F, fontSize: '28px', color: '#FF3535', fontStyle: 'bold',
  }).setOrigin(0.5));

  let msg = OVER[(Math.random() * OVER.length) | 0];
  if (st.wave >= 8) msg = 'Aguantaste como crack.';
  R.add(scene.add.text(W / 2, 78, '"' + msg + '"', {
    fontFamily: F, fontSize: '13px', color: '#E8E4D0',
  }).setOrigin(0.5));

  R.add(scene.add.text(W / 2, 112, st.name + '  ·  ' + st.score + ' pts  ·  oleada ' + st.wave, {
    fontFamily: F, fontSize: '18px', color: '#DFFF00',
  }).setOrigin(0.5));

  R.add(scene.add.text(W / 2, 155, 'TOP ON-CALL', {
    fontFamily: F, fontSize: '18px', color: '#A3FF12', fontStyle: 'bold',
  }).setOrigin(0.5));

  for (let i = 0; i < TOP_N; i++) {
    const e = board[i];
    let line = (i + 1) + '.  --------';
    let col = '#E8E4D0';
    if (e) {
      const nm = String(e.name != null ? e.name : '???').slice(0, MAX_NAME);
      const pad = (nm + '        ').slice(0, MAX_NAME);
      line = (i + 1) + '.  ' + pad + '   ' + (e.score | 0) + '   oleada ' + (e.wave | 0);
      if (String(e.name) === st.name && (e.score | 0) === st.score) col = '#DFFF00';
    }
    R.add(scene.add.text(W / 2, 190 + i * 30, line, {
      fontFamily: F, fontSize: '16px', color: col,
    }).setOrigin(0.5));
  }

  R.add(scene.add.rectangle(W / 2, H - 100, 300, 48, C.lime));
  R.add(scene.add.text(W / 2, H - 100, 'REINTENTAR  ·  START / ENTER', {
    fontFamily: F, fontSize: '16px', color: '#050505', fontStyle: 'bold',
  }).setOrigin(0.5));
  R.add(scene.add.rectangle(W / 2, H - 46, 300, 48, C.green));
  R.add(scene.add.text(W / 2, H - 46, 'EDITAR / MENÚ  ·  BOTÓN 2', {
    fontFamily: F, fontSize: '16px', color: '#050505', fontStyle: 'bold',
  }).setOrigin(0.5));
  scene.endHint = scene.add.text(W / 2, H - 148, 'Suelta los botones...', {
    fontFamily: F, fontSize: '13px', color: '#A3FF12',
  }).setOrigin(0.5);
  R.add(scene.endHint);
}

function update(_, dtMs) {
  const dt = Math.min(0.05, (dtMs || 16) / 1000);

  // Highest priority: show game over (must run even if physics is weird)
  if (this._wantEnd && this.mode === 'play') {
    try { showGameOver(this); } catch (err) { this._wantEnd = true; }
    return;
  }

  if (tap('P1_3')) {
    muted = !muted; SFX.ui();
    if (this.muteLbl?.active) this.muteLbl.setText(muted ? 'MUTE' : 'AUDIO');
  }

  if (this.mode === 'title') {
    const now = this.time.now;
    (this.orbit || []).forEach((o) => {
      o.a += o.sp * dt;
      o.b.x = W / 2 + Math.cos(o.a) * o.r;
      o.b.y = 290 + Math.sin(o.a) * (o.r * 0.45);
      o.b.angle += 70 * dt;
      o.b.setAlpha(0.35 + 0.3 * Math.abs(Math.sin(o.a)));
    });
    if (this.hero) {
      this.hero.y = (this.heroY || 268) + Math.sin(now / 380) * 7;
      this.hero.angle = Math.sin(now / 900) * 6;
    }
    if (this.cursor) this.cursor.setAlpha((Math.floor(now / 420) % 2) ? 1 : 0.15);
    this.termT = (this.termT || 0) + dt;
    if (this.termT > 1.7 && this.termTxt) {
      this.termT = 0;
      this.termI = ((this.termI || 0) + 1) % TERM.length;
      this.termTxt.setText('> ' + TERM[this.termI]);
    }
    if (tap('START1') || tap('P1_1')) setup.call(this);
    return;
  }

  if (this.mode === 'setup') {
    const step = joyStep(dt);
    if (this.setupPart === 'cust') {
      if (step) {
        SFX.ui();
        if (step.dy < 0) {
          this.custFocus = Math.max(0, this.custFocus - 1);
        } else if (step.dy > 0) {
          if (this.custFocus >= 2) {
            this.setupPart = 'kb'; this.kbR = 0; this.kbC = 0;
          } else {
            this.custFocus += 1;
          }
        }
        if (step.dx && this.setupPart === 'cust') {
          const keys = ['shirt', 'skin', 'hair'];
          const key = keys[this.custFocus];
          const max = key === 'shirt' ? SHIRTS.length : (key === 'skin' ? SKINS.length : HAIRS.length);
          profile[key] = (profile[key] + step.dx + max) % max;
        }
        paintCust(this);
        paintKb(this);
      }
      if (tap('P1_1')) {
        this.setupPart = 'kb'; this.kbR = 0; this.kbC = 0;
        paintCust(this); paintKb(this); SFX.ui();
      }
      if (tap('START1')) finishSetup(this);
    } else {
      if (step) {
        SFX.ui();
        if (step.dy < 0 && this.kbR === 0) {
          this.setupPart = 'cust'; this.custFocus = 2;
          paintCust(this); paintKb(this);
        } else {
          moveKb(this, step.dx || 0, step.dy || 0);
          paintKb(this);
        }
      }
      if (tap('P1_1')) kbSelect(this);
      if (tap('P1_2')) {
        profile.name = profile.name.slice(0, -1); paintKb(this); SFX.ui();
      }
      if (tap('START1')) finishSetup(this);
    }
    return;
  }

  if (this.mode === 'end') {
    const anyHeld = !!(
      held.P1_1 || held.P1_2 || held.P1_3 || held.P1_4 || held.P1_5 || held.P1_6 ||
      held.P1_U || held.P1_D || held.P1_L || held.P1_R || held.START1 || held.START2
    );
    const waited = performance.now() - (this._endAt || 0) > 1000;

    if (!this._endReady) {
      // Discard presses while locked (held fire/joystick must be released)
      ['P1_1', 'P1_2', 'P1_3', 'P1_4', 'P1_5', 'P1_6', 'P1_U', 'P1_D', 'P1_L', 'P1_R', 'START1', 'START2']
        .forEach((k) => { just[k] = false; });
      if (waited && !anyHeld) {
        this._endReady = true;
        if (this.endHint) this.endHint.setText('START / ENTER para reintentar');
      } else if (this.endHint) {
        this.endHint.setText(anyHeld ? 'Suelta joystick y botones...' : '...');
      }
      return;
    }

    // Only START retries — shoot (P1_1) never restarts
    if (tap('START1')) {
      try { play.call(this); } catch (_) { try { play.call(this); } catch (__) { title.call(this); } }
    } else if (tap('P1_2')) {
      try { setup.call(this); } catch (_) { title.call(this); }
    }
    return;
  }

  if (this.mode !== 'play' || !this.alive) return;
  this.t0 += dt;
  if (this.fireCd > 0) this.fireCd -= dt;
  if (this.dashCd > 0) this.dashCd -= dt;
  if (this.inv > 0) {
    this.inv -= dt;
    this.player.setAlpha(Math.sin(this.t0 * 30) > 0 ? 1 : 0.35);
    if (this.inv <= 0) this.player.setAlpha(1);
  }
  if (this.rapid > 0) this.rapid -= dt;
  if (this.shield > 0) {
    this.shield -= dt;
    this.player.setTint(C.cyan);
    if (this.shield <= 0) this.player.clearTint();
  }

  let dx = 0, dy = 0;
  if (held.P1_L) dx -= 1;
  if (held.P1_R) dx += 1;
  if (held.P1_U) dy -= 1;
  if (held.P1_D) dy += 1;
  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
    this.facing = Math.atan2(dy, dx);
    const spd = 240 * (this.rapid > 0 ? 1.15 : 1);
    this.player.setAcceleration(dx * 1400, dy * 1400);
    this.player.setMaxVelocity(spd);
  } else this.player.setAcceleration(0, 0);
  this.player.setRotation(this.facing);
  this.pGlow.setPosition(this.player.x, this.player.y);

  if (held.P1_1) shoot(this);
  if (tap('P1_2')) dash(this);
  if (tap('P1_U')) {
    this.upN++;
    if (this.upN >= 5 && !this.egg) {
      this.egg = true; this.score += 500; toast(this, '🦄 RAISE APROBADO +500', C.gold); SFX.power();
    }
  }

  this.bullets.getChildren().slice().forEach((b) => {
    if (!b.active) return;
    let life = (b.getData('life') || 0.5) - dt;
    b.setData('life', life);
    if (life <= 0 || b.x < 30 || b.x > W - 30 || b.y < 30 || b.y > H - 30) b.destroy();
  });
  this.ebullets.getChildren().slice().forEach((b) => {
    if (!b.active) return;
    let life = (b.getData('life') || 1) - dt;
    b.setData('life', life);
    if (life <= 0) b.destroy();
  });

  this.bugs.children.iterate((e) => {
    if (!e || !e.active) return;
    const spd = e.getData('spd') || 80;
    const ang = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
    this.physics.velocityFromRotation(ang + Math.sin(this.t0 * 5 + e.x) * 0.4, spd, e.body.velocity);
    e.setRotation(ang);
    if (e.getData('type') === 'boss') {
      let sh = (e.getData('shot') || 0) - dt;
      if (sh <= 0) {
        sh = 1.4;
        for (let i = -1; i <= 1; i++) {
          const bl = this.ebullets.create(e.x, e.y, 'bolt');
          bl.setTint(C.pink).setDepth(14);
          this.physics.velocityFromRotation(ang + i * 0.25, 180, bl.body.velocity);
          bl.setData('life', 2.5);
        }
      }
      e.setData('shot', sh);
    }
  });

  if (this.ammo < this.ammoMax) {
    this.ammoRegen += dt * (1.1 + Math.min(1.6, this.wave * 0.08));
    if (this.ammoRegen >= 1) { this.ammoRegen -= 1; this.ammo = Math.min(this.ammoMax, this.ammo + 1); }
  } else this.ammoRegen = 0;

  if (!this.spawning && this.bugs.countActive() === 0 && !this.waveClear) {
    this.waveClear = true;
    this.score += 100 * this.wave;
    toast(this, '✓ OLEADA ' + this.wave + ' LIMPIA +' + (100 * this.wave), C.lime);
    SFX.power();
    this.cameras.main.flash(120, 223, 255, 0);
    this.time.delayedCall(1100, () => { if (this.alive) nextWave(this); });
  }

  if (this.disp < this.score) {
    this.disp = Math.min(this.score, this.disp + Math.ceil((this.score - this.disp) * 0.18) + 1);
    this.hudScore.setText('PUNTAJE ' + this.disp);
  }
  this.hudLives.setText('♥'.repeat(Math.max(0, this.lives)) + '♡'.repeat(Math.max(0, 3 - Math.min(3, this.lives))));
  this.hudCombo.setText(this.combo > 1 ? 'COMBO x' + this.combo : (this.rapid > 0 ? '⚡ FIREHOSE' : (this.shield > 0 ? '🛡️ SHIELD' : '')));
  const am = Math.floor(this.ammo);
  this.hudAmmo.setText('BALAS ' + am + '/' + this.ammoMax);
  this.hudAmmo.setColor(am <= 3 ? '#FF3535' : (am <= 6 ? '#FFD700' : '#DFFF00'));
  this.ammoBar.width = 140 * (this.ammo / this.ammoMax);
  this.ammoBar.setFillStyle(am <= 3 ? C.red : (am <= 6 ? C.gold : C.lime));
  this.hudHelp.setText(
    (this.dashCd > 0 ? 'DASH ' + this.dashCd.toFixed(1) + 's' : 'BOTÓN 2 dash') +
    '   ·   CADENCIA ' + Math.round(fireDelay(this) * 1000) + 'ms'
  );
  this.terms.forEach((t, i) => {
    t.x += Math.sin(this.t0 + i) * 0.15;
    t.y += Math.cos(this.t0 * 0.7 + i) * 0.1;
  });
}
