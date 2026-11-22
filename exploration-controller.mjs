import { explorationFacts, siteSettings } from "./content.js?v=20261120-cards";

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
const launchButton = document.querySelector('.exploration-launch');
const soundButton = overlay.querySelector('.exploration-sound');
const music = new Audio('assets/ogbf-ambient.mp3');
music.preload = 'none';
let musicTimer, musicRepeat, musicEnabled = false;
function fadeMusic(target, done) {
  clearInterval(musicTimer);
  const from = music.volume, start = performance.now(), duration = 2500;
  musicTimer = setInterval(() => {
    const t = Math.min(1, (performance.now() - start) / duration);
    music.volume = Math.max(0, Math.min(1, from + (target - from) * t));
    if (t === 1) { clearInterval(musicTimer); done?.(); }
  }, 40);
}
function stopMusic() {
  musicEnabled = false; clearTimeout(musicRepeat);
  soundButton.setAttribute('aria-pressed', 'false'); soundButton.setAttribute('aria-label', 'Müziği aç'); soundButton.querySelector('span').textContent = 'Ses aç';
  if (!music.paused) fadeMusic(0, () => { music.pause(); music.currentTime = 0; });
}
music.addEventListener('ended', () => { if (musicEnabled && state === 'active') musicRepeat = setTimeout(() => { if (musicEnabled && state === 'active') { music.currentTime = 0; music.volume = 0; music.play().then(() => fadeMusic(.65)).catch(stopMusic); } }, 2500); });
soundButton.addEventListener('click', event => {
  if (event.detail > 0) soundButton.blur();
  if (musicEnabled) { stopMusic(); return; }
  musicEnabled = true; music.volume = 0;
  music.play().then(() => { if (!musicEnabled) { music.pause(); return; } soundButton.setAttribute('aria-pressed', 'true'); soundButton.setAttribute('aria-label', 'Müziği kapat'); soundButton.querySelector('span').textContent = 'Ses kapat'; fadeMusic(.65); }).catch(stopMusic);
});
launchButton.addEventListener('click', () => {
  if (state !== 'idle') return;
  launchButton.blur();
  clearTimeout(timer); timer = 0;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const started = performance.now();
  const waitForBanner = now => {
    if (state !== 'idle') return;
    if (window.scrollY <= 1) {
      manualSession = true;
      open();
    } else if (now - started < 5000) {
      requestAnimationFrame(waitForBanner);
    } else {
      recheck();
    }
  };
  requestAnimationFrame(waitForBanner);
});
const tiltButton = overlay.querySelector('.exploration-tilt');
const touchHint = overlay.querySelector('.exploration-touch-hint');
const cardReadingMs = 12000;
const cardExitMs = 800;
const cardGapMs = 9000;
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
const timeKeys = new Set();
let fastTime = false, slowHeld = false, timeChordUsed = false;
let setCardRate = () => {};
const timeBadge = document.createElement('div');
timeBadge.setAttribute('aria-live', 'polite');
timeBadge.className = 'exploration-time-badge';
timeBadge.hidden = true;
overlay.append(timeBadge);
function applyTimeRate() {
  const rate = fastTime && !slowHeld ? 5 : 1;
  scene?.setTimeScale(rate);
  setCardRate(rate);
  timeBadge.hidden = !fastTime;
  timeBadge.textContent = slowHeld ? '1× · Space bırakılınca 5×' : '5× · Space ile normal hız';
}

const editableTarget = target => target instanceof Element && !!target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]');
let timer = 0, cardTimer = 0, generation = 0;
let state = 'idle', scene = null, wasEligible = false, tabletSession = false, manualSession = false;
let windowFocused = document.hasFocus(), pageActive = true;
let tiltOrigin, touchStart, motionAllowed = false;
let cardsRequest;
let pausedExitAnimations = [];

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
function eligible({ ignoreFocus = false } = {}) {
  if ((!desktop.matches && !isTablet()) || reduced.matches || (!ignoreFocus && (document.hidden || !windowFocused)) || !pageActive || header.classList.contains('is-menu-open') ||
      header.contains(document.activeElement) ||
      (!manualSession && desktop.matches && overlapsViewport(title.getBoundingClientRect()))) return false;
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
  pausedExitAnimations = [];
  scene?.destroy(); scene = null;
  overlay.classList.remove('is-visible', 'is-closing', 'is-revealing');
  const restoreFocus = overlay.contains(document.activeElement);
  overlay.hidden = true; card.hidden = true;
  setFlight(false); state = 'idle';
  if (restoreFocus && manualSession) launchButton.focus({ preventScroll: true });
  manualSession = false;
  document.documentElement.classList.remove('exploration-entered', 'exploration-returning', 'exploration-banner-revealing');
  wasEligible = false;
  recheck();
}
function stop(smooth = false) {
  stopMusic();
  cardsRequest?.abort();
  cardsRequest = undefined;
  ++generation;
  shortcutKeys.clear(); timeKeys.clear();
  fastTime = slowHeld = timeChordUsed = false;
  timeBadge.hidden = true; setCardRate = () => {};
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
  const canContinue = state === 'closing' ? eligible({ ignoreFocus: true }) : nowEligible;
  if (state !== 'idle' && (!canContinue || (tabletSession !== tablet))) { wasEligible = false; stop(); return; }
  if (state === 'entering' || state === 'active' || state === 'closing') positionOverlay();
  if (state === 'idle' && nowEligible !== wasEligible) {
    wasEligible = nowEligible;
    schedule();
  }
}
async function open() {
  if (state !== 'idle') return;
  clearTimeout(timer); timer = 0;
  if (!eligible()) { manualSession = false; wasEligible = false; recheck(); return; }
  const tablet = !desktop.matches;
  tabletSession = tablet;
  touchHint.hidden = !tablet;
  overlay.classList.toggle('is-tablet', tablet);
  state = 'loading';
  const token = ++generation;
  try {
    const module = await import('./exploration-scene.mjs?v=20261122-random');
    if (token !== generation || state !== 'loading') return;
    if (!eligible()) { stop(); return; }
    positionOverlay(); overlay.hidden = false;
    let pendingFactId;
    scene = module.startScene(canvas, { ambient: tablet, onPass(id) { if (id) pendingFactId = id; }, onReady() {
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
    const shownIds = new Set();
    function showCard() {
      if (cards.length === 0) {
        cards = source.filter(item => !shownIds.has(item.id));
        // A new round starts only after all cards in the current source were shown.
        if (cards.length === 0) {
          shownIds.clear();
          cards = [...source];
        }
        for (let index = cards.length - 1; index > 0; index--) {
          const next = Math.floor(Math.random() * (index + 1));
          [cards[index], cards[next]] = [cards[next], cards[index]];
        }
        if (cards.length > 1 && cards.at(-1).id === lastCard?.id) cards.unshift(cards.pop());
      }
      const contextIndex = pendingFactId ? cards.findIndex(item => item.id === pendingFactId) : -1;
      const repeatedPlanet = pendingFactId && pendingFactId !== 'uzay-kuyruklu-yildiz'
        ? source.find(item => item.id === pendingFactId) : undefined;
      lastCard = contextIndex >= 0 ? cards.splice(contextIndex, 1)[0] : (repeatedPlanet ?? cards.pop());
      pendingFactId = undefined;
      shownIds.add(lastCard.id);
      cardTitle.textContent = lastCard.title;
      cardText.textContent = lastCard.text;
    }
    if (siteSettings.explorationFactsEndpoint) {
      cardsRequest = new AbortController();
      readPublishedCards(cardsRequest.signal).then(published => {
        if (!published || token !== generation) return;
        source = published;
        cards = [];
        // Keep the current card unchanged until its normal exit; the next
        // slot draws from the refreshed source without repeating shown IDs.
      });
    }
    let cardRate = 1, cardRemaining = 0, cardStarted = 0;
    function updateCardAnimations() {
      for (const animation of card.getAnimations({ subtree: true })) animation.updatePlaybackRate(cardRate);
    }
    function scheduleCard(ms) {
      clearTimeout(cardTimer);
      cardRemaining = ms;
      cardStarted = performance.now();
      cardTimer = setTimeout(cycleCard, cardRemaining / cardRate);
    }
    setCardRate = rate => {
      if (cardTimer) {
        cardRemaining = Math.max(0, cardRemaining - (performance.now() - cardStarted) * cardRate);
        clearTimeout(cardTimer);
      }
      cardRate = rate;
      updateCardAnimations();
      if (cardTimer) scheduleCard(cardRemaining);
    };
    const cycleCard = () => {
      cardTimer = 0;
      if (token !== generation) return;
      if (state === 'entering') { scheduleCard(200); return; }
      if (state !== 'active') return;
      card.hidden = !card.hidden;
      if (!card.hidden) {
        showCard();
        requestAnimationFrame(() => { if (token === generation && !card.hidden) updateCardAnimations(); });
      }
      scheduleCard(card.hidden ? cardGapMs : cardReadingMs + cardExitMs);
    };

    requestAnimationFrame(() => {
      if (token !== generation || state !== 'entering') return;
      if (!eligible()) { stop(); return; }
      overlay.classList.add('is-visible');
      if (!tablet) document.documentElement.classList.add('exploration-entered');
      scheduleCard(2500);
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
  if (state === 'loading') { if (!manualSession) stop(); return; }
  if (state === 'idle') { recheck(); schedule(); }
}
addEventListener('pointermove', event => {
  if (state === 'active' && !tabletSession && event.pointerType === 'mouse') scene?.setPointer(event.clientX, event.clientY);
  else activity();
}, { passive: true });
addEventListener('wheel', event => {
  if (state === 'entering' || state === 'active' || state === 'closing') event.preventDefault();
}, { passive: false });
for (const type of ['pointerdown', 'wheel', 'scroll']) addEventListener(type, () => {
  if (state === 'loading') activity();
  else if (state === 'idle') activity();
  // A scroll means the visitor is returning to the page. Close immediately
  // so the moving page title cannot overlap the exploration canvas.
  else if (type === 'scroll' && (state === 'active' || state === 'entering')) {
    if (!(manualSession && state === 'entering' && window.scrollY <= 1)) stop();
  }
  else if (type === 'scroll') recheck();
}, { passive: true });
addEventListener('keydown', event => {
  if ((state === 'entering' || state === 'active' || state === 'closing') && ['PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault(); event.stopImmediatePropagation(); return;
  }
  if ((state === 'active' || state === 'entering') && event.code === 'Space' && !soundButton.contains(event.target)) {
    if (state === 'active' && fastTime && !event.repeat) { slowHeld = true; applyTimeRate(); }
    event.preventDefault(); event.stopImmediatePropagation(); return;
  }
  if (state === 'active' && !tabletSession && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && !editableTarget(event.target)) {
    if (event.code === 'KeyH' || event.code === 'KeyZ') {
      timeKeys.add(event.code);
      if (timeKeys.size === 2 && !timeChordUsed) {
        timeChordUsed = true; fastTime = !fastTime; slowHeld = false; applyTimeRate();
      }
      event.preventDefault(); event.stopImmediatePropagation(); return;
    }
    if (event.code === 'Space' && fastTime && !soundButton.contains(event.target)) {
      slowHeld = true; applyTimeRate();
      event.preventDefault(); event.stopImmediatePropagation(); return;
    }
  }
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
    event.preventDefault(); event.stopImmediatePropagation();
    if (state === 'closing') return;
    const buttons = [...overlay.querySelectorAll('button:not([disabled]):not([hidden])')].filter(button => button.getClientRects().length);
    if (!buttons.length) return;
    const current = buttons.indexOf(document.activeElement);
    const next = current < 0 ? (event.shiftKey ? buttons.length - 1 : 0) : (current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
    buttons[next].focus({ preventScroll: true });
    return;
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
  if (event.code === 'KeyH' || event.code === 'KeyZ') {
    timeKeys.delete(event.code);
    if (!timeKeys.size) timeChordUsed = false;
  }
  if (event.code === 'Space' && slowHeld) {
    slowHeld = false; applyTimeRate();
    event.preventDefault(); event.stopImmediatePropagation(); return;
  }
  shortcutKeys.delete(event.key.toLowerCase());
  if ((state === 'active' || state === 'closing') && !tabletSession && flightKeys.has(event.key)) {
    event.preventDefault(); event.stopImmediatePropagation(); scene?.keyUp(event.key, event.code);
  }
}, true);
addEventListener('resize', () => { recheck(); if (state === 'idle') schedule(); }, { passive: true });
addEventListener('focusin', recheck);
addEventListener('focusout', () => queueMicrotask(recheck));
function leaveOnFocusLoss() {
  shortcutKeys.clear();
  if (state === 'active' || state === 'entering') stop(true);
  else if (state === 'loading') stop();
  else recheck();
}

addEventListener('blur', () => {
  windowFocused = false;
  leaveOnFocusLoss();
});
addEventListener('focus', () => { windowFocused = true; recheck(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    leaveOnFocusLoss();
    if (state === 'closing') {
      pausedExitAnimations = [...header.getAnimations(), ...overlay.getAnimations()];
      for (const animation of pausedExitAnimations) animation.pause();
    }
  } else {
    windowFocused = document.hasFocus();
    scene?.resetFrameClock();
    for (const animation of pausedExitAnimations) animation.play();
    pausedExitAnimations = [];
    recheck();
  }
});
desktop.addEventListener('change', recheck);
touch.addEventListener('change', recheck);
tiltButton.addEventListener('click', enableTilt);
const mouseThrust = 'primary-mouse';
overlay.addEventListener('pointerdown', event => {
  if (state === 'active' && !tabletSession && event.pointerType === 'mouse' && event.button === 0 && !soundButton.contains(event.target)) {
    overlay.setPointerCapture(event.pointerId);
    scene?.pressThrust(mouseThrust);
    return;
  }
  if (state === 'active' && tabletSession && event.isPrimary && event.pointerType === 'touch' && event.target !== tiltButton && !soundButton.contains(event.target)) {
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
