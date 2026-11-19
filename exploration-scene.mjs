import { drawShip } from './exploration-ship.mjs?v=20261119-transition';

import { makePixelSky, makePixelPlanet, makePassingCloud, makePixelAsteroid } from './exploration-pixel-art.mjs?v=20261119-orbit';

const boostLimit = 2;
const boostImpulse = .22;
const steeringKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
const warmCloud = { type: 'cloud', duration: 19, side: 1, warm: true, seed: 411 };
const leftCloud = { type: 'cloud', duration: 20, side: -1, warm: false, seed: 922 };
const rightCloud = { type: 'cloud', duration: 20, side: 1, warm: false, seed: 673 };
const asteroid = { type: 'asteroid', duration: 8.7 };
const openingPasses = [
  { type: 'satellite', gap: 10, duration: 29 / 1.2 },
  { ...warmCloud, gap: 3 },
  { type: 'planet', gap: 3, duration: 42, variant: 'rocky' },
  { ...asteroid, gap: 3, rock: 0 },
  { ...leftCloud, gap: 3 },
  { type: 'planet', gap: 3, duration: 42, variant: 'ringed' },
  { ...asteroid, gap: 3, rock: 1 },
  { type: 'planet', gap: 3, duration: 42, variant: 'banded' },
  { ...rightCloud, gap: 3 },
  { ...asteroid, gap: 3, rock: 2 }
];
const laterPasses = [
  { ...leftCloud, gap: 39 },
  { ...asteroid, gap: 56, rock: 0 },
  { ...asteroid, gap: 48, rock: 1 },
  { ...rightCloud, gap: 42 },
  { ...warmCloud, gap: 54 },
  { ...asteroid, gap: 45, rock: 2 }
];

export function startScene(canvas, { ambient = false, onReady = () => {} } = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  const bannerSky = document.querySelector('.hero-sky');
  let sky;
  canvas.style.imageRendering = 'auto';
  let width = 1, height = 1, paddingX = 0, paddingY = 0, frame = 0, previous = 0, elapsed = 0;
  let alive = true, horizontalOffset = 0, mode = 'pointer';
  let introStarted, ready = false, exitTime = 0, onExit, onReveal, revealed = false;
  let shipArrival = 0, exitView;
  const introDuration = 1.85, exitDuration = 2.5, revealDuration = .95;
  let bank = 0, pitch = 0, boost = 0, targetBank = 0, targetPitch = 0;
  const pose = { bank: 0, pitch: 0, boost: 0, cameraBoost: 0, rcsX: 0, rcsY: 0,
    cloudLight: 0, warmCloud: false, viewX: 0, viewY: 0, rcsTrail: [], nextPuff: 0 };
  let commandBank = 0, commandPitch = 0;
  const keys = new Set(), thrustInputs = new Set();
  let boostsUsed = 0, flashUntil = 0;
  let velocityX = 0, velocityY = 0, velocityZ = 1;
  let speed = 1, lateralTravelX = 0, lateralTravelY = 0;
  let nextPassIndex = 0, nextPassTime = openingPasses[0].gap;
  let pass, progress = 0, passX = 0, passY = 0, distance = 1;
  let headingX = 0, headingY = 0, viewX = 0, viewY = 0;
  const planetSprites = new Map();
  const cloudSprites = new Map();
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  let geometryKey = '';
  let dustSeed = 731291;
  const dustRandom = () => ((dustSeed = (Math.imul(dustSeed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const dust = Array.from({ length: ambient ? 18 : 30 }, () => ({
    x: (dustRandom() - .5) * 3, y: (dustRandom() - .5) * 2,
    z: .2 + dustRandom() * 5, shade: dustRandom()
  }));
  let satellite, satelliteEntryX;
  const asteroidSprites = [];
  let asteroidSide = -1, asteroidViewX = 0, asteroidViewY = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const sourceReady = bannerSky?.complete && bannerSky.naturalWidth > 0;
    const key = [rect.width, rect.height, devicePixelRatio, sourceReady].join(':');
    if (key === geometryKey) return;
    geometryKey = key;
    // Keep the ship and text crisp without making the sky texture full size.
    const pixelBudget = ambient ? 360000 : 2000000;
    const density = Math.min(devicePixelRatio || 1, ambient ? 1 : 1.25, Math.sqrt(pixelBudget / (rect.width * rect.height)));
    width = Math.max(1, Math.round(rect.width * density));
    height = Math.max(1, Math.round(rect.height * density));
    // Each margin includes full steering travel plus camera roll at the corners.
    paddingX = Math.ceil(width * .40 + height * .035);
    paddingY = Math.ceil(height * .39 + width * .035);
    canvas.width = width; canvas.height = height;
    let photograph;
    if (sourceReady) {
      const photo = bannerSky.getBoundingClientRect();
      const sx = width / rect.width, sy = height / rect.height;
      photograph = { source: bannerSky, x: (photo.left - rect.left) * sx, y: (photo.top - rect.top) * sy,
        boxWidth: photo.width * sx, boxHeight: photo.height * sy };
    }
    sky = makePixelSky({ width, height, paddingX, paddingY, photograph });
    ctx.imageSmoothingEnabled = true;
    horizontalOffset = bank * width * .035;
  }
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  if (observer) observer.observe(canvas);
  else window.addEventListener('resize', resize);
  bannerSky?.addEventListener('load', resize);
  resize();

  function getNextPass() {
    return openingPasses[nextPassIndex] ?? laterPasses[(nextPassIndex - openingPasses.length) % laterPasses.length];
  }

  function updatePass(dt) {
    if (pass) {
      const pace = pass.type === 'planet' || pass.type === 'cloud' ? speed : 1;
      progress += dt * pace / pass.duration;
      if (progress >= 1) {
        pass = undefined;
        nextPassTime = elapsed + getNextPass().gap;
      }
    }
    if (pass || elapsed < nextPassTime) return;
    pass = getNextPass();
    nextPassIndex++;
    progress = 0;
    passX = lateralTravelX;
    passY = lateralTravelY;
    distance = 1;
    if (pass.type === 'asteroid') {
      asteroidSide *= -1;
      asteroidViewX = viewX / width;
      asteroidViewY = viewY / height;
    }
  }

  function drawPlanet(dt) {
    const { variant, duration } = pass;
    const ringed = variant === 'ringed';
    const startX = ringed ? .12 : .065;
    const sweep = ringed ? .50 : .55;
    // Reserve enough space for the planet to clear the rolled, zoomed view.
    const exitSweep = 1.21 + height / width * .03 - startX - sweep;
    const path = .23 * progress + .77 * progress ** 2;
    const drift = .27 / duration;
    const x = width * (startX + sweep * path + exitSweep * progress ** 5 - (lateralTravelX - passX) * drift);
    const y = height * (ringed
      ? -.26 + .085 * Math.sin(Math.PI * progress) + .035 * progress
      : -.18 + .13 * path) + height * (lateralTravelY - passY) * drift;
    const aimed = 1 - clamp(Math.hypot(x / width - velocityX / velocityZ, y / height + velocityY / velocityZ) / .34, 0, 1);
    distance = Math.max(.23, distance - dt * speed * (21 / duration) * (.023 + aimed * .014));
    const farDepth = ringed ? 58 : 22;
    const nearScale = ringed ? .00112 : .0019;
    const depth = 1 + farDepth * (1 - progress) ** 3;
    const approach = 1 + .3 * (1 - distance);
    const scale = Math.min(width, height) * nearScale * approach / depth;
    if (!planetSprites.has(variant)) planetSprites.set(variant, makePixelPlanet(variant));
    const planet = planetSprites.get(variant);
    const span = planet.width * scale;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.drawImage(planet, -span / 2, -span / 2, span, span);
    ctx.restore();
  }
  function drawDust(dt, opacity) {
    const focal = Math.min(width, height) * .74;
    ctx.fillStyle = '#a9b7eb';
    for (const mote of dust) {
      mote.z -= velocityZ * dt * .57;
      if (mote.z <= .16) {
        mote.x = (dustRandom() - .5) * 3;
        mote.y = (dustRandom() - .5) * 2;
        mote.z = 5.2;
      }
      mote.x -= velocityX * dt * .57;
      mote.y += velocityY * dt * .57;
      const x = mote.x * focal / mote.z, y = mote.y * focal / mote.z;
      const near = 1 - clamp(mote.z / 4, 0, 1);
      const fade = clamp((mote.z - .16) / .4, 0, 1);
      ctx.globalAlpha = opacity * near * fade * (.18 + mote.shade * .42);
      const size = near > .8 && mote.shade > .45 ? 2 : 1;
      ctx.fillRect(Math.round(x), Math.round(y), size, size);
    }
    ctx.globalAlpha = 1;
  }

  function drawSatellite() {
    if (!satellite) {
      satellite = document.createElement('canvas');
      satellite.width = 24; satellite.height = 11;
      const art = satellite.getContext('2d');
      art.fillStyle = '#222740'; art.fillRect(0, 3, 24, 5);
      art.fillStyle = '#101328'; art.fillRect(1, 4, 22, 4);
      art.fillStyle = '#343f5f';
      for (const x of [2, 5, 17, 20]) art.fillRect(x, 4, 1, 3);
      art.fillStyle = '#58687f'; art.fillRect(9, 2, 6, 6);
      art.fillStyle = '#30384d'; art.fillRect(9, 3, 6, 5);
      art.fillStyle = '#85838a'; art.fillRect(12, 0, 1, 3);
      art.fillStyle = '#505a79'; art.fillRect(11, 8, 2, 2);
    }
    // Anchor the entry just beyond the visible left edge, including at cruise zoom.
    const zoom = 1 - pose.cameraBoost * .055;
    satelliteEntryX ??= (viewX / width - .5) / zoom - .026;
    const exitX = 1.06 + height / width * .03;
    const x = width * (satelliteEntryX + progress * (exitX - satelliteEntryX));
    const y = height * (-.20 + .14 * progress - .04 * Math.sin(progress * Math.PI));
    const approach = Math.min(1, progress / .60);
    const size = Math.min(width, height) * .055 * (1 + .70 * approach ** 1.25);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(.20 + progress * .31);
    ctx.drawImage(satellite, -size / 2, -size * .23, size, size * .46);
    const glint = Math.max(0, 1 - Math.abs(progress - .60) / .11);
    ctx.globalAlpha *= glint * .60;
    ctx.fillStyle = '#a8a4bf';
    ctx.fillRect(-size * .10, -size * .13, size * .17, 1);
    ctx.restore();
  }

  function drawAsteroid() {
    const { rock } = pass;
    const side = asteroidSide;
    const far = (1 - progress) ** 2;
    // As it closes in, send it past the outside of the wing envelope.
    // The distant portion follows the view so the rock appears ahead on entry.
    const x = width * (.5 + side * (.015 + .95 * progress ** 4.1) + (asteroidViewX - viewX / width) * far);
    const rise = .28 * progress ** 1.5 - .78 * progress ** 5.5;
    const y = height * (.34 + rise + (viewY / height - asteroidViewY) * far);
    const depth = 1 + 31 * (1 - progress) ** 3;
    const diameter = Math.min(width, height) * .16 / depth;
    const sprite = asteroidSprites[rock] ??= makePixelAsteroid(226 + 51 * rock);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(.4 + side * progress * 1.85);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, -diameter / 2, -diameter / 2, diameter, diameter);
    ctx.restore();
  }

  function drawPassingCloud(foreground, opacity) {
    // The softer front layer arrives after the distant sheet. Its scale and
    // lateral travel increase together as the ship cuts across the cloud bank.
    const t = foreground ? (progress - .24) / .76 : progress;
    if (t <= 0 || t >= 1) return;
    const key = pass.seed + Number(foreground);
    if (!cloudSprites.has(key)) {
      cloudSprites.set(key, makePassingCloud(pass.seed + (foreground ? 173 : 0), pass.warm, foreground));
    }
    const sprite = cloudSprites.get(key);
    const fadeIn = Math.min(1, t / (foreground ? .32 : .42));
    const fadeOut = Math.min(1, (1 - t) / (foreground ? .34 : .26));
    const visibility = fadeIn * fadeOut;
    const spread = t ** (foreground ? 1.35 : 1.85);
    const size = 2 * Math.max(width, height) * ((foreground ? .25 : .105) + spread * (foreground ? 2.28 : 1.81));
    const cloudHeight = size * sprite.height / sprite.width;
    const drift = .27 / pass.duration;
    const x = width * (.5 + pass.side * (.12 - spread * .50) - (lateralTravelX - passX) * drift) - viewX * (1 - spread) * .33;
    const y = height * (.36 + spread * .70 + .48 * spread ** 4 + (lateralTravelY - passY) * drift) + viewY * (1 - spread) * .33;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-pass.side * .19 - bank * .035);
    ctx.globalAlpha = opacity * visibility * (foreground ? .73 : .92);
    // Soften the enlarged gas layer without filtering the sky or the ship.
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(sprite, -size / 2, -cloudHeight / 2, size, cloudHeight);
    ctx.restore();
  }

  function pressThrust(source) {
    const alreadyFiring = thrustInputs.size > 0;
    thrustInputs.add(source);
    if (alreadyFiring) return;
    flashUntil = elapsed + .20;
    if (boostsUsed >= boostLimit) return;
    boostsUsed++;
    // Impulse along the nose direction. Steering alone changes attitude,
    // and the velocity vector is carried unmodified between impulses.
    const yaw = headingX * 1.7, elevation = headingY * 1.7;
    velocityX += boostImpulse * Math.sin(yaw) * Math.cos(elevation);
    velocityY += boostImpulse * Math.sin(elevation);
    velocityZ += boostImpulse * Math.cos(yaw) * Math.cos(elevation);
    speed = Math.hypot(velocityX, velocityY, velocityZ);
  }

  function render(now) {
    if (!alive) return;
    if (onExit && document.hidden) {
      previous = 0;
      frame = requestAnimationFrame(render);
      return;
    }
    if (!sky) { frame = requestAnimationFrame(render); return; }
    if (ambient && previous && now - previous < 30) {
      frame = requestAnimationFrame(render);
      return;
    }
    const dt = previous ? Math.min((now - previous) / 1000, .05) : 0;
    previous = now;
    introStarted ??= now;
    const entering = !ready && !onExit;
    const intro = Math.min(1, (now - introStarted) / (introDuration * 1000));
    const leaving = Boolean(onExit);
    // Hidden tabs may suspend RAF. Only advance the departure while visible
    // so the first frame after returning is still part of the transition.
    if (leaving) exitTime += dt;
    const outro = Math.min(1, exitTime / exitDuration);
    const fade = Math.min(1, outro / .63);
    const objectsOpacity = 1 - fade * fade * (3 - 2 * fade);
    if (!entering && !leaving) elapsed += dt;
    if (entering && intro === 1) { ready = true; onReady(); }
    const settle = outro * outro * (3 - 2 * outro);
    lateralTravelX += dt * velocityX;
    lateralTravelY += dt * velocityY;
    if (mode === 'keys') {
      targetBank = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'));
      targetPitch = Number(keys.has('ArrowUp')) - Number(keys.has('ArrowDown'));
    }
    const rcsDecay = Math.exp(-4.8 * dt);
    pose.rcsX *= rcsDecay;
    pose.rcsY *= rcsDecay;
    if (Math.abs(targetBank - commandBank) > .18 || (targetBank === 0 && commandBank !== 0)) {
      pose.rcsX = clamp((targetBank - commandBank) * 1.6, -1, 1);
      commandBank = targetBank;
    }
    if (Math.abs(targetPitch - commandPitch) > .18 || (targetPitch === 0 && commandPitch !== 0)) {
      pose.rcsY = clamp((targetPitch - commandPitch) * 1.6, -1, 1);
      commandPitch = targetPitch;
    }
    const response = 1 - Math.exp(-3 * dt);
    bank += (targetBank - bank) * response;
    pitch += (targetPitch - pitch) * response;
    // The motor animation has its own clock. Releasing Shift or using a
    // visual-only burst cannot alter the stored velocity.
    const firing = thrustInputs.size > 0 || elapsed < flashUntil;
    const motorResponse = 1 - Math.exp(-3.2 * dt);
    boost += (Number(firing) - boost) * motorResponse;
    const speedFraction = clamp((speed - 1) / (boostLimit * boostImpulse), 0, 1);
    const cruiseZoom = Math.sqrt(speedFraction);
    pose.cameraBoost += (cruiseZoom - pose.cameraBoost) * motorResponse;
    horizontalOffset = bank * width * .035;
    pose.bank = bank; pose.pitch = pitch; pose.boost = boost;
    // Input changes heading over time. Release leaves the camera looking in
    // the new direction, while the ship settles out of its banking pose.
    headingX = clamp(headingX + bank * dt * .15, -.29, .29);
    headingY = clamp(headingY + pitch * dt * .15, -.28, .28);
    viewX += ((headingX + bank * .018) * width - viewX) * response;
    viewY += ((headingY + pitch * .018) * height - viewY) * response;
    if (leaving) {
      viewX = exitView.x * (1 - settle);
      viewY = exitView.y * (1 - settle);
      bank = exitView.bank * (1 - settle);
      pitch = exitView.pitch * (1 - settle);
      pose.bank = bank; pose.pitch = pitch;
      horizontalOffset = bank * width * .035;
      pose.cameraBoost = exitView.zoom * (1 - settle);
      if (pass) {
        const pace = pass.type === 'planet' || pass.type === 'cloud' ? speed : 1;
        progress += dt * pace / pass.duration;
        if (progress >= 1) pass = undefined;
      }
    } else if (!entering) {
      updatePass(dt);
    }
    const zoom = 1 - pose.cameraBoost * .055;
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2 - viewX, height / 2 + viewY);
    ctx.rotate(-bank * .03);
    ctx.scale(zoom, zoom);
    const skyWidth = width + paddingX * 2, skyHeight = height + paddingY * 2;
    const skyX = -skyWidth / 2, skyY = -skyHeight / 2;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sky.image, skyX, skyY, skyWidth, skyHeight);
    const starUnit = skyWidth / sky.image.width;
    for (const star of sky.stars) {
      const time = (elapsed + star.phase) % star.period;
      const envelope = clamp(Math.min(time / star.rise, (star.rise + star.fall - time) / star.fall), 0, 1);
      const pulse = star.peak * envelope * envelope * (3 - 2 * envelope);
      const x = skyX + star.x * skyWidth, y = skyY + star.y * skyHeight;
      ctx.globalAlpha = objectsOpacity * pulse * .54;
      ctx.fillStyle = '#9ba9f3';
      ctx.fillRect(x - starUnit * 1.5, y - starUnit * .32, starUnit * 3, starUnit * .64);
      ctx.fillRect(x - starUnit * .32, y - starUnit * 1.5, starUnit * .64, starUnit * 3);
      ctx.globalAlpha = objectsOpacity * (.15 + pulse * .86);
      ctx.fillStyle = '#fff6e8';
      ctx.fillRect(x - starUnit / 2, y - starUnit / 2, starUnit, starUnit);
    }
    ctx.globalAlpha = 1;
    drawDust(dt * (1 - settle), objectsOpacity);
    ctx.globalAlpha = objectsOpacity;
    if (pass?.type === 'satellite') drawSatellite();
    if (pass?.type === 'planet') drawPlanet(dt);
    ctx.restore();
    const cloud = pass?.type === 'cloud';
    if (cloud && objectsOpacity > 0) drawPassingCloud(false, objectsOpacity);
    if (pass?.type === 'asteroid' && objectsOpacity > 0) {
      ctx.save();
      ctx.globalAlpha = objectsOpacity;
      drawAsteroid();
      ctx.restore();
    }
    pose.cloudLight = cloud ? objectsOpacity * clamp(1 - Math.abs(progress - .67) / .31, 0, 1) : 0;
    pose.warmCloud = cloud && pass.warm;
    pose.viewX = viewX;
    pose.viewY = viewY;
    if (entering) {
      shipArrival = .78 * (1 - intro) ** 2.45;
      pose.boost = Math.min(1, intro * 12) * Math.min(1, (1 - intro) / .27);
    } else if (leaving) {
      const departure = Math.max(0, (outro - .10) / .90);
      shipArrival = exitView.arrival + (.84 - exitView.arrival) * departure ** 1.45;
      pose.boost = exitView.boost * (1 - Math.min(1, outro * 3));
    } else {
      shipArrival = 0;
    }
    pose.verticalOffset = shipArrival * height;
    drawShip(ctx, width, height, horizontalOffset, (now - introStarted) / 1000, pose);
    if (cloud && objectsOpacity > 0) drawPassingCloud(true, objectsOpacity);
    if (leaving && outro === 1 && !revealed) {
      revealed = true;
      onReveal();
    }
    if (leaving && exitTime >= exitDuration + revealDuration) { onExit(); return; }
    frame = requestAnimationFrame(render);
  }
  frame = requestAnimationFrame(render);
  return {
    exit(reveal, done) {
      if (onExit) return;
      exitView = { x: viewX, y: viewY, bank, pitch, zoom: pose.cameraBoost,
        arrival: shipArrival, boost: pose.boost };
      keys.clear();
      thrustInputs.clear();
      targetBank = targetPitch = 0;
      pose.rcsX = pose.rcsY = 0;
      pose.rcsTrail.length = 0;
      previous = 0;
      onReveal = reveal;
      onExit = done;
    },
    resetFrameClock() { previous = 0; },
    setPointer(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      targetBank = (clamp((clientX - rect.left) / rect.width, 0, 1) - .5) * 2;
      if (Number.isFinite(clientY) && rect.height) targetPitch = (.5 - clamp((clientY - rect.top) / rect.height, 0, 1)) * 2;
      mode = 'pointer';
    },
    setTilt(across, forward) {
      // Ignore small sensor drift and reach full steering at a comfortable tilt.
      const strength = value => Math.sign(value) * clamp((Math.abs(value) - .035) / .28, 0, 1);
      targetBank = strength(across);
      targetPitch = strength(forward);
      mode = 'pointer';
    },
    pressThrust,
    releaseThrust(source) { thrustInputs.delete(source); },
    keyDown(key, code = key) {
      if (key === 'Shift') {
        pressThrust(code);
      } else if (steeringKeys.has(key)) {
        keys.add(key);
        mode = 'keys';
      }
    },
    keyUp(key, code = key) {
      if (key === 'Shift') thrustInputs.delete(code);
      else keys.delete(key);
    },
    destroy() {
      if (!alive) return;
      alive = false; keys.clear(); thrustInputs.clear(); cancelAnimationFrame(frame);
      bannerSky?.removeEventListener('load', resize);
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', resize);
    }
  };
}
