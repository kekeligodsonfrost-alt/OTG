const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function applySpeedBonus(game, result) {
  const baseScore = Math.max(0, Math.round(Number(result.score) || 0));
  const reactionTime = Math.max(0, Number(result.reactionTime) || 0);
  const elapsed = reactionTime || Math.max(0, Number(result.elapsed) || 0);
  let benchmarkMs = 0;

  if (game.category !== 'Arcade') {
    if (Number(result.reactionTime) > 0) benchmarkMs = 1000;
    else if (Number(result.rounds) > 0) benchmarkMs = Number(result.rounds) * 4500;
    else if (Number(result.targets) > 0) benchmarkMs = Number(result.targets) * 2500;
    else if (Number(result.shots) > 0) benchmarkMs = Number(result.shots) * 3500;
    else if (result.perfect && !['dontClick','tapCounter','quickMath','stopClock','perfectOne'].includes(game.mode) && !result.taps && !result.resisted) benchmarkMs = 12000;
  }

  const speedFactor = benchmarkMs && elapsed && baseScore
    ? clamp((benchmarkMs - elapsed) / benchmarkMs * 0.5, 0, 0.5)
    : 0;
  const speedBonus = Math.round(baseScore * speedFactor);
  return { ...result, baseScore, speedBonus, score: baseScore + speedBonus };
}
