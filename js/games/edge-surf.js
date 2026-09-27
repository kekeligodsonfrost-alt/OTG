import { supportsTouchInput } from '../lib/touch.js';

const levels = [
  { name: 'PALM BAY', length: 1900, speed: 190, obstacles: [[250,390,'buoy'],[430,565,'rock'],[610,330,'log'],[790,495,'buoy'],[970,380,'rock'],[1180,560,'log'],[1370,300,'buoy'],[1580,470,'rock']] },
  { name: 'REEF RUN', length: 2200, speed: 205, obstacles: [[230,330,'rock'],[390,535,'buoy'],[540,430,'reef'],[700,585,'log'],[850,350,'buoy'],[1010,500,'rock'],[1170,385,'reef'],[1340,565,'buoy'],[1500,320,'log'],[1680,475,'rock'],[1870,375,'buoy']] },
  { name: 'STORM POINT', length: 2500, speed: 220, obstacles: [[220,420,'buoy'],[360,550,'rock'],[500,335,'log'],[650,485,'reef'],[800,380,'buoy'],[950,565,'rock'],[1100,315,'reef'],[1260,465,'log'],[1420,370,'buoy'],[1580,550,'rock'],[1740,325,'log'],[1910,485,'reef'],[2090,380,'buoy'],[2260,550,'rock']] },
];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const bestKey = 'osg-edge-surf-best-v1';

export function mountEdgeSurf({ panel, game, finish, sound, onStart = () => {}, startLevel = 0 }) {
  let alive = true, raf = 0, levelIndex = clamp(Number(startLevel)||0,0,levels.length-1), state = 'menu', elapsed = 0, distance = 0, lives = 3, boost = 100;
  let last = 0, hitFlash = 0, paused = false, countdown = 0, swipe = null;
  const touch = supportsTouchInput({ maxTouchPoints: navigator.maxTouchPoints || 0, coarsePointer: matchMedia('(pointer: coarse)').matches });
  panel.classList.add('edge-surf-panel');
  panel.innerHTML = `<div class="surf-wrap"><canvas class="canvas-game edge-surf-canvas" width="960" height="540" tabindex="0" role="application" aria-label="Edge Surf time trial. Use arrow keys or WASD to steer, up to boost. Swipe or use touch buttons on touch devices."></canvas><progress class="visually-hidden" id="surf-course-progress" max="100" value="0" aria-label="Course progress"></progress><p class="visually-hidden" id="surf-live-status" aria-live="polite"></p><div class="surf-mobile-controls" ${touch ? '' : 'hidden'} aria-label="Surf controls"><div class="surf-menu-controls"><button type="button" data-surf-menu="previous" aria-label="Previous surf level">‹ LEVEL</button><button type="button" class="surf-start" data-surf-menu="start" aria-label="Start surf time trial">START RACE</button><button type="button" data-surf-menu="next" aria-label="Next surf level">LEVEL ›</button><button type="button" data-surf-menu="settings" aria-label="Open surf settings">SETTINGS</button></div><div class="surf-race-controls" hidden><div class="surf-dpad"><button type="button" data-surf="left" aria-label="Steer left">◀</button><button type="button" data-surf="up" aria-label="Boost">▲</button><button type="button" data-surf="right" aria-label="Steer right">▶</button></div><button type="button" class="surf-boost" data-surf="boost" aria-label="Hold to boost">BOOST</button></div></div></div>`;
  const canvas = panel.querySelector('canvas'), controls = panel.querySelector('.surf-mobile-controls'), menuControls=controls.querySelector('.surf-menu-controls'), raceControls=controls.querySelector('.surf-race-controls');
  // Render the whole game through a compact low-resolution buffer so scenery,
  // character, HUD, and effects share the same crisp pixel-art treatment.
  canvas.width = 480;
  canvas.height = 270;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
  let surfer = { x: 480, y: 425, vx: 0, vy: 0 }, keys = new Set(), settingsOpen=false, lastSpokenSecond=-1;
  const remove = [];
  const listen = (el, type, fn, opts) => { el.addEventListener(type, fn, opts); remove.push(() => el.removeEventListener(type, fn, opts)); };
  const toCanvas = event => { const r = canvas.getBoundingClientRect(); return { x: (event.clientX - r.left) * 960 / r.width, y: (event.clientY - r.top) * 540 / r.height }; };
  const best = () => { try { return Number(localStorage.getItem(`${bestKey}-${levelIndex}`)) || 0; } catch { return 0; } };
  const setBest = value => { try { const old = best(); if (!old || value < old) localStorage.setItem(`${bestKey}-${levelIndex}`, String(value)); } catch { /* Best time remains available for this session when storage is unavailable. */ } };
  const syncControls=()=>{menuControls.hidden=!touch||!['menu','crashed'].includes(state);raceControls.hidden=!touch||state!=='playing'};
  const rounded = (x,y,w,h,r,color) => { ctx.fillStyle=color; ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fill(); };
  function drawOcean(now) {
    const water = ctx.createLinearGradient(0,0,0,540); water.addColorStop(0,'#48cfe0'); water.addColorStop(.53,'#14b9d0'); water.addColorStop(1,'#058eae'); ctx.fillStyle=water; ctx.fillRect(0,0,960,540);
    ctx.globalAlpha=.17; ctx.fillStyle='#d7ffff';
    for(let i=0;i<16;i++){const x=((i*87-(distance*.38)%1050)+1050)%1050-45,y=(i*61+Math.sin(now*.001+i)*9)%540;ctx.fillRect(x,y,34+(i%3)*14,3);ctx.fillRect(x+12,y+5,24,2)}
    ctx.globalAlpha=1;
    // Distant islands and palms create layered depth without image assets.
    for(const [x,y,s] of [[45,115,.72],[850,92,.8],[70,440,.62],[880,430,.72]]){
      ctx.fillStyle='#d5b981';ctx.beginPath();ctx.ellipse(x,y,68*s,25*s,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#45a878';ctx.beginPath();ctx.ellipse(x,y-8*s,55*s,22*s,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#754a31';ctx.lineWidth=8*s;ctx.beginPath();ctx.moveTo(x,y-10*s);ctx.quadraticCurveTo(x+5*s,y-42*s,x+8*s,y-55*s);ctx.stroke();ctx.fillStyle='#55bd72';for(let j=0;j<5;j++){const a=j*Math.PI*.4-.8;ctx.beginPath();ctx.ellipse(x+8*s+Math.cos(a)*24*s,y-55*s+Math.sin(a)*9*s,27*s,8*s,a,0,Math.PI*2);ctx.fill()}
    }
    for(let i=0;i<7;i++){const y=(i*105+distance*.72)%660-70;ctx.strokeStyle='#b8fbf5';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,y);ctx.quadraticCurveTo(220,y-14,430,y+3);ctx.quadraticCurveTo(690,y+18,960,y-4);ctx.stroke()}
  }
  function drawSurfer(x,y,now) {
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(now*.006)*.045);ctx.scale(1.45,1.45);
    // Hand-built pixel sprite: foamy wake, striped board, bent stance, rash guard, and red cap.
    ctx.globalAlpha=.55;ctx.fillStyle='#d9ffff';ctx.fillRect(-25,20,47,5);ctx.fillRect(-17,26,31,3);ctx.globalAlpha=1;
    ctx.fillStyle='#ad623f';ctx.fillRect(-35,12,67,9);ctx.fillRect(-38,14,72,4);
    ctx.fillStyle='#ffbf59';ctx.fillRect(-33,10,62,7);ctx.fillRect(-29,8,51,2);ctx.fillStyle='#fff1bc';ctx.fillRect(-17,11,25,2);ctx.fillStyle='#e98548';ctx.fillRect(24,11,6,4);
    // Legs and feet stay planted on the board.
    ctx.fillStyle='#3154a0';ctx.fillRect(-9,-3,17,9);ctx.fillStyle='#efad80';ctx.fillRect(-9,4,7,5);ctx.fillRect(4,4,7,5);ctx.fillRect(-13,8,10,4);ctx.fillRect(7,8,11,4);
    // Shirt and outstretched arms.
    ctx.fillStyle='#edaa7c';ctx.fillRect(-9,-20,5,8);ctx.fillRect(5,-20,5,8);ctx.fillRect(-14,-24,6,5);ctx.fillRect(8,-24,7,5);ctx.fillRect(-17,-26,5,4);ctx.fillRect(14,-26,5,4);
    ctx.fillStyle='#5676e8';ctx.fillRect(-9,-20,18,19);ctx.fillStyle='#91a4ff';ctx.fillRect(-6,-18,4,9);ctx.fillRect(2,-17,3,3);
    // Face, ear, dark hair, and cap are square-edged for a readable sprite at phone scale.
    ctx.fillStyle='#efad80';ctx.fillRect(-6,-33,12,12);ctx.fillRect(-8,-29,2,5);ctx.fillStyle='#28334a';ctx.fillRect(-3,-28,2,2);ctx.fillRect(4,-28,2,2);
    ctx.fillStyle='#8e453d';ctx.fillRect(-9,-38,17,7);ctx.fillRect(-12,-35,5,10);ctx.fillStyle='#ff7355';ctx.fillRect(-7,-40,14,4);ctx.fillRect(4,-34,8,3);
    ctx.restore();
  }
  function drawObstacle(type,x,y,now){
    const bob=Math.sin(now*.003+x)*3;ctx.save();ctx.translate(x,y+bob);
    if(type==='buoy'){ctx.fillStyle='#243647';ctx.fillRect(-3,-13,6,22);ctx.fillStyle='#f15c57';ctx.beginPath();ctx.arc(0,-10,13,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#fff1d2';ctx.fillRect(-10,-11,20,5);ctx.fillStyle='#fff';ctx.fillRect(-2,-29,4,14)}
    else if(type==='rock'||type==='reef'){ctx.fillStyle=type==='reef'?'#4d927f':'#758b91';ctx.beginPath();ctx.moveTo(-23,8);ctx.lineTo(-16,-8);ctx.lineTo(-5,-19);ctx.lineTo(9,-16);ctx.lineTo(24,2);ctx.lineTo(18,12);ctx.closePath();ctx.fill();ctx.fillStyle='#b3d1ca';ctx.fillRect(-7,-12,8,4);ctx.fillRect(7,-7,6,3)}
    else{ctx.fillStyle='#9b643d';ctx.beginPath();ctx.roundRect(-30,-9,60,18,8);ctx.fill();ctx.strokeStyle='#d49a61';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-20,-5);ctx.lineTo(21,-5);ctx.moveTo(-12,3);ctx.lineTo(27,3);ctx.stroke()}
    ctx.restore();
  }
  function drawMenu(now){drawOcean(now);const lev=levels[levelIndex];
    // Original docks, buoys and floating timber frame the menu like an arcade course.
    for(const [x,y] of [[205,217],[704,217]]){rounded(x,y,78,60,7,'#925e3c');rounded(x+5,y-8,68,49,4,'#bd8251');ctx.fillStyle='#e1ad71';for(let i=0;i<5;i++)ctx.fillRect(x+9,y+i*8,59,2)}
    [[105,158],[838,171],[120,365],[838,374]].forEach(([x,y])=>drawObstacle('buoy',x,y,now));
    ctx.textAlign='center';ctx.fillStyle='#091b22';ctx.font='900 58px ui-monospace,monospace';ctx.fillText('EDGE SURF',480,132);ctx.font='700 17px ui-monospace,monospace';ctx.fillStyle='#d9ffff';ctx.fillText('TIME TRIAL  ·  RUSH TO THE FINISH LINE',480,160);
    rounded(364,12,232,48,15,'#0b3444');ctx.fillStyle='#ff4d4f';ctx.font='900 21px system-ui';ctx.textAlign='left';ctx.fillText('♥ ♥ ♥',386,44);ctx.textAlign='center';ctx.fillStyle='#ffe071';ctx.font='900 23px ui-monospace,monospace';ctx.fillText('00:00.00',480,43);ctx.textAlign='right';ctx.fillStyle='#e9ffff';ctx.font='900 22px system-ui';ctx.fillText('ϟ ϟ ϟ',574,44);
    drawSurfer(480,237,now);
    rounded(344,304,272,59,14,'#102c36');rounded(347,301,266,56,12,'#ffd067');ctx.fillStyle='#0a1920';ctx.font='800 25px system-ui';ctx.fillText(lev.name,480,337);ctx.font='700 13px ui-monospace,monospace';ctx.fillText(`LEVEL ${levelIndex+1} / ${levels.length} · ${lev.length} M`,480,383);
    rounded(341,401,62,54,12,'#102c36');rounded(344,397,56,51,10,'#d8fbfb');ctx.fillStyle='#102c36';ctx.font='800 30px system-ui';ctx.fillText('‹',372,432);
    rounded(557,401,62,54,12,'#102c36');rounded(560,397,56,51,10,'#d8fbfb');ctx.fillText('›',588,432);
    rounded(351,474,258,62,13,'#102c36');rounded(355,469,250,59,11,'#ffc05e');ctx.fillStyle='#101820';ctx.font='900 24px system-ui';ctx.fillText('▶  START GAME',480,507);
    ctx.font='12px ui-monospace,monospace';ctx.fillStyle='#e0ffff';ctx.fillText(`BEST ${best()?`${(best()/1000).toFixed(2)}s`:'—'}`,480,173);
    ctx.textAlign='left';ctx.font='12px ui-monospace,monospace';ctx.fillStyle='#ecffff';ctx.fillText('← → / A D STEER · ↑ / W BOOST',26,32);ctx.textAlign='right';ctx.fillText('SHARE ↗   SETTINGS ⚙',930,32);
    if(settingsOpen){ctx.fillStyle='#062b37dd';ctx.fillRect(220,150,520,230);ctx.strokeStyle='#c7ffff';ctx.lineWidth=3;ctx.strokeRect(220,150,520,230);ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='900 30px system-ui';ctx.fillText('SURF SETTINGS',480,205);ctx.font='600 17px system-ui';ctx.fillText('Steer: ← → or A / D',480,248);ctx.fillText('Boost: hold ↑ / W · Touch: swipe or use controls',480,281);ctx.fillText('Press Escape or tap to close',480,328)}
  }
  function begin(){state='countdown';settingsOpen=false;syncControls();countdown=3;elapsed=0;distance=0;lives=3;boost=100;hitFlash=0;lastSpokenSecond=-1;surfer={x:480,y:425,vx:0,vy:0};paused=false;last=performance.now();sound('click');onStart(game.category);}
  function drawRace(now,dt){const lev=levels[levelIndex];elapsed+=dt;const boosting=(keys.has('arrowup')||keys.has('w')||keys.has('boost'))&&boost>0;const speed=lev.speed*(boosting?1.55:1);distance+=speed*dt;boost=clamp(boost+(boosting?-35:14)*dt,0,100);hitFlash=Math.max(0,hitFlash-dt);
    const moveX=(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0),moveY=(keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0);
    surfer.vx+=(moveX*330-surfer.vx)*Math.min(1,dt*6);surfer.x=clamp(surfer.x+surfer.vx*dt,85,875);if(!boosting){surfer.vy+=(moveY*210-surfer.vy)*Math.min(1,dt*5);surfer.y=clamp(surfer.y+surfer.vy*dt,275,455)}else surfer.vy*=.9;
    const scale=1.2;for(const [at,x,type] of lev.obstacles){const y=92+(at-distance)*scale;if(y>55&&y<520){drawObstacle(type,x,y,now);if(hitFlash<=0&&Math.abs(y-surfer.y)<48&&Math.abs(x-surfer.x)<58){lives--;hitFlash=1.1;surfer.vx+=(surfer.x<x?-1:1)*190;boost=Math.max(0,boost-18);sound('hit');if(lives<=0){endRun(false);return}}}}
    drawSurfer(surfer.x,surfer.y,now);const progress=clamp(distance/lev.length,0,1),progressEl=panel.querySelector('#surf-course-progress'),statusEl=panel.querySelector('#surf-live-status');if(progressEl)progressEl.value=Math.round(progress*100);const spokenSecond=Math.floor(elapsed);if(statusEl&&spokenSecond!==lastSpokenSecond){lastSpokenSecond=spokenSecond;statusEl.textContent=`${lev.name}, ${Math.round(progress*100)} percent complete, ${spokenSecond} seconds elapsed, ${lives} lives remaining.`}const finishY=92+(lev.length-distance)*scale;
    if(finishY>40&&finishY<530){ctx.fillStyle='#f7f4d5';ctx.fillRect(65,finishY,830,12);for(let i=0;i<20;i++){ctx.fillStyle=i%2?'#14282d':'#f8f4d8';ctx.fillRect(65+i*41.5,finishY,20.75,12)}}
    // HUD
    rounded(20,18,920,57,17,'#082c398c');ctx.textAlign='left';ctx.fillStyle='#fff';ctx.font='800 19px system-ui';ctx.fillText(`${'♥ '.repeat(lives)}${'♡ '.repeat(3-lives)}`,39,54);ctx.textAlign='center';ctx.fillStyle='#ffe071';ctx.fillText(`${Math.floor(elapsed/60).toString().padStart(2,'0')}:${(elapsed%60).toFixed(2).padStart(5,'0')}`,480,54);ctx.textAlign='right';ctx.fillStyle='#fff';ctx.fillText(`${lev.name} · ${levelIndex+1}/${levels.length}`,919,43);
    rounded(374,83,212,12,7,'#073843');rounded(374,83,212*boost/100,12,7,boosting?'#ffe071':'#9bf1ea');ctx.textAlign='left';ctx.font='11px ui-monospace,monospace';ctx.fillStyle='#edffff';ctx.fillText(boosting?'BOOST':'SPEED CHARGE',375,112);
    rounded(20,510,920,12,7,'#073843');rounded(20,510,920*progress,12,7,'#ffe071');
    rounded(850,88,90,34,9,'#092a35');ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='700 13px system-ui';ctx.fillText(paused?'RESUME':'Ⅱ PAUSE',895,110);
    if(distance>=lev.length){endRun(true);return}
  }
  function endRun(won){state=won?'finished':'crashed';if(won){const ms=Math.round(elapsed*1000);setBest(ms);cleanup();finish({score:Math.max(100,Math.round(5000-elapsed*40+(levelIndex*250))),elapsed:ms,perfect:lives===3,level:levelIndex+1,hasNextLevel:levelIndex<levels.length-1,finalTime:elapsed})}else syncControls();sound(won?'success':'fail')}
  function drawFinish(now){drawOcean(now);const won=state==='finished';drawSurfer(480,245,now);ctx.textAlign='center';ctx.fillStyle='#0b1c23';ctx.font='900 48px system-ui';ctx.fillText(won?'COURSE COMPLETE':'WIPEOUT',480,105);ctx.font='700 22px ui-monospace,monospace';ctx.fillText(won?`TIME  ${(elapsed/60|0).toString().padStart(2,'0')}:${(elapsed%60).toFixed(2).padStart(5,'0')}`:'You ran out of lives',480,147);ctx.font='700 16px ui-monospace,monospace';ctx.fillText(`BEST  ${best()?(best()/1000).toFixed(2)+'s':'—'}   ·   ${levels[levelIndex].name}`,480,181);
    rounded(345,353,270,62,13,'#102c36');rounded(350,348,260,58,11,'#ffc05e');ctx.fillStyle='#101820';ctx.font='900 23px system-ui';ctx.fillText(won?'RACE AGAIN':'TRY AGAIN',480,385);rounded(380,430,200,48,10,'#d8fbfb');ctx.font='700 15px system-ui';ctx.fillText(levelIndex<levels.length-1?'NEXT LEVEL  →':'CHOOSE LEVEL',480,460);ctx.textAlign='left';
  }
  function frame(now){if(!alive)return;raf=requestAnimationFrame(frame);const dt=Math.min(.04,Math.max(0,(now-last)/1000));last=now;if(state==='menu')drawMenu(now);else if(state==='countdown'){drawOcean(now);drawSurfer(480,320,now);countdown-=dt;if(countdown<=0){state='playing';syncControls();sound('success');last=now}else{ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='900 110px system-ui';ctx.fillText(String(Math.ceil(countdown)),480,185)}}else if(state==='playing'){if(paused){drawOcean(now);drawSurfer(surfer.x,surfer.y,now);rounded(300,205,360,112,20,'#092733e8');ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='900 42px system-ui';ctx.fillText('PAUSED',480,260);ctx.font='600 15px system-ui';ctx.fillText('Tap the canvas or PAUSE to resume',480,291)}else{drawOcean(now);drawRace(now,dt)}}else drawFinish(now)}
  function shareGame(){const url=`${location.origin}/games/edge-surf/`,copy=()=>navigator.clipboard?.writeText(url).catch(()=>{});if(navigator.share)navigator.share({title:'Edge Surf | One Second Games',text:'Race through three original ocean courses in Edge Surf.',url}).catch(error=>{if(error.name!=='AbortError')copy()});else copy()}
  function click(event){const {x,y}=toCanvas(event);if(settingsOpen){settingsOpen=false;return}if(state==='menu'){if(y<58&&x>875){settingsOpen=true;return}if(y<58&&x>785){shareGame();return}if(y>390&&y<465&&x<430){levelIndex=(levelIndex+levels.length-1)%levels.length;sound('click')}else if(y>390&&y<465&&x>530){levelIndex=(levelIndex+1)%levels.length;sound('click')}else if(y>460&&y<540)begin()}else if(state==='playing'){if(x>830&&y<140){paused=!paused;sound('click')}else if(paused)paused=false}else if(state==='finished'||state==='crashed'){if(y>330&&y<420){state='menu';begin()}else if(y>420&&levelIndex<levels.length-1){levelIndex++;state='menu'}else state='menu'}}
  const keyDown=event=>{const key=event.key.toLowerCase();if(key==='escape'&&state==='menu'&&settingsOpen){settingsOpen=false;return}if(['menu','crashed'].includes(state)&&['arrowleft','arrowright'].includes(key)){event.preventDefault();levelIndex=(levelIndex+(key==='arrowright'?1:levels.length-1))%levels.length;return}if(['menu','crashed'].includes(state)&&(key==='enter'||key===' ')){event.preventDefault();begin();return}if(['arrowleft','arrowright','arrowup','arrowdown','w','a','s','d',' '].includes(key)){event.preventDefault();keys.add(key)}if(key==='escape'&&state==='playing')paused=!paused};const keyUp=event=>keys.delete(event.key.toLowerCase());
  listen(canvas,'pointerdown',event=>{canvas.focus();if(event.pointerType!=='mouse'){swipe={x:event.clientX,y:event.clientY};canvas.setPointerCapture?.(event.pointerId);event.preventDefault();return}click(event)},{passive:false});
  listen(canvas,'pointerup',event=>{if(!swipe)return;const dx=event.clientX-swipe.x,dy=event.clientY-swipe.y;swipe=null;if(Math.max(Math.abs(dx),Math.abs(dy))>28){event.preventDefault();if(Math.abs(dx)>Math.abs(dy))keys.add(dx<0?'arrowleft':'arrowright');else if(dy<0){keys.add('boost');setTimeout(()=>keys.delete('boost'),450)}else keys.add('arrowdown');setTimeout(()=>{keys.delete('arrowleft');keys.delete('arrowright');keys.delete('arrowdown')},450)}else click(event)},{passive:false});
  listen(canvas,'pointercancel',()=>swipe=null);listen(window,'keydown',keyDown);listen(window,'keyup',keyUp);listen(window,'blur',()=>keys.clear());
  menuControls.querySelectorAll('[data-surf-menu]').forEach(button=>listen(button,'click',()=>{const action=button.dataset.surfMenu;if(action==='previous')levelIndex=(levelIndex+levels.length-1)%levels.length;else if(action==='next')levelIndex=(levelIndex+1)%levels.length;else if(action==='start')begin();else if(action==='settings')settingsOpen=!settingsOpen}));
  controls.querySelectorAll('[data-surf]').forEach(button=>{const action=button.dataset.surf,key=action==='left'?'arrowleft':action==='right'?'arrowright':'boost';listen(button,'pointerdown',e=>{e.preventDefault();keys.add(key);button.setPointerCapture?.(e.pointerId)});for(const type of ['pointerup','pointercancel','lostpointercapture','pointerleave'])listen(button,type,()=>keys.delete(key))});
  canvas.style.touchAction='none';
  function cleanup(){if(!alive)return;alive=false;cancelAnimationFrame(raf);remove.splice(0).forEach(fn=>fn());panel.classList.remove('edge-surf-panel')}
  raf=requestAnimationFrame(frame);
  return {start(){canvas.focus()},cleanup};
}
