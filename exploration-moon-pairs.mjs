import { makePixelPlanet } from './exploration-pixel-art.mjs?v=20261120-flyby';

// Artistic approach: the planet and its satellite share a system but the
// foreground moon approaches faster. Sizes are apparent, not physical ratios.
export function moonPairGeometry(width, height, variant, progress) {
  const unit = Math.min(width, height);
  const t = Math.max(0, Math.min(1, progress));
  const near = t * t;
  // Keep Saturn's system in the right-hand view for most of the encounter.
  // Its position depends only on progress, so looking away and back never
  // creates a different composition.
  const x = width * (variant === 'titan'
    ? .16 + .42 * t ** 2.1
    : .045 + .92 * t ** 2.1);
  const y = height * (.10 + .045 * t);
  const planetSize = unit * (.055 + .48 * near);
  const moonSize = unit * (.006 + (variant === 'titan' ? .115 : .10) * near);
  // Offset from parent is in the plane of the view; changing distance also
  // changes the separation. This is a composed projection, not an ephemeris.
  return { x, y, planetSize, moonSize,
    moonX: x + unit * (.035 + .22 * near),
    moonY: y + unit * (.018 + .11 * near) };
}

export function drawMoonPair(ctx, width, height, variant, progress, side = 1, cache = new Map()) {
  const parent = variant === 'titan' ? 'saturn' : 'jupiter';
  for (const id of [parent, variant]) if (!cache.has(id)) cache.set(id, makePixelPlanet(id));
  const { x, y, planetSize, moonX, moonY, moonSize } = moonPairGeometry(width, height, variant, progress);
  ctx.save();
  ctx.drawImage(cache.get(parent), x - planetSize / 2, y - planetSize / 2, planetSize, planetSize);
  ctx.drawImage(cache.get(variant), moonX - moonSize / 2, moonY - moonSize / 2, moonSize, moonSize);
  ctx.restore();
}
