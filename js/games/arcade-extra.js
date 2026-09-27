import { startCountdown } from '../lib/countdown.js';
import { supportsTouchInput } from '../lib/touch.js';

const extraModes = new Set([
  'dodge', 'meteorDodge', 'catchCoin', 'avoidBomb', 'miniPong', 'miniFlappy',
  'jumpNow', 'laneSwitch', 'coinDash', 'laserEscape'
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const rand = (limit) => Math.floor(Math.random() * limit);
const touchDevice = () => supportsTouchInput({ maxTouchPoints: navigator.maxTouchPoints, coarsePointer: window.matchMedia('(pointer: coarse)').matches });

export function isExtraArcadeMode(mode) {
  return extraModes.has(mode);
}

export function mountExtraArcade({ panel, game, finish, sound, onStart = () => {} }) {
  let alive = true;
  let complete = false;
  let startedAt = 0;
  let raf = 0;
  let timer = 0;
  let handler = null;
  let score = 0;
  let countdownCancel = null;
  const listeners = [];
  const held = new Set();

  const listen = (target, type, fn, options) => {
    target.addEventListener(type, fn, options);
    listeners.push(() => target.removeEventListener(type, fn, options));
  };
  const cleanup = () => {
    if (!alive) return;
    alive = false;
    countdownCancel?.();
    cancelAnimationFrame(raf);
    clearInterval(timer);
    listeners.splice(0).forEach(remove => remove());
    panel.classList.remove('playing');
  };
  const end = (points = score, extra = {}) => {
    if (complete || !alive) return;
    complete = true;
    const elapsed = Math.max(0, performance.now() - startedAt);
    cleanup();
    finish({ score: Math.max(0, Math.round(points)), elapsed, perfect: false, ...extra });
  };
  const startView = () => {
    panel.classList.remove('playing');
    panel.innerHTML = `<div class="eyebrow">ARCADE · ${game.difficulty}</div><h2>${game.title}</h2><p class="instructions">${game.instructions}</p><button class="button primary" id="extra-arcade-start">PLAY NOW →</button><p class="mono muted" style="margin-top:20px">ARCADE / QUICK PLAY</p>`;
    panel.querySelector('#extra-arcade-start').addEventListener('click', start, { once: true });
  };
  const start = () => {
    if (!alive || startedAt || countdownCancel) return;
    sound('click');
    countdownCancel = startCountdown({
      panel,
      sound,
      onStart: () => onStart(game.category),
      onGo: () => {
        countdownCancel = null;
        startedAt = performance.now();
        play();
      },
    });
  };
  const mountCanvas = (width = 520, height = 320, info = 'STAY ALIVE') => {
    panel.classList.add('playing');
    panel.innerHTML = `<div class="game-hud"><span id="extra-score">SCORE 0</span><span id="extra-info">${info}</span></div><canvas class="canvas-game" width="${width}" height="${height}" style="width:min(${width}px,100%);height:auto" aria-label="${game.title} playfield"></canvas><div class="touch-controls${touchDevice() ? ' touch-controls-mobile' : ''}" id="extra-controls"></div>`;
    return { canvas: panel.querySelector('canvas'), ctx: panel.querySelector('canvas').getContext('2d'), width, height };
  };
  const setScore = value => {
    score = value;
    const el = panel.querySelector('#extra-score');
    if (el) el.textContent = `SCORE ${Math.floor(score)}`;
  };
  const setInfo = value => {
    const el = panel.querySelector('#extra-info');
    if (el) el.textContent = value;
  };
  const button = (label, onClick) => {
    if (!touchDevice()) return null;
    const el = document.createElement('button');
    el.type = 'button';
    el.textContent = label;
    el.setAttribute('aria-label', label);
    el.addEventListener('click', onClick);
    panel.querySelector('#extra-controls').append(el);
    return el;
  };
  const holdButton = (label, key) => {
    const el = button(label, () => {});
    if (!el) return;
    const down = event => { event.preventDefault(); held.add(key); };
    const up = () => held.delete(key);
    listen(el, 'pointerdown', down);
    listen(el, 'pointerup', up);
    listen(el, 'pointercancel', up);
    listen(el, 'pointerleave', up);
  };
  const bindKeys = (onPress = () => {}) => {
    handler = event => {
      const key = event.key.toLowerCase();
      if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' '].includes(key)) event.preventDefault();
      held.add(key);
      onPress(key, event);
    };
    const release = event => held.delete(event.key.toLowerCase());
    listen(window, 'keydown', handler);
    listen(window, 'keyup', release);
    listen(window, 'blur', () => held.clear());
  };
  const point = (event, canvas, width, height) => {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * width / rect.width, y: (event.clientY - rect.top) * height / rect.height };
  };
  const roundedRect = (ctx, x, y, w, h, color, radius = 8) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
  };
  const background = (ctx, width, height) => {
    ctx.fillStyle = '#10131d';
    ctx.fillRect(0, 0, width, height);
  };

  function play() {
    if (game.mode === 'dodge' || game.mode === 'meteorDodge') return dodge(game.mode === 'meteorDodge');
    if (game.mode === 'catchCoin' || game.mode === 'avoidBomb') return catchItems(game.mode === 'avoidBomb');
    if (game.mode === 'miniPong') return miniPong();
    if (game.mode === 'miniFlappy') return miniFlappy();
    if (game.mode === 'jumpNow') return jumpNow();
    if (game.mode === 'laneSwitch') return laneSwitch();
    if (game.mode === 'coinDash') return coinDash();
    if (game.mode === 'laserEscape') return laserEscape();
  }

  function dodge(meteors) {
    const { canvas, ctx, width: W, height: H } = mountCanvas(520, 320, 'SURVIVE 20s');
    let player = { x: W / 2, y: H - 38 };
    let hazards = [];
    let elapsed = 0;
    let spawnAt = 0;
    let last = performance.now();
    bindKeys();
    holdButton('←', 'arrowleft'); holdButton('→', 'arrowright');
    listen(canvas, 'pointermove', event => { const p = point(event, canvas, W, H); player.x = clamp(p.x, 16, W - 16); if (meteors) player.y = clamp(p.y, 16, H - 16); });
    const loop = now => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(40, now - last) / 1000; last = now; elapsed += dt;
      if (held.has('arrowleft') || held.has('a')) player.x -= 275 * dt;
      if (held.has('arrowright') || held.has('d')) player.x += 275 * dt;
      if (meteors && (held.has('arrowup') || held.has('w'))) player.y -= 230 * dt;
      if (meteors && (held.has('arrowdown') || held.has('s'))) player.y += 230 * dt;
      player.x = clamp(player.x, 16, W - 16); player.y = clamp(player.y, 16, H - 16);
      spawnAt += dt;
      const delay = meteors ? Math.max(.28, .75 - elapsed * .012) : Math.max(.48, .95 - elapsed * .012);
      if (spawnAt >= delay) {
        spawnAt = 0;
        const r = meteors ? 11 + rand(12) : 16 + rand(14);
        const startX = 22 + rand(W - 44);
        hazards.push({ x: startX, y: -r, r, vx: meteors ? rand(100) - 50 : 0, vy: (meteors ? 130 : 115) + elapsed * (meteors ? 5 : 3) });
      }
      hazards.forEach(h => { h.x += h.vx * dt; h.y += h.vy * dt; });
      hazards = hazards.filter(h => h.y < H + h.r);
      if (hazards.some(h => Math.hypot(h.x - player.x, h.y - player.y) < h.r + 12)) { end(Math.floor(elapsed * 50), { seconds: Number(elapsed.toFixed(1)), hit: true }); return; }
      if (elapsed >= 20) { end(1000, { seconds: 20, survived: true, perfect: true }); return; }
      setScore(elapsed * 50); setInfo(`SURVIVE ${(20 - elapsed).toFixed(1)}s`);
      background(ctx, W, H);
      ctx.strokeStyle = '#ffffff12'; ctx.lineWidth = 1;
      for (let x = 40; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      hazards.forEach(h => { ctx.fillStyle = meteors ? '#ff7b9b' : '#ffbd67'; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff50'; ctx.beginPath(); ctx.arc(h.x - h.r * .25, h.y - h.r * .25, h.r * .24, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = '#5fe5ff'; ctx.beginPath(); ctx.arc(player.x, player.y, 13, 0, Math.PI * 2); ctx.fill();
      if (meteors) { ctx.fillStyle = '#ff7b9b'; ctx.font = '12px monospace'; ctx.fillText('METEOR FIELD', 18, 24); }
    };
    raf = requestAnimationFrame(loop);
  }

  function catchItems(bombsEnabled) {
    const { canvas, ctx, width: W, height: H } = mountCanvas(520, 320, 'CATCH COINS · 20s');
    const player = { x: W / 2, y: H - 26, width: 78 };
    let items = [], elapsed = 0, spawnAt = 0, last = performance.now(), caught = 0;
    bindKeys(); holdButton('←', 'arrowleft'); holdButton('→', 'arrowright');
    listen(canvas, 'pointermove', event => { player.x = clamp(point(event, canvas, W, H).x, player.width / 2, W - player.width / 2); });
    const loop = now => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(40, now - last) / 1000; last = now; elapsed += dt;
      if (held.has('arrowleft') || held.has('a')) player.x -= 300 * dt;
      if (held.has('arrowright') || held.has('d')) player.x += 300 * dt;
      player.x = clamp(player.x, player.width / 2, W - player.width / 2);
      spawnAt += dt;
      if (spawnAt > Math.max(.38, .72 - elapsed * .008)) { spawnAt = 0; const bomb = bombsEnabled && Math.random() < .27; items.push({ x: 18 + rand(W - 36), y: -18, r: bomb ? 14 : 11, bomb, vy: 125 + elapsed * 4 }); }
      items.forEach(item => item.y += item.vy * dt);
      for (const item of items) {
        if (item.y + item.r >= player.y - 7 && item.y - item.r <= player.y + 5 && Math.abs(item.x - player.x) <= player.width / 2 + item.r) {
          if (item.bomb) { end(caught * 100, { coins: caught, hitBomb: true }); return; }
          item.caught = true; caught++; sound('coin');
        }
      }
      items = items.filter(item => !item.caught && item.y < H + 20);
      if (elapsed >= 20) { end(caught * 100, { coins: caught, seconds: 20, perfect: caught >= 15 }); return; }
      setScore(caught * 100); setInfo(`COINS ${caught} · ${(20 - elapsed).toFixed(1)}s`);
      background(ctx, W, H);
      ctx.fillStyle = '#ffffff16'; for (let i = 0; i < 8; i++) ctx.fillRect(i * 70 + 15, 0, 1, H);
      items.forEach(item => { ctx.fillStyle = item.bomb ? '#ff526b' : '#5fe5ff'; ctx.beginPath(); ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = item.bomb ? '#3b111c' : '#81601e'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(item.bomb ? '!' : '$', item.x, item.y); });
      roundedRect(ctx, player.x - player.width / 2, player.y - 10, player.width, 17, '#7ee7e4', 8);
      ctx.fillStyle = '#10131d'; ctx.fillRect(player.x - 15, player.y - 4, 30, 4);
    };
    raf = requestAnimationFrame(loop);
  }

  function miniPong() {
    const { canvas, ctx, width: W, height: H } = mountCanvas(520, 320, 'KEEP THE BALL ALIVE');
    const paddle = { x: W / 2, y: H - 24, w: 100, h: 12 };
    const ball = { x: W / 2, y: 70, vx: 150, vy: 190, r: 9 };
    let elapsed = 0, rebounds = 0, last = performance.now();
    bindKeys();
    listen(canvas, 'pointermove', event => { paddle.x = clamp(point(event, canvas, W, H).x, paddle.w / 2, W - paddle.w / 2); });
    listen(canvas, 'pointerdown', event => { paddle.x = clamp(point(event, canvas, W, H).x, paddle.w / 2, W - paddle.w / 2); });
    const loop = now => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(35, now - last) / 1000; last = now; elapsed += dt;
      if (held.has('arrowleft') || held.has('a')) paddle.x -= 330 * dt;
      if (held.has('arrowright') || held.has('d')) paddle.x += 330 * dt;
      paddle.x = clamp(paddle.x, paddle.w / 2, W - paddle.w / 2);
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < ball.r || ball.x > W - ball.r) { ball.vx *= -1; ball.x = clamp(ball.x, ball.r, W - ball.r); }
      if (ball.y < ball.r) { ball.vy = Math.abs(ball.vy); ball.y = ball.r; }
      if (ball.vy > 0 && ball.y + ball.r >= paddle.y - 2 && ball.y - ball.r <= paddle.y + paddle.h && Math.abs(ball.x - paddle.x) < paddle.w / 2 + ball.r) {
        const offset = (ball.x - paddle.x) / (paddle.w / 2);
        ball.vx = clamp(ball.vx + offset * 95, -270, 270); ball.vy = -Math.min(310, Math.abs(ball.vy) + 8); ball.y = paddle.y - ball.r; rebounds++; sound('tap');
      }
      if (ball.y > H + ball.r) { end(rebounds * 100, { rebounds, seconds: Number(elapsed.toFixed(1)) }); return; }
      if (elapsed >= 30) { end(rebounds * 100 + 500, { rebounds, seconds: 30, perfect: true }); return; }
      setScore(rebounds * 100); setInfo(`RALLIES ${rebounds} · ${(30 - elapsed).toFixed(0)}s`);
      background(ctx, W, H);
      ctx.strokeStyle = '#ffffff22'; ctx.setLineDash([5, 9]); ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke(); ctx.setLineDash([]);
      roundedRect(ctx, paddle.x - paddle.w / 2, paddle.y, paddle.w, paddle.h, '#5fe5ff', 6);
      ctx.fillStyle = '#7ee7e4'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9ca5b9'; ctx.font = '12px monospace'; ctx.textAlign = 'center'; ctx.fillText('MOVE PADDLE · KEEP IT BOUNCING', W / 2, 26);
    };
    raf = requestAnimationFrame(loop);
  }

  function miniFlappy() {
    const { canvas, ctx, width: W, height: H } = mountCanvas(520, 320, 'GAPS CLEARED 0');
    const bird = { x: 118, y: H / 2, vy: 0, r: 12 };
    let pipes = [], elapsed = 0, passed = 0, spawnAt = 0, last = performance.now();
    const flap = event => { event?.preventDefault?.(); bird.vy = -330; sound('tap'); };
    bindKeys((key, event) => { if (key === ' ' || key === 'arrowup' || key === 'w') flap(event); });
    listen(canvas, 'pointerdown', flap);
    button('FLAP', flap);
    const loop = now => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(35, now - last) / 1000; last = now; elapsed += dt;
      bird.vy += 760 * dt; bird.y += bird.vy * dt;
      spawnAt += dt;
      if (spawnAt > 1.45) { spawnAt = 0; const gap = 116; const center = 95 + rand(135); pipes.push({ x: W + 26, gapTop: center - gap / 2, gapBottom: center + gap / 2, scored: false }); }
      const speed = 155 + elapsed * 2.2;
      pipes.forEach(pipe => pipe.x -= speed * dt);
      pipes = pipes.filter(pipe => pipe.x > -60);
      if (bird.y - bird.r < 0 || bird.y + bird.r > H || pipes.some(p => bird.x + bird.r > p.x && bird.x - bird.r < p.x + 48 && (bird.y - bird.r < p.gapTop || bird.y + bird.r > p.gapBottom))) { end(passed * 100, { gaps: passed, hit: true }); return; }
      pipes.forEach(pipe => { if (!pipe.scored && pipe.x + 48 < bird.x) { pipe.scored = true; passed++; sound('success'); } });
      if (elapsed >= 30) { end(passed * 100 + 500, { gaps: passed, seconds: 30, perfect: true }); return; }
      setScore(passed * 100); setInfo(`GAPS ${passed} · SPACE / TAP`);
      background(ctx, W, H);
      ctx.fillStyle = '#182336'; ctx.fillRect(0, 0, W, H);
      pipes.forEach(p => { roundedRect(ctx, p.x, 0, 48, p.gapTop, '#7ee7e4', 5); roundedRect(ctx, p.x, p.gapBottom, 48, H - p.gapBottom, '#7ee7e4', 5); });
      ctx.fillStyle = '#5fe5ff'; ctx.beginPath(); ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#10131d'; ctx.beginPath(); ctx.arc(bird.x + 4, bird.y - 3, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff70'; ctx.font = '12px monospace'; ctx.fillText('FLAP THROUGH THE GAPS', 18, 24);
    };
    raf = requestAnimationFrame(loop);
  }

  function jumpNow() {
    const { canvas, ctx, width: W, height: H } = mountCanvas(520, 320, 'JUMP THE OBSTACLES');
    const ground = 257, px = 88;
    let y = 0, vy = 0, grounded = true, obstacles = [], elapsed = 0, spawnAt = 0, last = performance.now();
    const jump = event => { event?.preventDefault?.(); if (grounded) { vy = -365; grounded = false; sound('tap'); } };
    bindKeys((key, event) => { if (key === ' ' || key === 'arrowup' || key === 'w') jump(event); });
    listen(canvas, 'pointerdown', jump); button('JUMP', jump);
    const loop = now => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(35, now - last) / 1000; last = now; elapsed += dt;
      vy += 920 * dt; y += vy * dt; if (y >= 0) { y = 0; vy = 0; grounded = true; }
      spawnAt += dt;
      const speed = 210 + elapsed * 5;
      if (spawnAt > Math.max(.68, 1.2 - elapsed * .012)) { spawnAt = 0; obstacles.push({ x: W + 15, w: 22 + rand(17), h: 28 + rand(37) }); }
      obstacles.forEach(o => o.x -= speed * dt); obstacles = obstacles.filter(o => o.x + o.w > 0);
      const py = ground - 31 + y;
      if (obstacles.some(o => o.x < px + 25 && o.x + o.w > px && py + 31 > ground - o.h)) { end(Math.floor(elapsed * 55), { seconds: Number(elapsed.toFixed(1)), distance: Math.floor(elapsed * 55) }); return; }
      if (elapsed >= 30) { end(1800, { seconds: 30, distance: 1800, perfect: true }); return; }
      setScore(elapsed * 55); setInfo(`DISTANCE ${Math.floor(elapsed * 55)} · ${Math.floor(30 - elapsed)}s`);
      background(ctx, W, H); ctx.fillStyle = '#202945'; ctx.fillRect(0, 0, W, ground); ctx.fillStyle = '#b9d7ed'; ctx.fillRect(0, ground, W, H - ground);
      ctx.fillStyle = '#ffffff28'; for (let i = 0; i < 7; i++) ctx.fillRect((i * 83 - elapsed * speed * .3 % 83), 72 + i % 3 * 38, 32, 2);
      roundedRect(ctx, px, py, 26, 31, '#5fe5ff', 7);
      obstacles.forEach(o => roundedRect(ctx, o.x, ground - o.h, o.w, o.h, '#ff7b9b', 5));
    };
    raf = requestAnimationFrame(loop);
  }

  function laneSwitch() {
    const { canvas, ctx, width: W, height: H } = mountCanvas(520, 320, 'SWITCH LANES');
    const lanes = [W * .25, W * .5, W * .75];
    let lane = 1, hazards = [], elapsed = 0, spawnAt = 0, dodged = 0, last = performance.now();
    const move = dir => { lane = clamp(lane + dir, 0, 2); sound('tap'); };
    bindKeys((key, event) => { if (key === 'arrowleft' || key === 'a') move(-1); else if (key === 'arrowright' || key === 'd') move(1); });
    button('←', () => move(-1)); button('→', () => move(1));
    listen(canvas, 'pointerdown', event => { const x = point(event, canvas, W, H).x; move(x < W / 2 ? -1 : 1); });
    const loop = now => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(35, now - last) / 1000; last = now; elapsed += dt; spawnAt += dt;
      const speed = 120 + elapsed * 4;
      if (spawnAt > Math.max(.48, .9 - elapsed * .009)) { spawnAt = 0; hazards.push({ lane: rand(3), y: -28, passed: false }); }
      hazards.forEach(h => h.y += speed * dt);
      if (hazards.some(h => h.lane === lane && h.y > H - 87 && h.y < H - 24)) { end(dodged * 100, { dodged, seconds: Number(elapsed.toFixed(1)) }); return; }
      hazards.forEach(h => { if (!h.passed && h.y > H - 20) { h.passed = true; dodged++; } }); hazards = hazards.filter(h => h.y < H + 35);
      if (elapsed >= 25) { end(dodged * 100 + 500, { dodged, seconds: 25, perfect: true }); return; }
      setScore(dodged * 100); setInfo(`CLEARED ${dodged} · ${(25 - elapsed).toFixed(0)}s`);
      background(ctx, W, H); ctx.fillStyle = '#ffffff10'; for (const x of lanes) { ctx.fillRect(x - 1, 0, 2, H); }
      hazards.forEach(h => roundedRect(ctx, lanes[h.lane] - 20, h.y, 40, 27, '#ff7b9b', 7));
      ctx.fillStyle = '#5fe5ff'; ctx.beginPath(); ctx.moveTo(lanes[lane], H - 49); ctx.lineTo(lanes[lane] - 17, H - 20); ctx.lineTo(lanes[lane] + 17, H - 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#9ca5b9'; ctx.font = '12px monospace'; ctx.textAlign = 'center'; ctx.fillText('THREE LANES · KEEP A CLEAR PATH', W / 2, 24);
    };
    raf = requestAnimationFrame(loop);
  }

  function coinDash() {
    const { canvas, ctx, width: W, height: H } = mountCanvas(520, 320, 'COLLECT COINS · 20s');
    const player = { x: W / 2, y: H / 2, r: 13 };
    let coin = { x: 80, y: 70 }, caught = 0, elapsed = 0, last = performance.now();
    const placeCoin = () => { let candidate; do { candidate = { x: 24 + rand(W - 48), y: 42 + rand(H - 70) }; } while (Math.hypot(candidate.x - player.x, candidate.y - player.y) < 70); coin = candidate; };
    placeCoin(); bindKeys(); holdButton('↑', 'arrowup'); holdButton('←', 'arrowleft'); holdButton('↓', 'arrowdown'); holdButton('→', 'arrowright');
    listen(canvas, 'pointerdown', event => { const target = point(event, canvas, W, H); player.x = target.x; player.y = target.y; });
    const loop = now => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(35, now - last) / 1000; last = now; elapsed += dt;
      const speed = 205;
      if (held.has('arrowleft') || held.has('a')) player.x -= speed * dt;
      if (held.has('arrowright') || held.has('d')) player.x += speed * dt;
      if (held.has('arrowup') || held.has('w')) player.y -= speed * dt;
      if (held.has('arrowdown') || held.has('s')) player.y += speed * dt;
      player.x = clamp(player.x, player.r, W - player.r); player.y = clamp(player.y, player.r + 22, H - player.r);
      if (Math.hypot(player.x - coin.x, player.y - coin.y) < player.r + 11) { caught++; sound('coin'); placeCoin(); }
      if (elapsed >= 20) { end(caught * 100, { coins: caught, seconds: 20, perfect: caught >= 12 }); return; }
      setScore(caught * 100); setInfo(`COINS ${caught} · ${(20 - elapsed).toFixed(1)}s`);
      background(ctx, W, H); ctx.strokeStyle = '#ffffff0d'; for (let x = 20; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      ctx.fillStyle = '#5fe5ff'; ctx.beginPath(); ctx.arc(coin.x, coin.y, 11, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#705924'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', coin.x, coin.y);
      ctx.fillStyle = '#7ee7e4'; ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill();
    };
    raf = requestAnimationFrame(loop);
  }

  function laserEscape() {
    const { canvas, ctx, width: W, height: H } = mountCanvas(520, 320, 'DODGE THE LASER');
    const cell = 60, ox = (W - cell * 4) / 2, oy = (H - cell * 4) / 2 + 8;
    let player = { x: 1, y: 2 }, pulse = 0, elapsed = 0, phase = 'warning', phaseAt = performance.now(), hazard = { axis: 'row', index: 0 }, last = performance.now();
    const chooseHazard = () => hazard = Math.random() < .5 ? { axis: 'row', index: rand(4) } : { axis: 'col', index: rand(4) };
    const move = (dx, dy) => { const nx = clamp(player.x + dx, 0, 3), ny = clamp(player.y + dy, 0, 3); if (nx !== player.x || ny !== player.y) { player = { x: nx, y: ny }; sound('tap'); } };
    bindKeys((key, event) => { if (key === 'arrowleft' || key === 'a') move(-1, 0); else if (key === 'arrowright' || key === 'd') move(1, 0); else if (key === 'arrowup' || key === 'w') move(0, -1); else if (key === 'arrowdown' || key === 's') move(0, 1); });
    button('↑', () => move(0, -1)); button('←', () => move(-1, 0)); button('↓', () => move(0, 1)); button('→', () => move(1, 0));
    listen(canvas, 'pointerdown', event => { const p = point(event, canvas, W, H), x = Math.floor((p.x - ox) / cell), y = Math.floor((p.y - oy) / cell); if (x >= 0 && x < 4 && y >= 0 && y < 4 && Math.abs(x - player.x) + Math.abs(y - player.y) === 1) move(x - player.x, y - player.y); });
    chooseHazard();
    const loop = now => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(35, now - last) / 1000; last = now; elapsed += dt;
      const phaseLength = phase === 'warning' ? Math.max(.62, 1.05 - pulse * .045) : .26;
      if (now - phaseAt >= phaseLength * 1000) {
        phaseAt = now;
        if (phase === 'warning') { phase = 'fire'; setInfo('LASER!'); }
        else {
          const hit = hazard.axis === 'row' ? player.y === hazard.index : player.x === hazard.index;
          if (hit) { end(pulse * 150, { pulses: pulse, hitLaser: true }); return; }
          pulse++; setScore(pulse * 150); sound('success');
          if (pulse >= 7) { end(1050, { pulses: pulse, perfect: true }); return; }
          chooseHazard(); phase = 'warning'; setInfo(`${hazard.axis.toUpperCase()} ${hazard.index + 1} · MOVE!`);
        }
      }
      if (phase === 'warning') setInfo(`${hazard.axis.toUpperCase()} ${hazard.index + 1} · MOVE!`);
      background(ctx, W, H);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        const isHazard = hazard.axis === 'row' ? y === hazard.index : x === hazard.index;
        const color = isHazard ? (phase === 'warning' ? '#9a682e' : '#e34161') : '#202638';
        roundedRect(ctx, ox + x * cell + 4, oy + y * cell + 4, cell - 8, cell - 8, color, 9);
      }
      ctx.fillStyle = '#5fe5ff'; ctx.beginPath(); ctx.arc(ox + player.x * cell + cell / 2, oy + player.y * cell + cell / 2, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9ca5b9'; ctx.font = '12px monospace'; ctx.textAlign = 'center'; ctx.fillText(phase === 'warning' ? 'AMBER ROW / COLUMN WILL FIRE' : 'LASER FIRING', W / 2, 22);
      ctx.textAlign = 'left'; ctx.fillText(`PULSES ${pulse} / 7`, 18, H - 12);
    };
    raf = requestAnimationFrame(loop);
  }

  startView();
  return { start, cleanup };
}
