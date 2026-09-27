class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicEnabled = true;
    this.master = .42;
    this.timer = null;
    this.category = '';
    this.variation = 0;
  }

  configure(settings) {
    this.enabled = settings.sound !== false;
    this.musicEnabled = settings.music !== false;
    this.master = Number(settings.volume ?? .42);
  }

  context() {
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      this.ctx ||= new C();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    } catch { return null; }
  }

  tone(freq = 440, duration = .09, type = 'sine', gain = .06, delay = 0) {
    const c = this.context();
    if (!c) return;
    const start = c.currentTime + delay;
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    amp.gain.setValueAtTime(Math.max(.0001, gain * this.master), start);
    amp.gain.exponentialRampToValueAtTime(.001, start + duration);
    osc.connect(amp);
    amp.connect(c.destination);
    osc.start(start);
    osc.stop(start + duration);
  }

  sweep(from, to, duration, type = 'triangle', gain = .05) {
    const c = this.context();
    if (!c) return;
    const osc = c.createOscillator();
    const amp = c.createGain();
    const start = c.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + duration);
    amp.gain.setValueAtTime(gain * this.master, start);
    amp.gain.exponentialRampToValueAtTime(.001, start + duration);
    osc.connect(amp);
    amp.connect(c.destination);
    osc.start(start);
    osc.stop(start + duration);
  }

  effect(name = 'tap') {
    if (!this.enabled) return;
    const play = notes => notes.forEach(([freq, duration, type, gain, delay = 0]) => this.tone(freq, duration, type, gain, delay));
    if (name === 'go') { this.sweep(480, 980, .16, 'triangle', .05); play([[880, .13, 'sine', .04, .045]]); return; }
    if (name === 'record') { play([[660,.13,'triangle',.055],[880,.16,'triangle',.05,.07],[1320,.23,'sine',.045,.14]]); return; }
    if (name === 'perfect') { play([[784,.14,'triangle',.055],[1046,.18,'triangle',.05,.065],[1568,.24,'sine',.04,.13]]); return; }
    if (name === 'success' || name === 'hit') { play([[680,.085,'triangle',.06],[1020,.11,'sine',.035,.025]]); return; }
    if (name === 'coin' || name === 'eat') { play([[740,.06,'square',.025],[1110,.1,'sine',.045,.035]]); return; }
    if (name === 'gameover' || name === 'miss' || name === 'fail') { this.sweep(360, 115, name === 'gameover' ? .3 : .16, 'triangle', .045); return; }
    if (name === 'click') { play([[570,.025,'square',.024],[900,.045,'sine',.018,.018]]); return; }
    if (name === 'target') { play([[980,.045,'sine',.02],[740,.06,'triangle',.018,.035]]); return; }
    const map = {
      tap:[520,.035,'sine',.025], hover:[760,.025,'sine',.012], countdown:[420,.065,'sine',.028],
      round:[570,.09,'triangle',.035], gameover:[155,.24,'sawtooth',.026],
    };
    this.tone(...(map[name] || map.tap));
  }

  start(category) {
    this.stop();
    if (!this.musicEnabled) return;
    const c = this.context();
    if (!c) return;
    this.category = category;
    this.variation = Math.floor(Math.random() * 3);
    const tempo = {Reaction:132,Accuracy:92,Vision:82,Memory:76,Math:112,Logic:82,Arcade:145,Fun:118,Speed:138,Luck:105}[category] || 104;
    const scale = category === 'Memory' ? [220,261.63,329.63,392] : category === 'Arcade' ? [110,146.83,164.81,220] : [164.81,196,246.94,293.66,369.99];
    const patterns = [[0,2,1,3,2,1,0,3],[0,1,3,2,1,3,2,0],[0,2,3,1,0,3,1,2]][this.variation];
    let n = 0;
    this.timer = setInterval(() => {
      if (!this.musicEnabled || !this.ctx) return;
      const ix = patterns[n % patterns.length];
      this.tone(scale[ix],.16,'triangle',.018);
      if (n % 2 === 0) this.tone(scale[0]/2,.19,'sine',.026);
      if (n % 4 === 2) this.tone(80,.035,'square',.013);
      n++;
    }, 60000 / tempo / 2);
  }

  stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } this.category = ''; }
  setMusic(on) { this.musicEnabled = on; if (!on) this.stop(); }
  setSound(on) { this.enabled = on; }
}

export const audio = new AudioManager();
