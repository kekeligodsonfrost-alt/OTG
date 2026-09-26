import {rand,pick} from './common.js';

export function playReaction(mode,c){
  const {panel,game,html,later,finishOnce,sound}=c;
  if(!['quickDraw','lightningTap','instantButton','reactionChain','waitForIt','speedSwitch','fastFinger','blinkCatcher'].includes(mode))return false;
  if(mode==='quickDraw'){
    const correct=pick(['LEFT','RIGHT']);let armed=false,at=0;
    html(`<div class="prompt-label">WAIT FOR THE DRAW</div><div class="big-prompt" id="draw-signal">READY?</div><div class="answer-row"><button class="answer-btn" data-v="LEFT">← LEFT</button><button class="answer-btn" data-v="RIGHT">RIGHT →</button></div>`);
    const arena=panel.querySelector('#draw-signal').parentElement;arena.onclick=e=>{if(e.target.closest('button')&&!armed)finishOnce(0,{falseStart:true})};
    later(()=>{if(c.dead?.())return;armed=true;at=performance.now();panel.querySelector('#draw-signal').textContent=correct==='LEFT'?'←':'→';panel.querySelectorAll('[data-v]').forEach(b=>{b.disabled=false;b.onclick=()=>{if(!armed)return;const ms=performance.now()-at,ok=b.dataset.v===correct;finishOnce(ok?Math.max(0,1000-Math.round(ms)):0,{correct:ok?1:0,reactionTime:Math.round(ms),perfect:ok&&ms<230})}})},850+rand(1800));return true;
  }
  if(mode==='lightningTap'){
    let round=0,total=0;const next=()=>{if(round>=5)return finishOnce(total*200,{correct:round,rounds:5,perfect:total===5});round++;html(`<div class="game-hud"><span>FLASH ${round} / 5</span></div><div class="prompt-label">CATCH THE LIGHT</div><div class="sequence-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));width:min(290px,100%)">${Array.from({length:9},(_,i)=>`<button class="sequence-cell" data-cell="${i}" aria-label="Cell ${i+1}"></button>`).join('')}</div>`);const hit=rand(9),cell=panel.querySelector(`[data-cell="${hit}"]`);cell.classList.add('lit');let done=false;panel.querySelectorAll('[data-cell]').forEach(b=>b.onclick=()=>{if(done)return;done=true;if(Number(b.dataset.cell)===hit){total++;sound('success')}else sound('fail');later(next,120)});later(()=>{if(!done){done=true;sound('fail');later(next,120)}},1250)};next();return true;
  }
  if(mode==='instantButton'||mode==='fastFinger'||mode==='blinkCatcher'){
    const blink=mode==='blinkCatcher',fast=mode==='fastFinger';let cueAt=0,done=false;
    html(`<div class="prompt-label">${blink?'DON’T BLINK':fast?'HIT BEFORE IT VANISHES':'WAIT FOR THE BUTTON'}</div><div class="target-arena" style="height:290px" id="instant-arena"><div class="big-prompt" id="instant-label">READY?</div></div><p class="instructions">${blink?'It will only be visible for a blink.':fast?'The target disappears after a short window.':'The button lands at a random safe spot.'}</p>`);
    const arena=panel.querySelector('#instant-arena');arena.onclick=e=>{if(e.target===arena&&!cueAt)finishOnce(0,{falseStart:true})};
    later(()=>{if(done)return;cueAt=performance.now();panel.querySelector('#instant-label')?.remove();const b=document.createElement('button');b.className='target';b.style.left=`${rand(Math.max(1,arena.clientWidth-52))}px`;b.style.top=`${rand(Math.max(1,arena.clientHeight-52))}px`;b.setAttribute('aria-label','Tap the appearing target');arena.append(b);b.onclick=e=>{e.stopPropagation();if(done)return;done=true;const ms=performance.now()-cueAt;finishOnce(Math.max(0,1000-Math.round(ms)),{reactionTime:Math.round(ms),perfect:ms<(blink?240:220)})};later(()=>{if(!done)finishOnce(0,{missed:true})},blink?460:fast?1000:1600)},700+rand(1800));return true;
  }
  if(mode==='reactionChain'){
    let n=0,correct=0;const next=()=>{if(n>=8)return finishOnce(correct*125,{correct,rounds:8,perfect:correct===8});n++;const go=Math.random()<.58;html(`<div class="game-hud"><span>CUE ${n} / 8</span><span>${correct} RIGHT</span></div><div class="prompt-label">TAP ON GREEN · WAIT ON RED</div><div class="big-prompt" style="color:${go?'var(--lime)':'var(--pink)'}">${go?'GREEN':'RED'}</div><div class="answer-row"><button class="answer-btn" data-v="tap">TAP</button><button class="answer-btn" data-v="wait">WAIT</button></div>`);panel.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{const ok=b.dataset.v===(go?'tap':'wait');if(ok){correct++;sound('success')}else sound('fail');later(next,120)})};next();return true;
  }
  if(mode==='waitForIt'){
    let armed=false,at=0;html(`<div class="prompt-label">WAIT FOR THE SIGNAL</div><div class="target-arena game-state-red" id="wait-arena" style="display:grid;place-items:center"><div class="big-prompt" id="wait-label">WAIT…</div></div><p class="instructions">An early tap ends the attempt.</p>`);const arena=panel.querySelector('#wait-arena');arena.onclick=()=>{if(!armed){finishOnce(0,{falseStart:true});return}const ms=performance.now()-at;finishOnce(Math.max(0,1000-Math.round(ms)),{reactionTime:Math.round(ms),perfect:ms<220})};later(()=>{if(!arena.isConnected)return;armed=true;at=performance.now();arena.classList.remove('game-state-red');arena.classList.add('game-state-green');panel.querySelector('#wait-label').textContent='NOW!'},1000+rand(2300));return true;
  }
  if(mode==='speedSwitch'){
    let n=0,score=0;const dirs=[['↑','UP'],['↓','DOWN'],['←','LEFT'],['→','RIGHT']];const next=()=>{if(n>=10)return finishOnce(score*100,{correct:score,rounds:10,perfect:score===10});n++;const cue=pick(dirs);html(`<div class="game-hud"><span>SWITCH ${n} / 10</span><span>${score} RIGHT</span></div><div class="prompt-label">MATCH THE LIVE SIGNAL</div><div class="big-prompt" id="switch-cue">${cue[0]}</div><div class="answer-row">${dirs.map(x=>`<button class="answer-btn" data-v="${x[1]}">${x[1]}</button>`).join('')}</div>`);panel.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{if(b.dataset.v===cue[1]){score++;sound('success')}else sound('fail');later(next,80)})};next();return true;
  }
  return false;
}
