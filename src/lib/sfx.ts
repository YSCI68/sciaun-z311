/* Tiny synthesized sound effects using the Web Audio API (no audio files needed). */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (ctx?.state === 'closed') ctx = null;
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.05, delay = 0, endFreq?: number) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  click: () => tone(1400, 0.035, 'square', 0.02),
  pick: () => tone(520, 0.06, 'triangle', 0.04, 0, 760),
  place: () => tone(380, 0.07, 'triangle', 0.045, 0, 240),
  tip: () => {
    tone(260, 0.05, 'square', 0.03);
    tone(900, 0.03, 'square', 0.02, 0.045);
  },
  eject: () => tone(700, 0.08, 'triangle', 0.04, 0, 200),
  aspirate: () => tone(240, 0.35, 'sine', 0.035, 0, 620),
  dispense: () => tone(620, 0.3, 'sine', 0.035, 0, 220),
  invert: () => tone(330, 0.12, 'sine', 0.03, 0, 440),
  success: () => {
    tone(660, 0.12, 'triangle', 0.05);
    tone(990, 0.18, 'triangle', 0.05, 0.11);
  },
  mistake: () => {
    tone(240, 0.16, 'sawtooth', 0.035);
    tone(170, 0.22, 'sawtooth', 0.035, 0.14);
  },
  beep: () => {
    tone(1760, 0.09, 'square', 0.03);
    tone(1760, 0.09, 'square', 0.03, 0.18);
    tone(1760, 0.09, 'square', 0.03, 0.36);
  },
  whirr: (secs: number) => {
    const c = ac();
    if (!c) return;
    const t0 = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(40, t0);
    o.frequency.exponentialRampToValueAtTime(230, t0 + secs * 0.35);
    o.frequency.setValueAtTime(230, t0 + secs * 0.75);
    o.frequency.exponentialRampToValueAtTime(40, t0 + secs);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.018, t0 + 0.3);
    g.gain.setValueAtTime(0.018, t0 + secs * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + secs);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + secs + 0.05);
  },
};
