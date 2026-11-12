import { galleryCards, featuredSupporters, marqueeSupporters, supporters, siteSettings, locationUrl } from "./content.js?v=20261030-mobile-7";
import { bindMarqueeDrag } from "./marquee-drag.mjs?v=20261104-review";

const gallery = document.querySelector("#gallery-grid");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
gallery.innerHTML = galleryCards.map((card) => `
  <article class="gallery-card" tabindex="0" aria-label="${card.title}">
    <img src="assets/images/${card.image}?v=20261030-mobile-7" alt="${card.alt}" loading="lazy">
    <span>${card.title}</span><i aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path class="arrow-stem" pathLength="1" d="M5 19 19 5"/><path class="arrow-head" pathLength="1" d="M10 5h9v9"/></svg></i>
  </article>
`).join("");

const makeSupporter = (supporter, clone = false) => {
  const cloneAttrs = clone ? ' tabindex="-1" aria-hidden="true"' : "";
  const logoAttr = supporter.logo ? ` data-logo="${supporter.logo}"` : "";
  if (!supporter.url) return `<span class="supporter-name" data-supporter${logoAttr}${cloneAttrs}>${supporter.name}</span>`;
  return `<a class="supporter-name supporter-link" data-supporter${logoAttr} href="${supporter.url}" target="_blank" rel="noopener noreferrer"${cloneAttrs}>${supporter.name}</a>`;
};
document.querySelector("#festival-location").href = locationUrl;
document.querySelector("#featured-supporters").innerHTML = featuredSupporters.map((supporter) => makeSupporter(supporter)).join("");
const track = document.querySelector("#supporter-track");
let marqueeLoopWidth = 0;
let marqueeDuration = 48;
let marqueeDrag;
function renderMarquee(phase = 0) {
  track.innerHTML = `<div class="marquee-set">${marqueeSupporters.map((supporter) => makeSupporter(supporter)).join("")}</div>`;
  marqueeLoopWidth = Math.max(1, track.firstElementChild.getBoundingClientRect().width);
  const copies = Math.max(5, Math.ceil(innerWidth / marqueeLoopWidth) + 4);
  const makeSet = (clone) => `<div class="marquee-set"${clone ? ' aria-hidden="true"' : ""}>${marqueeSupporters.map((supporter) => makeSupporter(supporter, clone)).join("")}</div>`;
  track.innerHTML = makeSet(true) + Array.from({ length: copies }, (_, index) => makeSet(index > 0)).join("");
  marqueeDuration = marqueeLoopWidth / 25;
  track.style.setProperty("--marquee-start", `${-marqueeLoopWidth}px`);
  track.style.setProperty("--marquee-offset", `${-2 * marqueeLoopWidth}px`);
  track.style.setProperty("--marquee-duration", `${marqueeDuration}s`);
  if (marqueeDrag) marqueeDrag.resumeAtPhase(phase);
  else {
    track.style.transform = "";
    track.style.animation = "";
    track.style.animationDelay = "";
    track.style.animationName = "";
    track.style.animationDuration = "";
    track.style.animationTimingFunction = "";
    track.style.animationIterationCount = "";
    track.style.animationPlayState = "";
  }
}
renderMarquee();
const marqueeElement = document.querySelector(".marquee");
marqueeDrag = bindMarqueeDrag({
  marquee: marqueeElement,
  track,
  getLoopWidth: () => marqueeLoopWidth,
  getDuration: () => marqueeDuration,
  getComputedTransform: () => getComputedStyle(track).transform,
  onDragStart: () => hidePreview(),
  shouldIgnorePointer: () => reduceMotion.matches,
});

const siteHeader = document.querySelector(".site-header");
function updateHeader() {
  siteHeader.classList.toggle("is-scrolled", scrollY > 24);
}
updateHeader();
addEventListener("scroll", updateHeader, { passive: true });

// A single gesture runs a reversible timeline; each layer has its own easing.
const hero = document.querySelector(".hero");
const movingClouds = [...document.querySelectorAll(".cloud")];
const logo = document.querySelector(".festival-logo");
const mountains = document.querySelector(".hero-mountains");
const artFrame = document.querySelector(".hero-art-frame");
const skyImage = document.querySelector(".hero-sky");
const telescope = document.querySelector(".hero-telescope");
// Reference positions on the 1920×1080 sky composition, in source-image pixels.
// Existing class order is Bulut 1, 3, 4, 5, 6, 7, 8, 2.
const referenceClouds = [
  [1250, 460, 210], [1530, 380, 445.9], [-15, 42, 289.765], [1260, 105, 223.125],
  [-40, 450, 239], [1530, 55, 405.3], [255, 540, 347.9], [500, 205, 193.8],
];
function layoutClouds() {
  const skyImage = document.querySelector('.hero-sky');
  // Use layout dimensions: the sky photograph has its own entrance transform.
  const width = skyImage.offsetWidth, height = skyImage.offsetHeight;
  if (!width || !height) return;
  const scale = Math.max(width / 1920, height / 1080);
  const imageLeft = skyImage.offsetLeft + (width - 1920 * scale) / 2;
  const imageTop = skyImage.offsetTop + (height - 1080 * scale) / 2;
  movingClouds.forEach((cloud, i) => {
    const [x, y, width] = referenceClouds[i];
    cloud.style.left = `${imageLeft + x * scale}px`;
    cloud.style.top = `${imageTop + y * scale}px`;
    cloud.style.width = `${width * scale}px`;
  });
}
layoutClouds();
addEventListener('resize', layoutClouds, { passive: true });
document.querySelector('.hero-sky').addEventListener('load', layoutClouds, { once: true });
let scheduled = false;
let heroProgress = Math.max(0, Math.min(1, scrollY / Math.min(560, Math.max(360, innerWidth * .39))));
let heroMotionFrame = 0;
let heroMotionTarget = heroProgress;
const easeLayer = (progress, start, end) => {
  const t = Math.max(0, Math.min(1, (progress - start) / (end - start)));
  return t * t * (3 - 2 * t);
};
// Individual translate composes with the entrance transform, so drift never
// changes the cloud layout or competes with the gesture animation.
const cloudDrifts = [
  [1, 10, 24000], [5, -8, 29000], [7, 9, 27000],
].map(([index, distance, duration]) => {
  const animation = movingClouds[index].animate(
    [{ translate: '0px 0px' }, { translate: `${distance}px 0px` }],
    { duration, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' },
  );
  animation.pause();
  animation.currentTime = 0;
  return animation;
});
let heroVisible = false;
function syncCloudDrift() {
  const shouldPlay = heroProgress === 1 && heroVisible && !document.hidden && !reduceMotion.matches;
  cloudDrifts.forEach(animation => {
    if (shouldPlay && animation.playState !== 'running') animation.play();
    else if (!shouldPlay && animation.playState === 'running') animation.pause();
    if (heroProgress === 0 || reduceMotion.matches) animation.currentTime = 0;
  });
}
new IntersectionObserver(([entry]) => {
  heroVisible = entry.isIntersecting;
  syncCloudDrift();
}).observe(artFrame);
document.addEventListener('visibilitychange', syncCloudDrift);
function animateHeroTo(target) {
  if (reduceMotion.matches || target === heroMotionTarget) return;
  cancelAnimationFrame(heroMotionFrame);
  const start = heroProgress;
  const began = performance.now();
  const duration = Math.max(200, 1000 * Math.abs(target - start));
  heroMotionTarget = target;
  function step(now) {
    const t = Math.min(1, (now - began) / duration);
    heroProgress = start + (target - start) * t;
    renderHero();
    if (t < 1) heroMotionFrame = requestAnimationFrame(step);
    else heroMotionFrame = 0;
  }
  heroMotionFrame = requestAnimationFrame(step);
}
function heroInput(direction) {
  const range = Math.min(560, Math.max(360, innerWidth * .39));
  if (direction > 0 && scrollY <= range + 24) animateHeroTo(1);
  else if (direction < 0 && scrollY <= 0) animateHeroTo(0);
}
// Rewind only after an upward scroll actually reaches the top, including Home,
// scrollbar dragging and touch momentum (which do not require another gesture).
let previousHeroScrollY = scrollY;
addEventListener("scroll", () => {
  const currentScrollY = Math.max(0, scrollY);
  if (currentScrollY === 0 && previousHeroScrollY > 0) animateHeroTo(0);
  previousHeroScrollY = currentScrollY;
}, { passive: true });
addEventListener("wheel", event => {
  if (!event.ctrlKey && Math.abs(event.deltaY) > Math.abs(event.deltaX)) heroInput(Math.sign(event.deltaY));
}, { passive: true });
let heroTouchY = null;
addEventListener("touchstart", event => { heroTouchY = event.touches.length === 1 ? event.touches[0].clientY : null; }, { passive: true });
addEventListener("touchmove", event => {
  if (heroTouchY === null || event.touches.length !== 1) return;
  const delta = heroTouchY - event.touches[0].clientY;
  if (Math.abs(delta) >= 8) { heroInput(Math.sign(delta)); heroTouchY = null; }
}, { passive: true });
addEventListener("touchend", () => { heroTouchY = null; }, { passive: true });
addEventListener("keydown", event => {
  if (event.defaultPrevented || event.target.closest("input, textarea, select, button, a, [contenteditable]:not([contenteditable=\"false\"]), [role=button]")) return;
  if (["ArrowDown", "PageDown", " "].includes(event.key)) heroInput(1);
  else if (["ArrowUp", "PageUp", "Home"].includes(event.key)) heroInput(-1);
});
function renderHero() {
  scheduled = false;
  syncCloudDrift();
  if (reduceMotion.matches) {
    skyImage.style.transform = "";
    [...movingClouds, logo, telescope].forEach((layer) => { layer.style.transform = ""; layer.style.opacity = ""; });
    return;
  }
  const progress = heroProgress;
  // Smoothstep matches the existing layer easing; finish at the original framing.
  const skyRemaining = 1 - easeLayer(progress, 0, 1);
  skyImage.style.transform = `translate3d(0, ${skyRemaining * 2}%, 0) scale(${1 + skyRemaining * .051})`;
  const cloudDirections = [1, 1, -1, -1, -1, 1, 1, -1];
  movingClouds.forEach((cloud, index) => {
    const direction = cloudDirections[index];
    const cloudProgress = easeLayer(progress, (index % 3) * .025, .88 + (index % 3) * .05);
    const depth = referenceClouds[index][2] < 250 ? .9 : 1;
    const amount = (1 - cloudProgress) * direction * innerWidth * (.46 + (index % 3) * .17) * .75 * depth;
    cloud.style.transform = `translate3d(${amount}px, 0, 0)`;
    cloud.style.opacity = String(easeLayer(progress, .02 + (index % 3) * .025, .45));
  });
  const logoProgress = easeLayer(progress, .18, 1);
  const frameRect = artFrame.getBoundingClientRect();
  const mountainRect = mountains.getBoundingClientRect();
  const finalLogoTop = frameRect.top + logo.offsetTop;
  const ridgeTop = mountainRect.top + mountainRect.height * .18;
  const logoRisePx = Math.max(0, ridgeTop + 4 - finalLogoTop);
  logo.style.transform = `translate3d(0, ${(1 - logoProgress) * logoRisePx}px, 0)`;
  logo.style.opacity = String(Math.min(1, logoProgress * 1.6));
  const scopeProgress = easeLayer(progress, .4, 1);
  telescope.style.transform = `translate3d(0, ${(1 - scopeProgress) * 26}%, 0)`;
  telescope.style.opacity = String(scopeProgress);
}
function queueHero() {
  if (!scheduled) { scheduled = true; requestAnimationFrame(renderHero); }
}
addEventListener("scroll", queueHero, { passive: true });
addEventListener("resize", queueHero, { passive: true });
renderHero();
// Logo height is not reliable until its image has loaded; recalculate the ridge mask.
document.querySelectorAll(".hero-art img").forEach(image => {
  image.addEventListener("load", queueHero, { once: true });
});
document.fonts.ready.then(queueHero);
reduceMotion.addEventListener?.("change", () => {
  if (reduceMotion.matches) { cancelAnimationFrame(heroMotionFrame); heroMotionFrame = 0; renderHero(); }
  else { heroProgress = scrollY > 24 ? 1 : 0; heroMotionTarget = heroProgress; queueHero(); }
});

// Small one-time entrance for the four section content groups.
const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-revealed");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: .12 });
document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

// A single controller owns preview visibility. Focus alone must never open an offscreen logo.
const preview = document.querySelector(".sponsor-preview");
const hoverFine = matchMedia("(hover: hover) and (pointer: fine)");
const supportersSection = document.querySelector(".supporters");
let hoveredSponsor = null;
let supporterPointer = null;
let supporterHoverFrame = 0;
let keyboardPreview = false;
function hidePreview() {
  hoveredSponsor = null;
  preview.classList.remove("is-visible");
}
function stopMovingSponsorHover() {
  supporterPointer = null;
  cancelAnimationFrame(supporterHoverFrame);
  supporterHoverFrame = 0;
  hidePreview();
}
function positionPreview(x) {
  const w = preview.offsetWidth, h = preview.offsetHeight, edge = 16;
  const bounds = supportersSection.getBoundingClientRect();
  const clampCenter = (v, size, limit) => Math.max(size / 2 + edge, Math.min(v, limit - size / 2 - edge));
  preview.style.left = `${clampCenter(x, w, innerWidth)}px`;
  preview.style.top = `${clampCenter(bounds.top + bounds.height / 2, h, innerHeight)}px`;
}
function refreshMovingSponsor() {
  supporterHoverFrame = 0;
  if (!hoverFine.matches || document.hidden || !document.hasFocus()) { stopMovingSponsorHover(); return; }
  const bounds = supportersSection.getBoundingClientRect();
  let item = null;
  let x = 0;
  if (supporterPointer) {
    const point = supporterPointer;
    if (point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom) {
      item = document.elementFromPoint(point.x, point.y)?.closest("[data-supporter]");
      x = point.x;
    }
  } else if (keyboardPreview && document.activeElement?.matches('[data-supporter]:focus-visible')) {
    item = document.activeElement;
    const rect = item.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    if (rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) item = null;
  }
  if (!item || !supportersSection.contains(item) || !item.dataset.logo || marqueeElement.classList.contains("is-dragging")) {
    hidePreview();
  } else {
    if (hoveredSponsor !== item) {
      hoveredSponsor = item;
      const image = preview.querySelector("img");
      image.src = `assets/supporters/${item.dataset.logo}`;
      image.alt = item.textContent.trim();
      image.classList.toggle("is-unclipped", item.dataset.logo === "uzay-caginda-yolculuk.png");
      image.classList.toggle("is-hypatia", item.dataset.logo === "hypatia.png");
      image.classList.toggle("is-wide", ["dijital-x.png", "bilim-ne-guzel-lan.png"].includes(item.dataset.logo));
    }
    positionPreview(x);
    preview.classList.add("is-visible");
  }
  if (supporterPointer || (keyboardPreview && item)) supporterHoverFrame = requestAnimationFrame(refreshMovingSponsor);
}
addEventListener("pointermove", event => {
  if (event.pointerType !== "mouse") return;
  keyboardPreview = false;
  const bounds = supportersSection.getBoundingClientRect();
  if (event.clientY < bounds.top || event.clientY > bounds.bottom || event.clientX < bounds.left || event.clientX > bounds.right) { stopMovingSponsorHover(); return; }
  supporterPointer = { x: event.clientX, y: event.clientY };
  if (!supporterHoverFrame) refreshMovingSponsor();
}, { passive: true });
addEventListener("keydown", event => { if (event.key === "Tab") keyboardPreview = true; });
supportersSection.addEventListener("focusin", () => { if (keyboardPreview && !supporterHoverFrame) refreshMovingSponsor(); });
supportersSection.addEventListener("focusout", stopMovingSponsorHover);
supportersSection.addEventListener("pointerleave", stopMovingSponsorHover);
for (const type of ["scroll", "blur", "pagehide"]) addEventListener(type, stopMovingSponsorHover, { passive: true });
document.addEventListener("visibilitychange", stopMovingSponsorHover);
marqueeElement.addEventListener("wheel", stopMovingSponsorHover, { passive: true });
hoverFine.addEventListener("change", stopMovingSponsorHover);
function refreshMarqueeMetrics() {
  const phase = marqueeDrag.getPhase();
  marqueeDrag.cancel();
  stopMovingSponsorHover();
  renderMarquee(phase);
}
let marqueeResizeFrame = 0;
addEventListener("resize", () => {
  cancelAnimationFrame(marqueeResizeFrame);
  marqueeResizeFrame = requestAnimationFrame(refreshMarqueeMetrics);
}, { passive: true });
document.fonts.ready.then(refreshMarqueeMetrics);
reduceMotion.addEventListener("change", refreshMarqueeMetrics);

// A tap-accessible alternative keeps supporter destinations as ordinary links.
const logoDisclosure = document.createElement("div");
logoDisclosure.className = "supporter-logo-disclosure";
logoDisclosure.innerHTML = `<button class="supporter-logo-toggle" type="button" aria-expanded="false" aria-controls="supporter-logo-grid">Destekçi logolarını göster</button><div class="supporter-logo-grid" id="supporter-logo-grid" hidden>${supporters.map(supporter => {
  const logo = `<img src="assets/supporters/${supporter.logo}" alt="" loading="lazy" decoding="async"><span>${supporter.name}</span>`;
  return supporter.url ? `<a class="supporter-logo-card" href="${supporter.url}" target="_blank" rel="noopener noreferrer">${logo}</a>` : `<div class="supporter-logo-card">${logo}</div>`;
}).join("")}</div>`;
supportersSection.append(logoDisclosure);
const logoToggle = logoDisclosure.querySelector("button");
logoToggle.addEventListener("click", () => {
  const expanded = logoToggle.getAttribute("aria-expanded") !== "true";
  logoToggle.setAttribute("aria-expanded", String(expanded));
  logoToggle.textContent = expanded ? "Destekçi logolarını gizle" : "Destekçi logolarını göster";
  logoDisclosure.querySelector(".supporter-logo-grid").hidden = !expanded;
});

// Newsletter integration boundary: configure a Turnstile site key and a server endpoint in siteSettings.
const newsletterForm = document.querySelector(".newsletter-form");
const newsletterEmail = document.querySelector("#email");
const newsletterStatus = document.querySelector("#newsletter-status");
const captchaSlot = document.querySelector("#captcha-slot");
let captchaToken = "";
let captchaWidget;
if (siteSettings.turnstileSiteKey) {
  captchaSlot.replaceChildren();
  const turnstileScript = document.createElement("script");
  turnstileScript.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  turnstileScript.async = true;
  turnstileScript.onload = () => {
    captchaWidget = window.turnstile.render(captchaSlot, {
      sitekey: siteSettings.turnstileSiteKey,
      callback: (token) => { captchaToken = token; },
      "expired-callback": () => { captchaToken = ""; },
      "error-callback": () => { captchaToken = ""; },
    });
  };
  document.head.append(turnstileScript);
} else {
  captchaSlot.title = "Turnstile site anahtarı yapılandırılınca doğrulama burada açılır.";
}
newsletterEmail.addEventListener("invalid", () => { newsletterEmail.setAttribute("aria-invalid", "true"); newsletterStatus.textContent = "Geçerli bir e-posta adresi gir."; });
newsletterEmail.addEventListener("input", () => { newsletterEmail.removeAttribute("aria-invalid"); newsletterStatus.textContent = ""; });
newsletterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!newsletterForm.reportValidity()) return;
  if (!siteSettings.newsletterEndpoint || !siteSettings.turnstileSiteKey) {
    newsletterStatus.textContent = "Abonelik gönderimi için CAPTCHA ve e-posta servisi henüz bağlanmadı.";
    return;
  }
  if (!captchaToken) {
    newsletterStatus.textContent = "Lütfen güvenlik doğrulamasını tamamla.";
    return;
  }
  const submitButton = newsletterForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  newsletterStatus.textContent = "İşleniyor…";
  try {
    const response = await fetch(siteSettings.newsletterEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newsletterEmail.value.trim(), captchaToken }),
    });
    if (!response.ok) throw new Error("Subscription request failed");
    newsletterEmail.disabled = true;
    submitButton.remove();
    captchaSlot.hidden = true;
    newsletterStatus.textContent = "Onay e-postası gönderildi. Aboneliğini tamamlamak için gelen kutunu kontrol et.";
  } catch {
    submitButton.disabled = false;
    newsletterStatus.textContent = "Gönderim başarısız oldu. Lütfen biraz sonra tekrar dene.";
    if (captchaWidget !== undefined) window.turnstile.reset(captchaWidget);
    captchaToken = "";
  }
});

const filmCover = document.querySelector(".film-cover");
filmCover.addEventListener("click", () => {
  const player = document.createElement("iframe");
  player.className = "film-player";
  player.src = "https://www.youtube.com/embed/f6qqELyHIiY?si=mAYtb5er1Wibd8e_&autoplay=1";
  player.title = "Olimpos Gökyüzü ve Bilim Festivali — YouTube video";
  player.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  player.referrerPolicy = "strict-origin-when-cross-origin";
  player.allowFullscreen = true;
  filmCover.replaceWith(player);
  player.focus();
}, { once: true });

const menuToggle = document.querySelector(".menu-toggle");
function closeMobileMenu() {
  siteHeader.classList.remove("is-menu-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Menüyü aç");
}
menuToggle.addEventListener("click", () => {
  const open = siteHeader.classList.toggle("is-menu-open");
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Menüyü kapat" : "Menüyü aç");
});
document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", closeMobileMenu));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && siteHeader.classList.contains("is-menu-open")) {
    closeMobileMenu();
    menuToggle.focus();
  }
});
document.addEventListener("pointerdown", event => {
  if (!siteHeader.contains(event.target)) closeMobileMenu();
});
matchMedia("(max-width: 800px)").addEventListener("change", closeMobileMenu);


// Only the hero/gallery boundary compensates for the visible tail of the sticky scene.
function updateHeroGalleryBoundary() {
  const stage = document.querySelector(".hero-stage");
  const copy = document.querySelector(".hero-copy");
  const tail = Math.max(0, stage.offsetHeight - copy.offsetTop - copy.offsetHeight);
  document.querySelector(".gallery").style.setProperty("--hero-visible-tail", `${tail}px`);
}
document.fonts.ready.then(updateHeroGalleryBoundary);
addEventListener("resize", updateHeroGalleryBoundary, { passive: true });
addEventListener("load", updateHeroGalleryBoundary, { once: true });

import "./sky-effects.mjs?v=20261111-timing";
