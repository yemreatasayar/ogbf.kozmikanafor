import { explorationFacts, siteSettings } from "./content.js?v=20261119-cards";

// Keep the timer continuous only while an unobscured band of sky is visible.
const frame = document.querySelector('.hero-art-frame');
const sky = document.querySelector('.hero-sky');
const mountains = document.querySelector('.hero-mountains');
const title = document.querySelector('#hero-title');
const copy = document.querySelector('.hero-copy');
const header = document.querySelector('.site-header');
const overlay = document.querySelector('.exploration');
const canvas = overlay.querySelector('canvas');
const card = overlay.querySelector('.exploration-card');
const tiltButton = overlay.querySelector('.exploration-tilt');
const touchHint = overlay.querySelector('.exploration-touch-hint');
const cardReadingMs = 12000;
const cardExitMs = 1350;
card.style.setProperty('--card-reading-duration', `${cardReadingMs}ms`);
card.style.setProperty('--card-exit-duration', `${cardExitMs}ms`);
const cardTitle = card.querySelector('.exploration-card-title');
const cardText = card.querySelector('.exploration-card-text');
const touch = matchMedia('(pointer: coarse)');
const desktop = matchMedia('(min-width: 801px) and (hover: hover) and (pointer: fine)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
// Use the device's shorter screen edge so rotating a phone doesn't qualify it.
const isTablet = () => touch.matches && Math.min(screen.width, screen.height) >= 600;
const arrows = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const flightKeys = new Set([...arrows, 'Shift']);
const shortcutKeys = new Set();
const editableTarget = target => target instanceof Element && !!target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]');
let timer = 0, cardTimer = 0, generation = 0;
let state = 'idle', scene = null, wasEligible = false, tabletSession = false;
let windowFocused = document.hasFocus(), pageActive = true;
let tiltOrigin, touchStart, motionAllowed = false;
let cardsRequest;

function steerFromTilt(event) {
  if (state !== 'active' || !tabletSession || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
  const radians = Math.PI / 180;
  const angle = screen.orientation?.angle ?? window.orientation ?? 0;
  const beta = event.beta * radians, gamma = event.gamma * radians;
  const across = Math.cos(beta) * Math.sin(gamma), forward = Math.sin(beta);
  const cos = Math.cos(angle * radians), sin = Math.sin(angle * radians);
  const x = across * cos + forward * sin, y = forward * cos - across * sin;
  if (!tiltOrigin || tiltOrigin.angle !== angle) tiltOrigin = { x, y, angle };
  scene?.setTilt(x - tiltOrigin.x, y - tiltOrigin.y);
}

async function enableTilt() {
  const token = generation;
  tiltButton.disabled = true;
  try {
    motionAllowed = await window.DeviceOrientationEvent.requestPermission() === 'granted';
  } catch {
    motionAllowed = false;
  }
  if (generation === token && state === 'active') {
    tiltButton.hidden = motionAllowed;
    if (motionAllowed) addEventListener('deviceorientation', steerFromTilt);
  }
  tiltButton.disabled = false;
}

function overlapsViewport(rect) {
  return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
}
function eligible() {
  if ((!desktop.matches && !isTablet()) || reduced.matches || document.hidden || !pageActive || !windowFocused || header.classList.contains('is-menu-open') ||
      header.contains(document.activeElement) ||
      (desktop.matches && overlapsViewport(title.getBoundingClientRect()))) return false;
  const f = frame.getBoundingClientRect(), s = sky.getBoundingClientRect(), m = mountains.getBoundingClientRect();
  const ridge = m.top + m.height * .18;
  return Math.min(f.right, s.right, innerWidth) > Math.max(f.left, s.left, 0) &&
    Math.min(f.bottom, s.bottom, ridge, innerHeight) > Math.max(f.top, s.top, 0);
}
function positionOverlay() {
  const f = frame.getBoundingClientRect();
  const left = Math.max(0, f.left), top = Math.max(0, f.top);
  const right = Math.min(innerWidth, f.right), bottom = Math.min(innerHeight, f.bottom);
  Object.assign(overlay.style, { left: `${left - f.left}px`, top: `${top - f.top}px`,
    width: `${Math.max(0, right - left)}px`, height: `${Math.max(0, bottom - top)}px` });
}
function setFlight(on) {
  document.documentElement.classList.toggle('exploration-active', on);
  copy.inert = on && !tabletSession;
  header.inert = on && !tabletSession;
  document.dispatchEvent(new Event('explorationchange'));
}
function finishStop() {
  scene?.destroy(); scene = null;
  overlay.classList.remove('is-visible', 'is-closing', 'is-revealing');
  overlay.hidden = true; card.hidden = true;
  setFlight(false); state = 'idle';
  document.documentElement.classList.remove('exploration-entered', 'exploration-returning', 'exploration-banner-revealing');
  wasEligible = false;
  recheck();
}
function stop(smooth = false) {
  cardsRequest?.abort();
  cardsRequest = undefined;
  ++generation;
  shortcutKeys.clear();
  touchStart = tiltOrigin = undefined;
  removeEventListener('deviceorientation', steerFromTilt);
  clearTimeout(timer); clearTimeout(cardTimer);
  timer = cardTimer = 0;
  if (smooth && (state === 'active' || state === 'entering') && overlay.classList.contains('is-visible')) {
    state = 'closing';
    document.documentElement.classList.add('exploration-returning');
    document.documentElement.classList.remove('exploration-entered');
    overlay.classList.add('is-closing');
    scene.exit(() => {
      document.documentElement.classList.add('exploration-banner-revealing');
      overlay.classList.add('is-revealing');
    }, finishStop);
  } else finishStop();
}
function schedule() {
  clearTimeout(timer); timer = 0;
  if (state === 'idle' && wasEligible) timer = setTimeout(open, 30000);
}
function recheck() {
  const nowEligible = eligible();
  const tablet = !desktop.matches && isTablet();
  if (state !== 'idle' && (!nowEligible || (tabletSession !== tablet))) { wasEligible = false; stop(); return; }
  if (state === 'entering' || state === 'active' || state === 'closing') positionOverlay();
  if (state === 'idle' && nowEligible !== wasEligible) {
    wasEligible = nowEligible;
    schedule();
  }
}
async function open() {
  if (state !== 'idle') return;
  clearTimeout(timer); timer = 0;
  if (!eligible()) { wasEligible = false; recheck(); return; }
  const tablet = !desktop.matches;
  tabletSession = tablet;
  touchHint.hidden = !tablet;
  overlay.classList.toggle('is-tablet', tablet);
  state = 'loading';
  const token = ++generation;
  try {
    const module = await import('./exploration-scene.mjs?v=20261119-fade-exit');
    if (token !== generation || state !== 'loading') return;
    if (!eligible()) { stop(); return; }
    positionOverlay(); overlay.hidden = false;
    scene = module.startScene(canvas, { ambient: tablet, onReady() {
      if (token !== generation || state !== 'entering') return;
      state = 'active';
    } });
    if (!eligible()) { stop(); return; }
    state = 'entering'; setFlight(true);
    const orientation = window.DeviceOrientationEvent;
    const permissionNeeded = typeof orientation?.requestPermission === 'function' && !motionAllowed;
    tiltButton.hidden = !tablet || !permissionNeeded;
    if (tablet && orientation && !permissionNeeded) addEventListener('deviceorientation', steerFromTilt);
    let source = explorationFacts;
    let cards = [];
    let lastCard;
    function showCard() {
      if (cards.length === 0) {
        cards = [...source];
        for (let index = cards.length - 1; index > 0; index--) {
          const next = Math.floor(Math.random() * (index + 1));
          [cards[index], cards[next]] = [cards[next], cards[index]];
        }
        if (cards.length > 1 && cards.at(-1).id === lastCard?.id) cards.unshift(cards.pop());
      }
      lastCard = cards.pop();
      cardTitle.textContent = lastCard.title;
      cardText.textContent = lastCard.text;
    }
    if (siteSettings.explorationFactsEndpoint) {
      cardsRequest = new AbortController();
      readPublishedCards(cardsRequest.signal).then(published => {
        if (!published || token !== generation) return;
        source = published;
        cards = [];
        const current = source.find(item => item.id === lastCard?.id);
        if (!card.hidden && current) {
          cardTitle.textContent = current.title;
          cardText.textContent = current.text;
        } else if (!card.hidden) {
          showCard();
        }
      });
    }
    const cycleCard = () => {
      if (token !== generation || state !== 'active') return;
      card.hidden = !card.hidden;
      if (!card.hidden) showCard();
      cardTimer = setTimeout(cycleCard, card.hidden ? 16000 : cardReadingMs + cardExitMs);
    };

    requestAnimationFrame(() => {
      if (token !== generation || state !== 'entering') return;
      if (!eligible()) { stop(); return; }
      overlay.classList.add('is-visible');
      if (!tablet) document.documentElement.classList.add('exploration-entered');
      cardTimer = setTimeout(cycleCard, 2500);
    });
  } catch (error) {
    if (token === generation) { console.error('Keşif sahnesi yüklenemedi:', error); stop(); }
  }
}
async function readPublishedCards(signal) {
  try {
    const response = await fetch(siteSettings.explorationFactsEndpoint, { signal, cache: 'no-cache' });
    if (!response.ok) return null;
    const records = await response.json();
    if (!Array.isArray(records) || records.length === 0) return null;
    const ids = new Set();
    for (const record of records) {
      if (!record || typeof record.id !== 'string' || !record.id.trim() || ids.has(record.id) ||
          typeof record.title !== 'string' || !record.title.trim() ||
          typeof record.text !== 'string' || !record.text.trim()) return null;
      ids.add(record.id);
    }
    return records;
  } catch {
    return null;
  }
}

function activity() {
  if (state === 'loading') { stop(); return; }
  if (state === 'idle') { recheck(); schedule(); }
}
addEventListener('pointermove', event => {
  if (state === 'active' && !tabletSession && event.pointerType === 'mouse') scene?.setPointer(event.clientX, event.clientY);
  else activity();
}, { passive: true });
for (const type of ['pointerdown', 'wheel', 'scroll']) addEventListener(type, () => {
  if (state === 'loading') activity();
  else if (state === 'idle') activity();
  else if (type === 'scroll' && tabletSession) stop();
  else if (type === 'scroll') recheck();
}, { passive: true });
addEventListener('keydown', event => {
  const letter = event.key.toLowerCase();
  const unmodified = !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
  if (!unmodified || editableTarget(event.target)) shortcutKeys.clear();
  else if (letter === 'g' || letter === 'u') {
    shortcutKeys.add(letter);
    if (state === 'idle' && !event.repeat && shortcutKeys.has('g') && shortcutKeys.has('u') && desktop.matches && eligible()) {
      event.preventDefault(); event.stopImmediatePropagation();
      open(); return;
    }
    if (state === 'loading') return;
  }
  if ((state === 'entering' || state === 'active' || state === 'closing') && event.key === 'Tab') {
    stop(); return;
  }
  if (state !== 'idle' && event.key === 'Escape') {
    event.preventDefault(); event.stopImmediatePropagation();
    if (state !== 'closing') stop(true);
    return;
  }
  if (state === 'loading') { activity(); return; }
  if (state !== 'idle' && !tabletSession && flightKeys.has(event.key)) {
    event.preventDefault(); event.stopImmediatePropagation();
    if (state === 'active') scene?.keyDown(event.key, event.code);
    return;
  }
  activity();
}, true);
addEventListener('keyup', event => {
  shortcutKeys.delete(event.key.toLowerCase());
  if ((state === 'active' || state === 'closing') && !tabletSession && flightKeys.has(event.key)) {
    event.preventDefault(); event.stopImmediatePropagation(); scene?.keyUp(event.key, event.code);
  }
}, true);
addEventListener('resize', () => { recheck(); if (state === 'idle') schedule(); }, { passive: true });
addEventListener('focusin', recheck);
addEventListener('focusout', () => queueMicrotask(recheck));
addEventListener('blur', () => { shortcutKeys.clear(); windowFocused = false; if (state !== 'idle') stop(); else { wasEligible = false; schedule(); } });
addEventListener('focus', () => { windowFocused = true; recheck(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) shortcutKeys.clear(); recheck(); });
desktop.addEventListener('change', recheck);
touch.addEventListener('change', recheck);
tiltButton.addEventListener('click', enableTilt);
const mouseThrust = 'primary-mouse';
overlay.addEventListener('pointerdown', event => {
  if (state === 'active' && !tabletSession && event.pointerType === 'mouse' && event.button === 0) {
    overlay.setPointerCapture(event.pointerId);
    scene?.pressThrust(mouseThrust);
    return;
  }
  if (state === 'active' && tabletSession && event.isPrimary && event.pointerType === 'touch' && event.target !== tiltButton) {
    touchStart = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp };
  }
});
overlay.addEventListener('pointerup', event => {
  if (event.pointerType === 'mouse' && event.button === 0) scene?.releaseThrust(mouseThrust);
  if (touchStart?.id !== event.pointerId) return;
  const distance = Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y);
  const isTap = distance <= 12 && event.timeStamp - touchStart.time <= 400;
  touchStart = undefined;
  if (isTap || distance >= 24) stop(true);
});
overlay.addEventListener('pointercancel', event => {
  if (event.pointerType === 'mouse') scene?.releaseThrust(mouseThrust);
  else touchStart = undefined;
});
overlay.addEventListener('lostpointercapture', event => {
  if (event.pointerType === 'mouse') scene?.releaseThrust(mouseThrust);
});
reduced.addEventListener('change', recheck);
addEventListener('pagehide', () => { pageActive = false; wasEligible = false; stop(); });
addEventListener('pageshow', () => { pageActive = true; windowFocused = document.hasFocus(); recheck(); });
addEventListener('load', recheck, { once: true });
document.fonts.ready.then(recheck);
const intersectionObserver = new IntersectionObserver(recheck);
[frame, sky, mountains, title].forEach(element => intersectionObserver.observe(element));
const resizeObserver = new ResizeObserver(recheck);
[frame, sky, mountains, title].forEach(element => resizeObserver.observe(element));
requestAnimationFrame(() => requestAnimationFrame(recheck));
