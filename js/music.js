// ============================================================
//  SPELL SURVIVORS - 8-bit Dungeon Music
//  Castlevania-inspired gothic chiptune
//  8-bar loop · 120 BPM · 5 voices · A harmonic minor
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

    // ── Tempo ───────────────────────────────────────────────
    this.BPM   = 120;
    this.STEP  = 60 / this.BPM / 4;  // 16th-note duration (0.125 s)
    this.STEPS = 128;                 // 8 bars × 16 steps ≈ 16 s loop
    this.AHEAD = 0.15;
    this.TICK  = 25;

    this._buildPatterns();
  }

  // ── Note frequency helper ─────────────────────────────────
  hz(name, oct) {
    const map = {
      C:0,'C#':1,Db:1, D:2,'D#':3,Eb:3, E:4,
      F:5,'F#':6,Gb:6, G:7,'G#':8,Ab:8,
      A:9,'A#':10,Bb:10, B:11
    };
    return 440 * Math.pow(2, (map[name] + (oct - 4) * 12 - 9) / 12);
  }

  // ── All musical patterns ──────────────────────────────────
  _buildPatterns() {
    const h = (n, o) => this.hz(n, o);
    const _ = null;

    // ═══════════════════════════════════════════════════════
    //  LEAD MELODY  (square wave · 128 × 16th-note steps)
    //  A harmonic minor: A B C D E F G#
    //  Bars 1-4: theme + development
    //  Bars 5-8: climax, high register, resolution
    // ═══════════════════════════════════════════════════════
    this.patLead = [
      // ── Bar 1 ── Gothic opening descend + chromatic rise
      h('E',5), _,        h('D',5), h('C',5),
      h('B',4), _,        h('A',4), _,
      h('G#',4),h('A',4), h('C',5), _,
      h('E',5), _,        _,        _,

      // ── Bar 2 ── Elaboration: G# passing, octave leap
      h('A',4), h('C',5), h('E',5), _,
      h('G#',4),h('B',4), _,        h('D',5),
      h('C',5), _,        h('A',4), h('G#',4),
      h('A',4), _,        h('E',5), _,

      // ── Bar 3 ── F-major colour, descending echo
      h('F',5), _,        h('E',5), _,
      h('C',5), h('A',4), _,        _,
      h('F',5), _,        h('E',5), h('D',5),
      h('C',5), h('B',4), _,        _,

      // ── Bar 4 ── Chromatic tension: C# D# passing tones
      h('E',5), _,        h('D#',5),_,
      h('D',5), h('C#',5),h('C',5), _,
      h('B',4), _,        h('G#',4),_,
      h('A',4), _,        h('C',5), _,

      // ── Bar 5 ── Dramatic 16th-note ascending run (climax)
      h('A',4), h('B',4), h('C',5), h('D',5),
      h('E',5), h('F',5), h('G#',5),h('A',5),
      _,        h('G',5), h('F',5), h('E',5),
      h('D',5), h('C',5), h('B',4), _,

      // ── Bar 6 ── High register, syncopated phrasing
      h('A',5), _,        h('G#',5),h('A',5),
      _,        _,        h('E',5), _,
      h('C',5), h('B',4), h('A',4), h('G#',4),
      h('A',4), h('C',5), h('E',5), _,

      // ── Bar 7 ── Bridge: brooding chromatic descent
      h('F',5), h('E',5), _,        h('D',5),
      h('C',5), h('B',4), _,        h('A',4),
      h('G#',4),_,        h('B',4), _,
      h('D',5), h('C',5), h('B',4), _,

      // ── Bar 8 ── Turnaround: rising resolution into loop
      h('A',4), _,        h('C',5), _,
      h('E',5), _,        h('A',5), _,
      h('G#',5),_,        h('E',5), _,
      h('C',5), h('B',4), h('A',4), _,
    ];

    // ═══════════════════════════════════════════════════════
    //  BASS LINE  (triangle wave · 128 steps)
    //  Quarter-note roots + walking figures
    // ═══════════════════════════════════════════════════════
    this.patBass = [
      // Bar 1: Am pedal
      h('A',3),_,_,_,  h('A',3),_,_,_,  h('E',3),_,_,_,  h('E',3),_,_,_,
      // Bar 2: Am with chromatic neighbour G#
      h('A',3),_,h('G#',3),_,  h('A',3),_,_,_,  h('E',3),_,h('D',3),_,  h('E',3),_,_,_,
      // Bar 3: F → C
      h('F',3),_,_,_,  h('F',3),_,h('C',3),_,  h('C',3),_,_,_,  h('G',3),_,_,_,
      // Bar 4: Chromatic descent E → D# → D, resolve E
      h('E',3),_,_,_,  h('D#',3),_,_,_,  h('D',3),_,_,_,  h('E',3),_,h('G#',3),_,
      // Bar 5: Power Am — busier rhythm for climax
      h('A',3),_,_,h('A',3),  _,_,h('A',3),_,  h('E',3),_,_,h('E',3),  _,_,h('E',3),_,
      // Bar 6: Descending Am → G → F → E
      h('A',3),_,_,_,  h('G',3),_,_,_,  h('F',3),_,_,_,  h('E',3),_,_,_,
      // Bar 7: Dm/F bridge colour
      h('F',3),_,_,h('F',3),  h('D',3),_,_,h('D',3),  h('A',3),_,_,_,  h('E',3),_,h('G#',3),_,
      // Bar 8: Walking turnaround back to Am
      h('A',3),_,h('E',3),_,  h('A',3),_,h('C',3),_,  h('E',3),_,h('G#',3),_,  h('A',3),_,_,_,
    ];

    // ═══════════════════════════════════════════════════════
    //  CHORD ARPEGGIO  (square wave · 64 × 8th-note pulses)
    //  Fires every 2 steps — chord tones cycle upward
    // ═══════════════════════════════════════════════════════
    this.patArp = [
      // Bars 1-2: Am / E/G#  (repeating for the first theme)
      h('A',3),h('C',4),h('E',4),h('A',4),   h('E',3),h('G#',3),h('B',3),h('E',4),
      h('A',3),h('C',4),h('E',4),h('A',4),   h('E',3),h('G#',3),h('B',3),h('E',4),
      // Bars 3-4: F / C  then  Am / Edim
      h('F',3),h('A',3),h('C',4),h('F',4),   h('C',3),h('E',3),h('G',3),h('C',4),
      h('A',3),h('C',4),h('E',4),h('A',4),   h('E',3),h('G#',3),h('D',4),h('E',4),
      // Bars 5-6: Climax — Am open voicing / Edim7 tension
      h('A',3),h('E',4),h('A',4),h('E',4),   h('E',3),h('G#',3),h('B',3),h('E',4),
      h('A',3),h('C',4),h('E',4),h('A',4),   h('E',3),h('G#',3),h('B',3),h('D',4),
      // Bars 7-8: F / Dm  then  E7 / Am (full resolution)
      h('F',3),h('A',3),h('C',4),h('F',4),   h('D',3),h('F',3),h('A',3),h('D',4),
      h('E',3),h('G#',3),h('B',3),h('E',4),  h('A',3),h('C',4),h('E',4),h('A',4),
    ];

    // ═══════════════════════════════════════════════════════
    //  COUNTER-MELODY  (sawtooth wave · bars 5-8 only)
    //  64 values mapped to steps 64-127
    //  Independent voice that weaves around the lead
    // ═══════════════════════════════════════════════════════
    this.patCounter = [
      // Bar 5 — harmony below the ascending run
      h('E',4), _,        h('F',4), _,
      h('G#',4),_,        h('A',4), _,
      _,        h('B',4), _,        h('C',5),
      _,        _,        _,        _,

      // Bar 6 — counter-subject with chromatic dip
      h('C',5), h('B',4), _,        h('A',4),
      _,        h('G#',4),_,        _,
      h('A',4), _,        h('E',4), _,
      h('A',4), _,        _,        _,

      // Bar 7 — interweaves with bridge descent
      h('C',5), h('B',4), _,        h('A',4),
      h('G#',4),_,        h('A',4), _,
      h('F',4), _,        h('A',4), _,
      h('G#',4),h('A',4), _,        _,

      // Bar 8 — rises to meet the lead's resolution
      h('E',4), _,        h('G#',4),_,
      h('A',4), _,        h('C',5), _,
      h('E',5), _,        h('C',5), _,
      h('A',4), h('G#',4),h('A',4), _,
    ];

    // ═══════════════════════════════════════════════════════
    //  DRUMS  (0=off  1=kick  2=snare  3=closed-hat  4=open-hat)
    // ═══════════════════════════════════════════════════════
    this.patDrum = [
      // Bar 1 — standard dungeon beat
      1,0,3,0, 2,0,3,0, 1,0,3,0, 2,0,3,0,
      // Bar 2 — extra hat burst on beat 3
      1,0,3,0, 2,0,3,0, 1,3,3,3, 2,0,3,0,
      // Bar 3 — syncopated kick on the and of beat 2
      1,0,3,0, 2,0,1,0, 3,0,3,0, 2,0,3,0,
      // Bar 4 — tension: 16th-hat flurry on beats 3-4
      1,0,3,0, 2,0,3,0, 1,0,3,3, 2,3,3,3,
      // Bar 5 — climax: double-kick on every beat
      1,1,3,0, 2,0,3,0, 1,1,3,0, 2,0,3,0,
      // Bar 6 — climax: open-hat accents between snares
      1,0,4,3, 2,0,3,0, 1,0,4,3, 2,0,3,0,
      // Bar 7 — bridge: sparse, ghostly (mostly silence)
      1,0,0,0, 2,0,0,0, 1,0,3,0, 2,0,0,0,
      // Bar 8 — big fill: back into the loop
      1,0,3,0, 2,0,3,0, 1,3,2,3, 1,2,1,2,
    ];
  }

  // ── Audio context & routing ───────────────────────────────
  _init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Master bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.ctx.destination);

    // Echo send on lead (8th-note delay at 120 BPM = 0.25 s)
    this._echoDelay = this.ctx.createDelay(1.0);
    this._echoDelay.delayTime.value = 0.25;
    this._echoFB  = this.ctx.createGain(); this._echoFB.gain.value  = 0.30;
    this._echoWet = this.ctx.createGain(); this._echoWet.gain.value = 0.20;
    this._echoDelay.connect(this._echoFB);
    this._echoFB.connect(this._echoDelay);
    this._echoDelay.connect(this._echoWet);
    this._echoWet.connect(this.masterGain);

    // Per-channel gain nodes
    this.gLead    = this.ctx.createGain(); this.gLead.gain.value    = 0.28;
    this.gBass    = this.ctx.createGain(); this.gBass.gain.value    = 0.40;
    this.gArp     = this.ctx.createGain(); this.gArp.gain.value     = 0.13;
    this.gCounter = this.ctx.createGain(); this.gCounter.gain.value = 0.12;
    this.gDrum    = this.ctx.createGain(); this.gDrum.gain.value    = 0.22;

    this.gLead.connect(this.masterGain);
    this.gLead.connect(this._echoDelay);   // lead gets echo
    this.gBass.connect(this.masterGain);
    this.gArp.connect(this.masterGain);
    this.gCounter.connect(this.masterGain);
    this.gDrum.connect(this.masterGain);
  }

  // ── Simple oscillator with ADSR envelope ─────────────────
  _osc(freq, type, t, dur, gainNode) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    env.gain.setValueAtTime(0.001, t);
    env.gain.exponentialRampToValueAtTime(0.85, t + 0.009);
    env.gain.setValueAtTime(0.85, t + dur * 0.55);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(env);
    env.connect(gainNode);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // ── Lead voice: two detuned squares for thick chiptune tone
  _oscLead(freq, t, dur) {
    const ctx = this.ctx;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, t);
    env.gain.exponentialRampToValueAtTime(0.75, t + 0.009);
    env.gain.setValueAtTime(0.75, t + dur * 0.58);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    env.connect(this.gLead);

    for (const detune of [0, 5]) {  // slight detune for chorus width
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);
      osc.detune.setValueAtTime(detune, t);
      osc.connect(env);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }
  }

  // ── Drum voices ───────────────────────────────────────────
  _kick(t) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.11);
    env.gain.setValueAtTime(1.0, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(env); env.connect(this.gDrum);
    osc.start(t); osc.stop(t + 0.15);
  }

  _snare(t) {
    const ctx  = this.ctx;
    const len  = Math.ceil(ctx.sampleRate * 0.14);
    const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass'; flt.frequency.value = 2200; flt.Q.value = 0.8;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.9, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(flt); flt.connect(env); env.connect(this.gDrum);
    src.start(t); src.stop(t + 0.14);
  }

  _hihat(t, open = false) {
    const ctx  = this.ctx;
    const dur  = open ? 0.18 : 0.048;
    const len  = Math.ceil(ctx.sampleRate * dur);
    const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const flt = ctx.createBiquadFilter();
    flt.type = 'highpass'; flt.frequency.value = 7500;
    const env = ctx.createGain();
    env.gain.setValueAtTime(open ? 0.45 : 0.32, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(flt); flt.connect(env); env.connect(this.gDrum);
    src.start(t); src.stop(t + dur + 0.01);
  }

  // ── Per-step audio scheduler ──────────────────────────────
  _scheduleStep(step, t) {
    const S = this.STEP;

    // Lead (thick dual-square chorus)
    const lf = this.patLead[step];
    if (lf) this._oscLead(lf, t, S * 1.8);

    // Bass (warm triangle)
    const bf = this.patBass[step];
    if (bf) this._osc(bf, 'triangle', t, S * 3.8, this.gBass);

    // Chord arpeggio (8th-note pulses)
    if (step % 2 === 0) {
      const af = this.patArp[step >> 1];
      if (af) this._osc(af, 'square', t, S * 1.5, this.gArp);
    }

    // Counter-melody (bars 5-8, sawtooth for organ timbre)
    if (step >= 64) {
      const cf = this.patCounter[step - 64];
      if (cf) this._osc(cf, 'sawtooth', t, S * 2.2, this.gCounter);
    }

    // Drums
    const dr = this.patDrum[step];
    if      (dr === 1) this._kick(t);
    else if (dr === 2) this._snare(t);
    else if (dr === 3) this._hihat(t, false);
    else if (dr === 4) this._hihat(t, true);
  }

  // ── Lookahead scheduler ───────────────────────────────────
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
    this.playing   = true;
    this._step     = 0;
    this._nextBeat = this.ctx.currentTime + 0.15;
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(
      this.muted ? 0 : 0.48,
      this.ctx.currentTime + 2.5
    );
    this._timer = setInterval(() => this._pump(), this.TICK);
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this._timer);
    this._timer = null;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.7);
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

// ============================================================
//  MENU MUSIC SYSTEM — chill spooky 8-bit ambient
// ============================================================

class MenuMusicSystem {
  constructor() {
    this.BPM   = 72;
    this.STEP  = 60 / 72 / 4;   // ≈ 0.2083 s per 16th-note
    this.STEPS = 64;             // 4 bars of 16 steps
    this.TICK  = 50;             // pump interval ms
    this.playing = false;
    this.muted   = false;
    this.ctx     = null;
    this.masterGain = null;
    this._timer  = null;
    this._step   = 0;
    this._next   = 0;
    this._buildPatterns();
  }

  // ── Note frequencies ─────────────────────────────────────
  // A natural/harmonic minor: A B C D E F G(#)
  _buildPatterns() {
    const _ = null;
    // ── Bell melody (sparse, haunting)
    // Bars: Am feel — A4, E4, D4, C4 / G#4, A4, F4, E4
    this.patBell = [
      440.0, _,     _,     _,     _,     _,     _,     _,
      329.6, _,     _,     _,     _,     _,     _,     _,  // bar 1
      293.7, _,     _,     _,     261.6, _,     _,     _,
      329.6, _,     _,     _,     _,     _,     _,     _,  // bar 2
      415.3, _,     _,     _,     440.0, _,     _,     _,
      _,     _,     _,     _,     _,     _,     _,     _,  // bar 3
      349.2, _,     _,     _,     _,     _,     _,     _,
      329.6, _,     _,     _,     261.6, _,     _,     _,  // bar 4
    ];
    // ── Slow pad arpeggio (triangle, every 4 steps)
    // Am → F → Dm → E  (harmonic minor leading tone on bar 4)
    this.patPad = [
      220.0, _,     _,     _,     261.6, _,     _,     _,
      329.6, _,     _,     _,     261.6, _,     _,     _,  // Am
      174.6, _,     _,     _,     220.0, _,     _,     _,
      261.6, _,     _,     _,     220.0, _,     _,     _,  // F
      146.8, _,     _,     _,     174.6, _,     _,     _,
      220.0, _,     _,     _,     174.6, _,     _,     _,  // Dm
      164.8, _,     _,     _,     207.7, _,     _,     _,
      246.9, _,     _,     _,     207.7, _,     _,     _,  // E (harmonic minor)
    ];
    // ── Bass drone (whole notes, 1 per bar)
    this.patBass = [
      110.0, _,     _,     _,     _,     _,     _,     _,
      _,     _,     _,     _,     _,     _,     _,     _,  // A2
      87.31, _,     _,     _,     _,     _,     _,     _,
      _,     _,     _,     _,     _,     _,     _,     _,  // F2
      73.42, _,     _,     _,     _,     _,     _,     _,
      _,     _,     _,     _,     _,     _,     _,     _,  // D2
      82.41, _,     _,     _,     _,     _,     _,     _,
      _,     _,     _,     _,     _,     _,     _,     _,  // E2
    ];
    // ── Ghost sparkle (high notes, ultra-quiet)
    this.patGhost = [
      _,     _,     _,     _,     880.0, _,     _,     _,
      _,     _,     _,     _,     659.3, _,     _,     _,  // A5, E5
      _,     _,     _,     _,     523.3, _,     _,     _,
      _,     _,     _,     _,     880.0, _,     _,     _,  // C5, A5
      _,     _,     _,     _,     698.5, _,     _,     _,
      _,     _,     _,     _,     880.0, _,     _,     _,  // F5, A5
      _,     _,     _,     _,     659.3, _,     _,     _,
      _,     _,     _,     _,     830.6, _,     _,     _,  // E5, G#5
    ];
  }

  // ── Audio graph ───────────────────────────────────────────
  _init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.ctx.destination);

    // Long echo for atmospheric spaciousness
    this._echoDelay = this.ctx.createDelay(2.0);
    this._echoDelay.delayTime.value = 0.5;
    this._echoFB  = this.ctx.createGain(); this._echoFB.gain.value  = 0.35;
    this._echoWet = this.ctx.createGain(); this._echoWet.gain.value = 0.25;
    this._echoDelay.connect(this._echoFB);
    this._echoFB.connect(this._echoDelay);
    this._echoDelay.connect(this._echoWet);
    this._echoWet.connect(this.masterGain);

    // Per-channel gains
    this.gBell  = this.ctx.createGain(); this.gBell.gain.value  = 0.30;
    this.gPad   = this.ctx.createGain(); this.gPad.gain.value   = 0.18;
    this.gBass  = this.ctx.createGain(); this.gBass.gain.value  = 0.35;
    this.gGhost = this.ctx.createGain(); this.gGhost.gain.value = 0.07;

    this.gBell.connect(this.masterGain);
    this.gBell.connect(this._echoDelay);  // bell echoes
    this.gPad.connect(this.masterGain);
    this.gBass.connect(this.masterGain);
    this.gGhost.connect(this.masterGain);
    this.gGhost.connect(this._echoDelay); // ghost sparkle echoes
  }

  // ── Voice synthesisers ────────────────────────────────────

  // Bell: sharp attack, long exponential decay (music-box feel)
  _bell(freq, t) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    env.gain.setValueAtTime(0.001, t);
    env.gain.exponentialRampToValueAtTime(0.9, t + 0.006);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.72);
    osc.connect(env);
    env.connect(this.gBell);
    osc.start(t);
    osc.stop(t + 0.74);
  }

  // Pad: soft triangle, sustains then fades
  _pad(freq, t, dur) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    env.gain.setValueAtTime(0.001, t);
    env.gain.exponentialRampToValueAtTime(0.85, t + 0.06);
    env.gain.setValueAtTime(0.85, t + dur * 0.6);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(env);
    env.connect(this.gPad);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Bass: deep triangle drone, slow attack
  _bass(freq, t) {
    const ctx  = this.ctx;
    const dur  = this.STEP * 15.5;
    const osc  = ctx.createOscillator();
    const env  = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    env.gain.setValueAtTime(0.001, t);
    env.gain.exponentialRampToValueAtTime(0.9, t + 0.12);
    env.gain.setValueAtTime(0.9, t + this.STEP * 13);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(env);
    env.connect(this.gBass);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Ghost: ultra-brief sparkle in high register
  _ghost(freq, t) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    env.gain.setValueAtTime(0.001, t);
    env.gain.exponentialRampToValueAtTime(0.9, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(env);
    env.connect(this.gGhost);
    osc.start(t);
    osc.stop(t + 0.24);
  }

  // ── Scheduler ─────────────────────────────────────────────
  _scheduleStep(step, t) {
    const mel = this.patBell[step];
    const pad = this.patPad[step];
    const bas = this.patBass[step];
    const gho = this.patGhost[step];
    if (mel !== null) this._bell(mel, t);
    if (pad !== null) this._pad(pad, t, this.STEP * 3.8);
    if (bas !== null) this._bass(bas, t);
    if (gho !== null) this._ghost(gho, t);
  }

  _pump() {
    const t = this.ctx.currentTime;
    const lookahead = 0.10;
    while (this._next < t + lookahead) {
      this._scheduleStep(this._step, this._next);
      this._step = (this._step + 1) % this.STEPS;
      this._next += this.STEP;
    }
  }

  // ── Public API ────────────────────────────────────────────
  start() {
    if (this.playing) return;
    this.playing = true;
    this._init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this._step = 0;
    this._next = this.ctx.currentTime + 0.05;
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.masterGain.gain.exponentialRampToValueAtTime(
      this.muted ? 0.001 : 0.45,
      this.ctx.currentTime + 1.5   // faster fade-in so music is audible sooner
    );
    this._timer = setInterval(() => this._pump(), this.TICK);
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this._timer);
    this._timer = null;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : 0.45,
        this.ctx.currentTime,
        0.2
      );
    }
    return this.muted;
  }
}

window.MenuMusic = new MenuMusicSystem();

// ============================================================
//  BOSS MUSIC SYSTEM — intense spooky 8-bit dungeon boss theme
//  D minor, 140 BPM, driving bass + drums + lead + fast arp
// ============================================================

class BossMusicSystem {
  constructor() {
    this.BPM   = 140;
    this.STEP  = 60 / 140 / 4;  // ≈ 0.1071 s per 16th-note
    this.STEPS = 64;             // 4 bars
    this.TICK  = 40;
    this.playing = false;
    this.muted   = false;
    this.ctx     = null;
    this.masterGain = null;
    this._timer  = null;
    this._step   = 0;
    this._next   = 0;
    this._buildPatterns();
  }

  _buildPatterns() {
    const _ = null;
    // Frequencies in D minor (D E F G A Bb C, Cs=C# harmonic leading tone)
    const D2=73.42, E2=82.41, F2=87.31, G2=98.00, A2=110.0, Bb2=116.5, C3=130.8;
    const D3=146.8, E3=164.8, F3=174.6, G3=196.0, A3=220.0, Bb3=233.1, Cs3=138.6;
    const D4=293.7, E4=329.6, F4=349.2, G4=392.0, A4=440.0, Bb4=466.2, C4=261.6, Cs4=277.2;
    const D5=587.3;

    // ── Kick (beats 1,3 + syncopated pickup on 14) ──
    this.patKick = [
      1,_,_,_,_,_,_,_, 1,_,1,_,_,_,1,_,
      1,_,_,_,_,_,_,_, 1,_,_,_,_,_,1,_,
      1,_,_,_,_,_,_,_, 1,_,1,_,_,_,1,_,
      1,_,_,_,_,_,_,_, 1,_,_,_,_,_,1,_,
    ];
    // ── Snare (beats 2, 4) ──
    this.patSnare = [
      _,_,_,_,1,_,_,_, _,_,_,_,1,_,_,_,
      _,_,_,_,1,_,_,_, _,_,_,_,1,_,_,_,
      _,_,_,_,1,_,_,_, _,_,_,_,1,_,_,_,
      _,_,_,_,1,_,_,_, _,_,_,_,1,_,_,_,
    ];
    // ── Closed hihat (8th notes) ──
    this.patHihat = [
      1,_,1,_,1,_,1,_, 1,_,1,_,1,_,1,_,
      1,_,1,_,1,_,1,_, 1,_,1,_,1,_,1,_,
      1,_,1,_,1,_,1,_, 1,_,1,_,1,_,1,_,
      1,_,1,_,1,_,1,_, 1,_,1,_,1,_,1,_,
    ];
    // ── Driving bass (8th notes) ──
    this.patBass = [
      D2,_,D2,_,F2,_,F2,_, A2,_,A2,_,G2,_,G2,_,  // Dm feel
      C3,_,C3,_,A2,_,A2,_, Bb2,_,Bb2,_,Cs3,_,D3,_,  // tension → resolve
      D2,_,D2,_,F2,_,F2,_, C3,_,C3,_,D2,_,D2,_,
      A2,_,A2,_,G2,_,G2,_, F2,_,F2,_,E2,_,E2,_,   // downward tension
    ];
    // ── Lead melody (angular, aggressive D minor) ──
    this.patLead = [
      D4,_,_,_, F4,_,A4,_, D5,_,_,_,  A4,_,_,_,
      Bb4,_,_,_,A4,_,G4,_, F4,_,E4,_,  F4,_,_,_,
      D5,_,_,_,Cs4,_,D5,_, Bb4,_,A4,_, G4,_,_,_,
      F4,_,_,_, E4,_,F4,_, _,_,_,_,    D5,_,_,_,
    ];
    // ── Fast D-minor arpeggio (every 16th note) ──
    this.patArp = [
      D3,F3,A3,C4, D3,F3,A3,C4, D3,F3,A3,C4, D3,F3,A3,C4,  // Dm7
      A2,C3,F3,A3, A2,C3,F3,A3, A2,C3,F3,A3, A2,C3,F3,A3,  // Fadd9
      D3,F3,A3,C4, D3,F3,A3,C4, C3,E3,G3,Bb3,C3,E3,G3,Bb3, // Dm / Cm
      A2,C3,E3,G3, A2,C3,E3,G3, F2,A2,D3,F3, F2,A2,D3,F3,  // Am / F cadence
    ];
  }

  _init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.ctx.destination);

    // Short slapback echo
    this._echoDelay = this.ctx.createDelay(1.0);
    this._echoDelay.delayTime.value = 0.12;
    this._echoFB  = this.ctx.createGain(); this._echoFB.gain.value  = 0.18;
    this._echoWet = this.ctx.createGain(); this._echoWet.gain.value = 0.15;
    this._echoDelay.connect(this._echoFB);
    this._echoFB.connect(this._echoDelay);
    this._echoDelay.connect(this._echoWet);
    this._echoWet.connect(this.masterGain);

    this.gLead  = this.ctx.createGain(); this.gLead.gain.value  = 0.26;
    this.gBass  = this.ctx.createGain(); this.gBass.gain.value  = 0.38;
    this.gArp   = this.ctx.createGain(); this.gArp.gain.value   = 0.10;
    this.gDrum  = this.ctx.createGain(); this.gDrum.gain.value  = 0.24;

    this.gLead.connect(this.masterGain);
    this.gLead.connect(this._echoDelay);
    this.gBass.connect(this.masterGain);
    this.gArp.connect(this.masterGain);
    this.gDrum.connect(this.masterGain);
  }

  // ── Voice helpers ─────────────────────────────────────────
  _osc(freq, type, t, dur, gNode) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    env.gain.setValueAtTime(0.001, t);
    env.gain.exponentialRampToValueAtTime(0.85, t + 0.008);
    env.gain.setValueAtTime(0.85, t + dur * 0.55);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(env); env.connect(gNode);
    osc.start(t); osc.stop(t + dur + 0.01);
  }

  _lead(freq, t, dur) {
    const ctx = this.ctx;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, t);
    env.gain.exponentialRampToValueAtTime(0.8, t + 0.007);
    env.gain.setValueAtTime(0.8, t + dur * 0.5);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    env.connect(this.gLead);
    for (const det of [0, 7]) {
      const o = ctx.createOscillator();
      o.type = 'square'; o.frequency.setValueAtTime(freq, t);
      o.detune.setValueAtTime(det, t); o.connect(env);
      o.start(t); o.stop(t + dur + 0.01);
    }
  }

  _kick(t) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.10);
    env.gain.setValueAtTime(1.0, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(env); env.connect(this.gDrum);
    osc.start(t); osc.stop(t + 0.13);
  }

  _snare(t) {
    const ctx = this.ctx;
    const len = Math.ceil(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass'; flt.frequency.value = 2400; flt.Q.value = 0.9;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.9, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
    src.connect(flt); flt.connect(env); env.connect(this.gDrum);
    src.start(t); src.stop(t + 0.12);
  }

  _hihat(t) {
    const ctx = this.ctx;
    const len = Math.ceil(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const flt = ctx.createBiquadFilter();
    flt.type = 'highpass'; flt.frequency.value = 7000;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.5, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    src.connect(flt); flt.connect(env); env.connect(this.gDrum);
    src.start(t); src.stop(t + 0.045);
  }

  _scheduleStep(step, t) {
    if (this.patKick[step])  this._kick(t);
    if (this.patSnare[step]) this._snare(t);
    if (this.patHihat[step]) this._hihat(t);

    const bas = this.patBass[step];
    const ld  = this.patLead[step];
    const arp = this.patArp[step];

    if (bas !== null) this._osc(bas, 'triangle', t, this.STEP * 1.9, this.gBass);
    if (ld  !== null) this._lead(ld, t, this.STEP * 3.5);
    if (arp !== null) this._osc(arp, 'square', t, this.STEP * 0.9, this.gArp);
  }

  _pump() {
    const t = this.ctx.currentTime;
    const lookahead = 0.08;
    while (this._next < t + lookahead) {
      this._scheduleStep(this._step, this._next);
      this._step = (this._step + 1) % this.STEPS;
      this._next += this.STEP;
    }
  }

  // ── Public API ────────────────────────────────────────────
  start() {
    if (this.playing) return;
    this.playing = true;
    this._init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this._step = 0;
    this._next = this.ctx.currentTime + 0.05;
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.masterGain.gain.exponentialRampToValueAtTime(
      this.muted ? 0.001 : 0.52,
      this.ctx.currentTime + 0.8
    );
    this._timer = setInterval(() => this._pump(), this.TICK);
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this._timer);
    this._timer = null;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : 0.52,
        this.ctx.currentTime,
        0.2
      );
    }
    return this.muted;
  }
}

window.BossMusic = new BossMusicSystem();
