// ============================================================
//  SPELL SURVIVORS - 8-bit Dungeon Music
//  Castlevania-inspired gothic chiptune
// ============================================================

'use strict';

class MusicSystem {
  constructor() {
    this.ctx        = null;
    this.masterGain = null;
    this.playing    = false;
    this.muted      = false;
    this._step      = 0;
    this._nextBeat  = 0;
    this._timer     = null;

    // Tempo & timing
    this.BPM   = 158;
    this.STEP  = 60 / this.BPM / 4;   // duration of one 16th note (seconds)
    this.STEPS = 64;                   // pattern length: 4 bars × 16 steps
    this.AHEAD = 0.12;                 // schedule this many seconds ahead
    this.TICK  = 25;                   // scheduler interval (ms)

    this._buildPatterns();
  }

  // ── Note helpers ──────────────────────────────────────────
  hz(name, oct) {
    const map = {
      C: 0, 'C#': 1, Db: 1,
      D: 2, 'D#': 3, Eb: 3,
      E: 4,
      F: 5, 'F#': 6, Gb: 6,
      G: 7, 'G#': 8, Ab: 8,
      A: 9, 'A#': 10, Bb: 10,
      B: 11
    };
    return 440 * Math.pow(2, (map[name] + (oct - 4) * 12 - 9) / 12);
  }

  // ── Musical patterns (A harmonic minor) ──────────────────
  _buildPatterns() {
    const h = (n, o) => this.hz(n, o);
    const _ = null;

    // ── Lead melody (square wave) ─────────────────────────
    // 64 × 16th-note slots | Castlevania gothic motif
    this.patLead = [
      // Bar 1 — Opening A-minor motif (descending then chromatic rise)
      h('E',5), _,       h('D',5), h('C',5),
      h('B',4), _,       h('A',4), _,
      h('G#',4),h('A',4),_,        h('C',5),
      h('E',5), _,       _,        _,

      // Bar 2 — Response phrase (F → Dm → E tension)
      h('F',5), _,       h('E',5), _,
      h('C',5), h('A',4),_,        _,
      h('G#',4),_,       h('B',4), _,
      h('E',5), h('D',5),h('C',5), h('B',4),

      // Bar 3 — Dramatic ascending run
      h('A',4), h('C',5),h('E',5), h('A',5),
      _,        h('G',5),h('F',5), h('E',5),
      h('D',5), h('C',5),h('B',4), h('A',4),
      h('G#',4),h('A',4),_,        _,

      // Bar 4 — Turnaround back to root
      h('A',4), _,       h('E',5), _,
      h('F',5), _,       h('E',5), h('D',5),
      h('C',5), h('B',4),_,        h('G#',4),
      h('A',4), _,       _,        h('E',4),
    ];

    // ── Bass (triangle wave) ──────────────────────────────
    // Quarter-note roots with a walking bar-4 figure
    this.patBass = [
      // Bar 1: Am → E
      h('A',3),_,_,_, h('A',3),_,_,_, h('E',3),_,_,_, h('E',3),_,_,_,
      // Bar 2: F → C → Dm → E
      h('F',3),_,_,_, h('C',3),_,_,_, h('D',3),_,_,_, h('E',3),_,_,_,
      // Bar 3: Am → G → F → E
      h('A',3),_,_,_, h('G',3),_,_,_, h('F',3),_,_,_, h('E',3),_,_,_,
      // Bar 4: walking turnaround
      h('A',3),_,_,h('E',3), _,_,h('F',3),_, h('E',3),_,h('D',3),_, h('E',3),_,h('A',3),_,
    ];

    // ── Chord arpeggio (square wave, 8th-note pulses) ─────
    // 32 values — one fires every 2 16th-note steps
    this.patArp = [
      // Bar 1: Am  /  E/G#
      h('A',3),h('C',4),h('E',4),h('A',4),  h('E',3),h('G#',3),h('B',3),h('E',4),
      // Bar 2: F   /  C  /  Dm  /  E
      h('F',3),h('A',3),h('C',4),h('F',4),  h('C',3),h('E',3),h('G',3),h('C',4),
      h('D',3),h('F',3),h('A',3),h('D',4),  h('E',3),h('G#',3),h('B',3),h('E',4),
      // Bar 3: Am  /  G  /  F  /  E7
      h('A',3),h('C',4),h('E',4),h('A',4),  h('G',3),h('B',3),h('D',4),h('G',4),
      // Bar 4: Am  /  E/G#  /  Dm  /  E
      h('A',3),h('E',4),h('A',4),h('E',4),  h('G#',3),h('E',4),h('B',4),h('E',4),
      h('D',3),h('F',3),h('A',3),h('F',4),  h('E',3),h('G#',3),h('B',3),h('E',3),
    ];

    // ── Drum pattern: 0=off 1=kick 2=snare 3=closed-hat ──
    this.patDrum = [
      // Bar 1
      1,0,3,0, 2,0,3,0, 1,0,3,0, 2,0,3,0,
      // Bar 2
      1,0,3,0, 2,0,3,0, 1,0,3,0, 2,0,3,0,
      // Bar 3
      1,0,3,0, 2,0,3,0, 1,0,3,0, 2,0,3,0,
      // Bar 4 (fill on last beat)
      1,0,3,0, 2,0,3,0, 1,0,3,3, 2,1,2,1,
    ];
  }

  // ── Audio context setup ───────────────────────────────────
  _init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Master bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.ctx.destination);

    // Echo send on lead only (dotted-8th delay at 158 BPM ≈ 0.285s)
    this._echoDelay = this.ctx.createDelay(1.0);
    this._echoDelay.delayTime.value = 0.285;
    this._echoFB = this.ctx.createGain();
    this._echoFB.gain.value = 0.28;         // feedback amount
    this._echoWet = this.ctx.createGain();
    this._echoWet.gain.value = 0.22;        // wet level to master
    this._echoDelay.connect(this._echoFB);
    this._echoFB.connect(this._echoDelay);
    this._echoDelay.connect(this._echoWet);
    this._echoWet.connect(this.masterGain);

    // Per-channel gain nodes
    this.gLead = this.ctx.createGain(); this.gLead.gain.value = 0.30;
    this.gBass = this.ctx.createGain(); this.gBass.gain.value = 0.42;
    this.gArp  = this.ctx.createGain(); this.gArp.gain.value  = 0.14;
    this.gDrum = this.ctx.createGain(); this.gDrum.gain.value = 0.24;

    this.gLead.connect(this.masterGain);
    this.gLead.connect(this._echoDelay);   // lead gets echo send
    this.gBass.connect(this.masterGain);
    this.gArp.connect(this.masterGain);
    this.gDrum.connect(this.masterGain);
  }

  // ── Oscillator note ───────────────────────────────────────
  _osc(freq, type, t, dur, gainNode) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    env.gain.setValueAtTime(0.001, t);
    env.gain.exponentialRampToValueAtTime(0.85, t + 0.008);
    env.gain.setValueAtTime(0.85, t + dur * 0.55);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(env);
    env.connect(gainNode);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // ── Drum voices ───────────────────────────────────────────
  _kick(t) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(170, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.10);
    env.gain.setValueAtTime(1.0, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    osc.connect(env);
    env.connect(this.gDrum);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  _snare(t) {
    const ctx = this.ctx;
    const len = Math.ceil(ctx.sampleRate * 0.13);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.value = 2400;
    flt.Q.value = 0.7;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.85, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    src.connect(flt);
    flt.connect(env);
    env.connect(this.gDrum);
    src.start(t);
    src.stop(t + 0.13);
  }

  _hihat(t) {
    const ctx = this.ctx;
    const len = Math.ceil(ctx.sampleRate * 0.045);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const flt = ctx.createBiquadFilter();
    flt.type = 'highpass';
    flt.frequency.value = 8000;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.35, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    src.connect(flt);
    flt.connect(env);
    env.connect(this.gDrum);
    src.start(t);
    src.stop(t + 0.05);
  }

  // ── Per-step scheduler ────────────────────────────────────
  _scheduleStep(step, t) {
    const S = this.STEP;

    // Lead (square wave, 8-bit style)
    const lf = this.patLead[step];
    if (lf) this._osc(lf, 'square', t, S * 1.75, this.gLead);

    // Bass (triangle for warm low-end)
    const bf = this.patBass[step];
    if (bf) this._osc(bf, 'triangle', t, S * 3.6, this.gBass);

    // Arpeggio fires on every 8th note (even steps)
    if (step % 2 === 0) {
      const af = this.patArp[step >> 1];
      if (af) this._osc(af, 'square', t, S * 1.4, this.gArp);
    }

    // Drums
    const dr = this.patDrum[step];
    if      (dr === 1) this._kick(t);
    else if (dr === 2) this._snare(t);
    else if (dr === 3) this._hihat(t);
  }

  // ── Lookahead scheduler pump ──────────────────────────────
  _pump() {
    if (!this.playing) return;
    const now = this.ctx.currentTime;
    while (this._nextBeat < now + this.AHEAD) {
      this._scheduleStep(this._step, this._nextBeat);
      this._nextBeat += this.STEP;
      this._step = (this._step + 1) % this.STEPS;
    }
  }

  // ── Public API ────────────────────────────────────────────
  start() {
    if (this.playing) return;
    this._init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.playing = true;
    this._step     = 0;
    this._nextBeat = this.ctx.currentTime + 0.15;
    // Fade in over 2 seconds
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(
      this.muted ? 0 : 0.48,
      this.ctx.currentTime + 2.0
    );
    this._timer = setInterval(() => this._pump(), this.TICK);
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this._timer);
    this._timer = null;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.6);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : 0.48,
        this.ctx.currentTime,
        0.2
      );
    }
    return this.muted;
  }
}

window.Music = new MusicSystem();
