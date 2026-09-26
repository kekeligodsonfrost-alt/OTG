import {games} from '../games/registry.js';

export function dailyOrder(day){
  let seed=Array.from(day).reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,2166136261);
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const ids=games.map(game=>game.id);
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}
  return ids.slice(0,10);
}
