// audio.js — every sound is synthesised with WebAudio: no audio files,
// no network. A low ambient hum, footstep ticks, coin clinks, pickup
// chimes, lockpick clicks, the alarm swell and the EMP zap.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.ambient = null;
    this.ambientGain = null;
  }

  ensure() {
    if (this.ctx) {
      // Browsers start AudioContext suspended until a gesture; resume it.
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.startAmbient();
    } catch {
      this.ctx = null;
    }
  }

  startAmbient() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.035;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    lfo.start();
    this.ambient = osc;
    this.ambientGain = gain;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx) this.ctx.destination.gain.value = this.muted ? 0 : 1;
    return this.muted;
  }

  blip(freq, dur, type = 'sine', vol = 0.12, slideTo = null) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch {
      // Audio is decoration; never let it break the game.
    }
  }

  footstep(sneaking) {
    this.blip(sneaking ? 140 : 180, 0.05, 'triangle', sneaking ? 0.02 : 0.045);
  }
  clink() {
    this.blip(2400, 0.12, 'sine', 0.1, 1800);
    this.blip(3100, 0.08, 'sine', 0.06, 2600);
  }
  pickup() {
    this.blip(660, 0.12, 'sine', 0.12);
    this.blip(990, 0.18, 'sine', 0.12);
  }
  lockpick() {
    this.blip(1200, 0.04, 'square', 0.04);
  }
  deny() {
    this.blip(160, 0.15, 'square', 0.07, 110);
  }
  alert() {
    this.blip(520, 0.3, 'sawtooth', 0.09, 780);
  }
  alarmSwell() {
    this.blip(440, 0.8, 'sawtooth', 0.08, 880);
    this.blip(440, 0.8, 'sawtooth', 0.05, 220);
  }
  emp() {
    this.blip(1800, 0.35, 'sawtooth', 0.1, 120);
  }
  caught() {
    this.blip(300, 0.5, 'sawtooth', 0.12, 90);
  }
  win() {
    this.blip(523, 0.18, 'sine', 0.12);
    this.blip(659, 0.18, 'sine', 0.12);
    this.blip(784, 0.36, 'sine', 0.14);
  }
}
