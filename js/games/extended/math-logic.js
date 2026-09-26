import {rand,pick,shuffle,optionsFor,symbols} from './common.js';

function quiz(c,rounds,make,title='CHOOSE THE ANSWER'){
 let n=0,score=0;const next=()=>{if(n>=rounds)return c.finishOnce(score*Math.round(1000/rounds),{correct:score,rounds,perfect:score===rounds});n++;const q=make();c.html(`<div class="game-hud"><span>ROUND ${n} / ${rounds}</span><span>${score} RIGHT</span></div><div class="prompt-label">${title}</div><h2 style="line-height:1.3">${q.prompt}</h2><div class="answer-row">${q.options.map((x,i)=>`<button class="answer-btn" data-i="${i}">${q.format?q.format(x):x}</button>`).join('')}</div>`);c.panel.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{if(Number(b.dataset.i)===q.correct){score++;c.sound('success')}else c.sound('fail');c.later(next,100)})};next();
}
function timedMath(c,mode){
 let score=0,correct=0,streak=0;const seconds=mode==='numberRush'?20:15,end=performance.now()+seconds*1000;const operation=()=>mode==='numberRush'?pick(['+','−','×']):mode==='rapidAddition'?'+':mode==='rapidSubtraction'?'−':'×';
 const make=()=>{const op=operation(),a=op==='×'?1+rand(12):1+rand(28),b=op==='×'?1+rand(10):1+rand(24),x=op==='−'?Math.max(a,b):a,y=op==='−'?Math.min(a,b):b,answer=op==='+'?x+y:op==='−'?x-y:x*y;return [`${x} ${op} ${y} = ?`,answer]};
 c.html(`<div class="game-hud"><span id="ext-math-time">${seconds}s</span><span id="ext-math-score">0 PTS</span></div><div class="prompt-label">${mode==='numberRush'?'MIXED NUMBER RUSH':'RAPID '+(mode==='rapidAddition'?'ADDITION':mode==='rapidSubtraction'?'SUBTRACTION':'MULTIPLICATION')}</div><div class="big-prompt" id="ext-equation"></div><div class="answer-row" id="ext-answers"></div>`);
 const next=()=>{if(performance.now()>=end)return c.finishOnce(score,{correct,streak,perfect:correct>=12});const [prompt,answer]=make(),opts=optionsFor(answer);c.panel.querySelector('#ext-equation').textContent=prompt;c.panel.querySelector('#ext-answers').innerHTML=opts.map((x,i)=>`<button class="answer-btn" data-i="${i}">${x}</button>`).join('');c.panel.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{if(Number(b.dataset.i)===opts.indexOf(answer)){score+=100+Math.min(100,streak*10);correct++;streak++;c.sound('success')}else{streak=0;c.sound('fail')}c.panel.querySelector('#ext-math-score').textContent=`${score} PTS`;next()})};next();c.every(()=>{const left=Math.max(0,(end-performance.now())/1000),el=c.panel.querySelector('#ext-math-time');if(el)el.textContent=`${left.toFixed(1)}s`;if(left<=0)c.finishOnce(score,{correct,streak})},50);
}
function isPrime(n){if(n<2)return false;for(let i=2;i*i<=n;i++)if(n%i===0)return false;return true}

export function playMathLogic(mode,c){
 if(['rapidAddition','rapidSubtraction','rapidMultiplication','numberRush'].includes(mode)){timedMath(c,mode);return true}
 if(mode==='lowerNumber'){
   quiz(c,10,()=>{let a=1+rand(99),b=1+rand(99);while(a===b)b=1+rand(99);const correct=Math.min(a,b),options=shuffle([a,b]);return{prompt:'Tap the smaller number.',options,correct:options.indexOf(correct)}} , 'CHOOSE THE LOWER NUMBER');return true;
 }
 if(mode==='primeOrNot'){quiz(c,10,()=>{const n=2+rand(75),answer=isPrime(n);return{prompt:`Is ${n} a prime number?`,options:['PRIME','NOT PRIME'],correct:answer?0:1}},'PRIME OR NOT');return true}
 if(mode==='missingNumber'){quiz(c,6,()=>{const start=2+rand(12),step=1+rand(8),miss=1+rand(3),seq=Array.from({length:5},(_,i)=>i===miss?'?':start+step*i),answer=start+step*miss,options=optionsFor(answer,[ -step-1,-step,step,step+1]);return{prompt:`${seq.join(' · ')}`,options,correct:options.indexOf(answer)}},'FILL THE MISSING NUMBER');return true}
 if(mode==='closestNumber'){quiz(c,8,()=>{const target=15+rand(70),answer=target+pick([-3,-2,-1,1,2,3]),options=shuffle([answer,target-7,target+8,target+(answer<target?12:-12)]);return{prompt:`Which number is closest to ${target}?`,options,correct:options.indexOf(answer)}},'CLOSEST NUMBER');return true}
 if(mode==='patternFinish'){const palette=['🟩','🟪','🟨','🟦'];quiz(c,8,()=>{const a=pick(palette),b=pick(palette.filter(x=>x!==a)),answer=a,options=shuffle([a,b,...shuffle(palette.filter(x=>x!==a&&x!==b)).slice(0,2)]);return{prompt:`${a} ${b} ${a} ${b} ?`,options,correct:options.indexOf(answer)}},'FINISH THE PATTERN');return true}
 if(mode==='sequenceBreak'){quiz(c,7,()=>{const start=5+rand(14),step=2+rand(5),bad=rand(6),seq=Array.from({length:6},(_,i)=>start+step*i);seq[bad]+=pick([-3,-2,2,3]);return{prompt:`${seq.join(' · ')}`,options:seq.map((_,i)=>i+1),correct:bad,format:x=>`POSITION ${x}`}},'WHICH POSITION BREAKS THE RULE?');return true}
 if(mode==='shapeSequence'){const cycle=['●','▲','◆','■'];quiz(c,8,()=>{const start=rand(4),seq=Array.from({length:4},(_,i)=>cycle[(start+i)%4]),answer=cycle[(start+4)%4],options=shuffle([answer,...shuffle(cycle.filter(x=>x!==answer)).slice(0,3)]);return{prompt:`${seq.join(' · ')} · ?`,options,correct:options.indexOf(answer)}},'WHAT SHAPE COMES NEXT?');return true}
 if(mode==='directionSequence'){const dirs=['↑','→','↓','←'];quiz(c,8,()=>{const start=rand(4),step=pick([1,2,3]),seq=Array.from({length:4},(_,i)=>dirs[(start+i*step)%4]),answer=dirs[(start+4*step)%4],options=shuffle(dirs);return{prompt:`${seq.join('  ')}  ?`,options,correct:options.indexOf(answer)}},'PREDICT THE NEXT DIRECTION');return true}
 if(mode==='logicSwitch'){
   quiz(c,8,()=>{const a=rand(2),b=rand(2),open=a+b===1;return{prompt:`Switch A is ${a?'ON':'OFF'} and switch B is ${b?'ON':'OFF'}. The light needs exactly one switch ON. Does it turn on?`,options:['YES','NO'],correct:open?0:1}},'LOGIC SWITCH · EXACTLY ONE ON');return true;
 }
 if(mode==='oddRule'){
   quiz(c,7,()=>{const multiple=pick([3,4,5]),start=2+rand(4),numbers=Array.from({length:4},()=>multiple*(start+rand(5))),bad=rand(4);numbers[bad]=numbers[bad]+1;const options=shuffle(numbers.map((x,i)=>({x,i})));return{prompt:`Which number is not a multiple of ${multiple}?`,options,correct:options.findIndex(x=>x.i===bad),format:x=>x.x}},'CATCH THE EXCEPTION');return true;
 }
 if(mode==='patternRotation'){
   const cycle=['↑','→','↓','←'];quiz(c,8,()=>{const base=pick(cycle),turns=1+rand(3),answer=cycle[(cycle.indexOf(base)+turns)%4],opts=shuffle(cycle);return{prompt:`Rotate ${base} clockwise ${turns} quarter-turn${turns===1?'':'s'}.`,options:opts,correct:opts.indexOf(answer)}},'ROTATE THE SHAPE');return true;
 }
 if(mode==='tileLogic'){
   quiz(c,7,()=>{const a=1+rand(7),b=1+rand(7),step=1+rand(7),answer=b+step,options=optionsFor(answer);return{prompt:`Each row increases by the same amount.<br><strong>${a}　${a+step}<br>${b}　?</strong>`,options,correct:options.indexOf(answer)}},'TILE LOGIC');return true;
 }
 if(mode==='whichComesNext'){
   const shapes=['○','□','△','◇'];quiz(c,8,()=>{const a=pick(shapes),b=pick(shapes.filter(x=>x!==a)),answer=a,options=shuffle([a,b,...shapes.filter(x=>x!==a&&x!==b)]);return{prompt:`${a} ${b} ${a} ${b} ?`,options,correct:options.indexOf(answer)}},'WHICH COMES NEXT?');return true;
 }
 if(mode==='ruleBreaker'){
   quiz(c,8,()=>{const rule=pick(['All arrows point up.','Every shape is blue.','All symbols are circles.']),good=rule.includes('arrows')?['↑','↑','↑','↑']:rule.includes('blue')?['🔵','🔵','🔵','🔵']:['●','●','●','●'],bad=rand(4),odd=rule.includes('arrows')?'↓':rule.includes('blue')?'🔴':'▲',items=good.map((x,i)=>i===bad?odd:x),options=shuffle(items.map((x,i)=>({x,i})));return{prompt:`${rule}<br><span style="font-size:32px">${items.join('　')}</span>`,options,correct:options.findIndex(x=>x.i===bad),format:x=>x.x}},'FIND THE RULE BREAKER');return true;
 }
 return false;
}
