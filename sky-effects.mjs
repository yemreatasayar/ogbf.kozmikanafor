const frame = document.querySelector('.hero-art-frame');
const skyPhoto = document.querySelector('.hero-sky');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const sky = document.createElement('div');
sky.className = 'sky-effects';
sky.setAttribute('aria-hidden', 'true');
frame.append(sky);
// Sparse, irregular positions; only a short part of each cycle brightens.
const points = [[8,24],[22,43],[36,19],[47,51],[58,30],[69,57],[79,21],[89,42],[17,59]];
points.forEach(([x,y], index) => {
  const star = document.createElement('span');
  star.className = 'sky-twinkle';
  star.style.left = `${x}%`;
  star.style.top = `${y}%`;
  star.style.setProperty('--twinkle-duration', `${(12 + index * 1.3) / 2}s`);
  star.style.setProperty('--twinkle-delay', `${-index * 1.35}s`);
  sky.append(star);
});
let heroVisible = false;
let timer;
let meteor = null;
let meteorCount = 0;
const randomInterval = () => 120000 + Math.random() * 60000;
function scheduleMeteor() {
  clearTimeout(timer);
  if (reduced.matches || document.hidden || !heroVisible) return;
  timer = setTimeout(() => {
    if (!reduced.matches && !document.hidden && heroVisible) {
      meteor = document.createElement('span');
      meteor.className = 'sky-meteor';
      meteor.style.left = `${22 + Math.random() * 57}%`;
      meteor.style.top = `${19 + Math.random() * 25}%`;
      sky.append(meteor);
      meteor.addEventListener('animationend', () => { meteor?.remove(); meteor = null; }, { once: true });
    }
    meteorCount += 1;
    scheduleMeteor();
  }, meteorCount === 0 ? 15000 : meteorCount === 1 ? 30000 : randomInterval());
}
function syncEffects() {
  const active = heroVisible && !document.hidden && !reduced.matches;
  sky.classList.toggle('is-active', active);
  if (!active) { meteor?.remove(); meteor = null; }
  scheduleMeteor();
}
new IntersectionObserver(entries => {
  heroVisible = entries[0].isIntersecting;
  syncEffects();
}).observe(skyPhoto);
document.addEventListener('visibilitychange', syncEffects);
reduced.addEventListener('change', syncEffects);
addEventListener('pagehide', () => { clearTimeout(timer); meteor?.remove(); });
addEventListener('pageshow', syncEffects);
