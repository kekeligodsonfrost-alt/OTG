import {playReaction} from './reaction.js';
import {playAccuracy} from './accuracy.js';
import {playVision} from './vision.js';
import {playMemory} from './memory.js';
import {playMathLogic} from './math-logic.js';
import {playFun} from './fun.js';

const handlers=[playReaction,playAccuracy,playVision,playMemory,playMathLogic,playFun];
export function playExtended(mode,api){
  for(const handler of handlers)if(handler(mode,api))return true;
  return false;
}
