const KEY='osg-v1';
const empty=()=>({scores:{},stats:{played:0,totalMs:0,perfect:0,bestReactionTime:0},recent:[],favorites:[],settings:{theme:'system',sound:true,music:true,volume:.42},streak:{lastDay:'',days:0},daily:{}});
let memory=empty();
function read(){try{const value=JSON.parse(localStorage.getItem(KEY)||'null');return value&&typeof value==='object'?{...empty(),...value,stats:{...empty().stats,...value.stats},settings:{...empty().settings,...value.settings}}:empty()}catch{return memory}}
function write(data){memory=data;try{localStorage.setItem(KEY,JSON.stringify(data))}catch{/* Safe in-memory fallback when storage is blocked or full. */}}
export const store={
 get(){return read()},
 update(fn){const data=read();fn(data);write(data);return data},
 best(id){return Number(read().scores[id]?.best||0)},
 favorite(id){let yes=false;this.update(d=>{const i=d.favorites.indexOf(id);if(i<0){d.favorites.push(id);yes=true}else d.favorites.splice(i,1)});return yes},
 played(id){this.update(d=>{d.recent=[id,...d.recent.filter(x=>x!==id)].slice(0,12)})},
 day(){return new Date().toISOString().slice(0,10)},
 record(game,result){this.update(d=>{const old=d.scores[game.id]||{best:0,plays:0,totalScore:0};old.plays++;old.totalScore+=Number(result.score)||0;if(Number(result.score)>old.best){old.best=Number(result.score);old.bestAt=Date.now()}d.scores[game.id]=old;d.stats.played++;d.stats.totalMs+=Number(result.elapsed)||0;if(result.perfect)d.stats.perfect++;if(result.reactionTime)d.stats.bestReactionTime=d.stats.bestReactionTime?Math.min(d.stats.bestReactionTime,result.reactionTime):result.reactionTime;const day=this.day(),yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);if(d.streak.lastDay!==day){d.streak.days=d.streak.lastDay===yesterday?d.streak.days+1:1;d.streak.lastDay=day}})},
 dailyBest(key,score){this.update(d=>{d.daily[key]=Math.max(d.daily[key]||0,score)})}
};
