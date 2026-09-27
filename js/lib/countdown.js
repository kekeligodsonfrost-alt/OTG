export function startCountdown({ panel, sound, onStart = () => {}, onGo }) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const interval = reducedMotion ? 140 : 470;
  const steps = ['3', '2', '1', 'GO!'];
  let index = 0;
  let timer = 0;
  let active = true;

  panel.classList.remove('playing');
  panel.classList.add('countdown-panel');
  panel.innerHTML = '<div class="countdown-readout" role="status" aria-live="polite"><span class="countdown-number"></span><span class="countdown-label">GET READY</span></div>';
  onStart();

  const advance = () => {
    if (!active) return;
    const value = steps[index];
    const number = panel.querySelector('.countdown-number');
    if (!number) return;
    number.textContent = value;
    number.classList.remove('countdown-pop');
    void number.offsetWidth;
    number.classList.add('countdown-pop');
    sound(value === 'GO!' ? 'go' : 'countdown');
    if (value === 'GO!') sound('round');

    if (value === 'GO!') {
      panel.classList.add('countdown-go');
      timer = setTimeout(() => {
        if (!active) return;
        panel.classList.remove('countdown-panel', 'countdown-go');
        active = false;
        onGo();
      }, reducedMotion ? 80 : 220);
      return;
    }

    index += 1;
    timer = setTimeout(advance, interval);
  };
  advance();

  return () => {
    active = false;
    clearTimeout(timer);
    panel.classList.remove('countdown-panel', 'countdown-go');
  };
}
