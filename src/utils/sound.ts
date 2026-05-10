// Web Audio API based sound system — works in browser, gracefully skips on native.

let _ctx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!_ctx) _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  } catch { return null; }
}

// ── Enable flags ──────────────────────────────────────────────────────────────
let _sfxEnabled = true;
let _bgmEnabled = true;

export function setSFXEnabled(v: boolean) { _sfxEnabled = v; }
export function setBGMEnabled(v: boolean) {
  _bgmEnabled = v;
  if (!v && bgmPlaying) stopBGM();
  else if (v && !bgmPlaying) startBGM();
}

// ── Core beep ─────────────────────────────────────────────────────────────────
function beep(freq: number, dur: number, vol = 0.2, type: OscillatorType = 'square', start = 0) {
  if (!_sfxEnabled) return;
  const c = ctx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.connect(g); g.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(vol, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.01);
}

// ── SFX functions ─────────────────────────────────────────────────────────────
export function playClick() { beep(700, 0.06, 0.12); }

export function playMeow() {
  if (!_sfxEnabled) return;
  const c = ctx(); if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.connect(g); g.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(650, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(480, c.currentTime + 0.12);
  osc.frequency.linearRampToValueAtTime(550, c.currentTime + 0.28);
  osc.frequency.exponentialRampToValueAtTime(420, c.currentTime + 0.45);
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(0.28, c.currentTime + 0.05);
  g.gain.setValueAtTime(0.28, c.currentTime + 0.35);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
  osc.start(c.currentTime); osc.stop(c.currentTime + 0.52);
}

export function playEarnCoin() {
  beep(660, 0.12, 0.18, 'square', 0);
  beep(880, 0.14, 0.18, 'square', 0.12);
}

export function playError() { beep(220, 0.28, 0.18, 'square'); }

export function playBuy() {
  beep(523, 0.1, 0.15, 'square', 0);
  beep(659, 0.1, 0.15, 'square', 0.1);
  beep(784, 0.15, 0.15, 'square', 0.2);
}

// ── 8-bit BGM ─────────────────────────────────────────────────────────────────
// Original peaceful town melody in C major (Littleroot-inspired, not copied)
const NOTE_DUR = 0.18; // seconds per note
const MELODY = [
  261.63, 329.63, 392.00, 440.00,  // C4 E4 G4 A4
  392.00, 329.63, 261.63, 293.66,  // G4 E4 C4 D4
  329.63, 392.00, 440.00, 523.25,  // E4 G4 A4 C5
  493.88, 392.00, 329.63, 293.66,  // B4 G4 E4 D4
  261.63, 392.00, 523.25, 392.00,  // C4 G4 C5 G4
  329.63, 261.63, 293.66, 329.63,  // E4 C4 D4 E4
  392.00, 440.00, 392.00, 329.63,  // G4 A4 G4 E4
  261.63, 293.66,    0,      0,    // C4 D4 rest rest
];
const BASS = [
  130.81, 0, 196.00, 0,  // C2 - G2 -
  164.81, 0, 130.81, 0,  // E2 - C2 -
  164.81, 0, 220.00, 0,  // E2 - A2 -
  246.94, 0, 164.81, 0,  // B2 - E2 -
  130.81, 0, 196.00, 0,
  164.81, 0, 130.81, 0,
  196.00, 0, 220.00, 0,
  130.81, 0,   0,   0,
];

let bgmPlaying = false;
let bgmGain: GainNode | null = null;
let bgmNextStart = 0;
let bgmTimerId: ReturnType<typeof setInterval> | null = null;

function scheduleBGMCycle() {
  const c = ctx(); if (!c || !bgmGain) return;
  const totalDur = MELODY.length * NOTE_DUR;

  MELODY.forEach((freq, i) => {
    if (freq === 0 || !bgmGain) return;
    const osc = c.createOscillator();
    osc.connect(bgmGain!);
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, bgmNextStart + i * NOTE_DUR);
    osc.start(bgmNextStart + i * NOTE_DUR);
    osc.stop(bgmNextStart + i * NOTE_DUR + NOTE_DUR * 0.75);
  });

  BASS.forEach((freq, i) => {
    if (freq === 0 || !bgmGain) return;
    const osc = c.createOscillator();
    const bassGain = c.createGain();
    osc.connect(bassGain); bassGain.connect(bgmGain!);
    osc.type = 'triangle';
    bassGain.gain.setValueAtTime(0.4, bgmNextStart + i * NOTE_DUR);
    osc.frequency.setValueAtTime(freq, bgmNextStart + i * NOTE_DUR);
    osc.start(bgmNextStart + i * NOTE_DUR);
    osc.stop(bgmNextStart + i * NOTE_DUR + NOTE_DUR * 0.5);
  });

  bgmNextStart += totalDur;
}

export function startBGM() {
  if (!_bgmEnabled) return;
  if (bgmPlaying) return;
  const c = ctx(); if (!c) return;
  bgmPlaying = true;
  bgmGain = c.createGain();
  bgmGain.gain.setValueAtTime(0.07, c.currentTime);
  bgmGain.connect(c.destination);
  bgmNextStart = c.currentTime + 0.05;
  scheduleBGMCycle();

  const cycleDur = MELODY.length * NOTE_DUR * 1000;
  bgmTimerId = setInterval(() => {
    const c2 = ctx();
    if (!c2 || !bgmPlaying) { stopBGM(); return; }
    if (bgmNextStart - c2.currentTime < 1.5) scheduleBGMCycle();
  }, Math.max(500, cycleDur - 1000));
}

export function stopBGM() {
  bgmPlaying = false;
  if (bgmTimerId) { clearInterval(bgmTimerId); bgmTimerId = null; }
  const c = ctx();
  if (bgmGain && c) {
    bgmGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.4);
    setTimeout(() => { bgmGain = null; }, 500);
  }
}

export function setBGMVolume(vol: number) {
  const c = ctx();
  if (bgmGain && c) bgmGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), c.currentTime);
}
