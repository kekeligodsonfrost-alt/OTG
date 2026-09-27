export const supportsTouchInput = ({ maxTouchPoints = 0, coarsePointer = false } = {}) => maxTouchPoints > 0 || coarsePointer;
export const swipeDirection = (dx, dy, threshold = 24) => {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return null;
  return Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
};
export const isReverseDirection = (current, next) => current.x + next.x === 0 && current.y + next.y === 0;
