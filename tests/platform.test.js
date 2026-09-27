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
