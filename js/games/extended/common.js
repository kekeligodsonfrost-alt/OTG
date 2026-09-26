export const rand=n=>Math.floor(Math.random()*n);
export const pick=xs=>xs[rand(xs.length)];
export const shuffle=xs=>[...xs].sort(()=>Math.random()-.5);
export const symbols=['●','◆','▲','■','✦','⬟','☾','✚'];
export function optionsFor(answer,neighbors=[-2,-1,1,2]){
  const out=new Set([answer]);
  for(const n of shuffle(neighbors))if(out.size<4)out.add(typeof answer==='number'?Math.max(0,answer+n):n);
  return shuffle([...out]);
}
export function makeChoiceRow(values,{attribute='value',format=x=>x,aria=''}={}){
  return `<div class="answer-row">${values.map((x,i)=>`<button class="answer-btn" data-choice="${i}" data-${attribute}="${String(x).replaceAll('"','&quot;')}" ${aria?`aria-label="${aria(x)}"`:''}>${format(x)}</button>`).join('')}</div>`;
}
export function bindChoice(panel,selector,callback){panel.querySelectorAll(selector).forEach(el=>el.addEventListener('click',e=>callback(e,el),{once:true}))}
export function setFinishOnClick(panel,finish){panel.addEventListener('click',finish,{once:true})}
export function targetArena(height=280){return `<div class="target-arena" style="height:${height}px"></div>`}
