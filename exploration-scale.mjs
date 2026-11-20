// Equatorial diameters: NASA Uranus and Neptune fact sheets. Distances are
// illustrative camera-to-center distances, not observed spacecraft positions.
export const iceGiantViews = Object.freeze({
  uranus: Object.freeze({ diameterKm: 51118, distanceKm: 180000 }),
  neptune: Object.freeze({ diameterKm: 49528, distanceKm: 180000 })
});

// Camera's shorter viewport axis represents 60 degrees. makePixelPlanet uses
// a 66-pixel disk inside its 128-pixel sprite; Uranus's rings extend beyond it.
// Formula uses the silhouette of a sphere at an on-axis distance; lateral
// displacement, moving passes, sprite shading and ring appearance are artistic.
export function iceGiantSpriteSize(variant, viewportWidth, viewportHeight) {
  const body = iceGiantViews[variant];
  if (!body) throw new RangeError(`Unknown ice giant: ${variant}`);
  const radius = body.diameterKm / 2;
  const tangentRadius = radius / Math.sqrt(body.distanceKm ** 2 - radius ** 2);
  const diskFraction = tangentRadius / Math.tan(Math.PI / 6);
  return Math.min(viewportWidth, viewportHeight) * diskFraction * 128 / 66;
}
