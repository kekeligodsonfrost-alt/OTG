import test from 'node:test';
import assert from 'node:assert/strict';
import { games, categories } from '../js/games/registry.js';
import { isExtraArcadeMode } from '../js/games/arcade-extra.js';
import { store } from '../js/lib/storage.js';
import { dailyOrder } from '../js/lib/daily.js';

test('game registry has unique, complete playable definitions', () => {
  assert.equal(games.length, 103);
  assert.equal(new Set(games.map(game => game.id)).size, games.length);
  for (const game of games) {
    assert.ok(game.id && game.title && game.description && game.instructions && game.mode);
    assert.ok(categories.includes(game.category));
  }
});

test('every catalog arcade game routes to an implemented arcade module', async () => {
  const originalModes = new Set(['snake', 'blocks', 'runner']);
  const arcadeGames = games.filter(game => game.category === 'Arcade');
  assert.equal(arcadeGames.length, 13);
  for (const game of arcadeGames) {
    assert.ok(originalModes.has(game.mode) || isExtraArcadeMode(game.mode), `${game.title} has no arcade handler`);
  }
  await import('../js/games/core.js');
});

test('daily game order is stable, unique, and contains ten games', () => {
  const first = dailyOrder('2026-09-26');
  assert.deepEqual(dailyOrder('2026-09-26'), first);
  assert.equal(first.length, 10);
  assert.equal(new Set(first).size, 10);
  assert.notDeepEqual(dailyOrder('2026-09-27'), first);
});

test('local score and favorite data survive a blocked-storage fallback', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }
  });
  try {
    const alpha = games[0], beta = games[1];
    store.record(alpha, { score: 321, elapsed: 1200, reactionTime: 240 });
    store.record(beta, { score: 42, elapsed: 800 });
    assert.equal(store.best(alpha.id), 321);
    assert.equal(store.best(beta.id), 42);
    assert.equal(store.get().scores[alpha.id].lastScore, 321);
    assert.equal(store.favorite(alpha.id), true);
    assert.equal(store.get().favorites.includes(alpha.id), true);
    assert.equal(store.get().stats.bestReactionTime, 240);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

import { isReverseDirection, swipeDirection, supportsTouchInput } from '../js/lib/touch.js';
test('touch input is capability-based and snake swipes map to cardinal directions',()=>{assert.equal(supportsTouchInput({maxTouchPoints:0,coarsePointer:false}),false);assert.equal(supportsTouchInput({maxTouchPoints:1,coarsePointer:false}),true);assert.equal(supportsTouchInput({maxTouchPoints:0,coarsePointer:true}),true);assert.deepEqual(swipeDirection(0,-50),{x:0,y:-1});assert.deepEqual(swipeDirection(0,50),{x:0,y:1});assert.deepEqual(swipeDirection(-50,0),{x:-1,y:0});assert.deepEqual(swipeDirection(50,0),{x:1,y:0});assert.equal(swipeDirection(6,4),null);assert.equal(isReverseDirection({x:1,y:0},{x:-1,y:0}),true);assert.equal(isReverseDirection({x:0,y:1},{x:0,y:-1}),true);assert.equal(isReverseDirection({x:1,y:0},{x:0,y:-1}),false)});
import { applySpeedBonus } from '../js/lib/scoring.js';
test('speed adds a visible score bonus for faster finite rounds and leaves endurance scores alone',()=>{const game={category:'Logic'};const fast=applySpeedBonus(game,{score:1000,elapsed:9000,rounds:10});const slow=applySpeedBonus(game,{score:1000,elapsed:36000,rounds:10});assert.ok(fast.score>1000);assert.ok(fast.score>slow.score);assert.equal(fast.baseScore,1000);assert.equal(fast.speedBonus,400);const reaction=applySpeedBonus(game,{score:800,elapsed:6000,reactionTime:200});assert.equal(reaction.score,1120);assert.ok(applySpeedBonus(game,{score:1000,elapsed:2000,perfect:true}).score>1000);assert.equal(applySpeedBonus({category:'Accuracy',mode:'stopClock'},{score:1000,elapsed:5000,perfect:true}).score,1000);assert.equal(applySpeedBonus({category:'Arcade'},{score:1000,elapsed:5000,rounds:10}).score,1000)});
