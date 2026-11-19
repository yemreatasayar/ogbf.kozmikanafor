const dither = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const planetPalettes = {
  rocky: [[21, 17, 39], [43, 25, 56], [73, 35, 67], [112, 47, 72], [160, 65, 75], [199, 90, 82], [229, 125, 95], [248, 161, 111], [255, 204, 146]],
  ringed: [[19, 18, 40], [33, 27, 61], [53, 43, 88], [82, 62, 114], [114, 81, 131], [149, 108, 152], [183, 144, 177], [214, 179, 201], [249, 215, 212]],
  banded: [[12, 28, 42], [16, 44, 61], [25, 65, 83], [32, 94, 106], [49, 128, 130], [86, 163, 152], [127, 194, 169], [176, 220, 184], [223, 242, 200]]
};
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const mix = (a, b, t) => a + (b - a) * t;

function hash(x, y, seed) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function noise(x, y, seed) {
  const i = Math.floor(x), j = Math.floor(y);
  const u = x - i, v = y - j;
  const a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return mix(mix(hash(i, j, seed), hash(i + 1, j, seed), a),
    mix(hash(i, j + 1, seed), hash(i + 1, j + 1, seed), a), b);
}

function clouds(x, y, seed) {
  return noise(x, y, seed) * .55 + noise(x * 2.1, y * 2.1, seed + 37) * .27 +
    noise(x * 4.2, y * 4.2, seed + 79) * .13 + noise(x * 9, y * 9, seed + 111) * .05;
}

function artSurface(width, height) {
  const image = document.createElement('canvas');
  image.width = width;
  image.height = height;
  return { image, ctx: image.getContext('2d') };
}

function pixel(data, index, [r, g, b], alpha = 255) {
  data[index] = r; data[index + 1] = g; data[index + 2] = b; data[index + 3] = alpha;
}

const deepSkyObjects = [
  { x: -.655, y: -.10, rx: .14, ry: .089, angle: .42, spiral: true,
    outer: [84, 109, 160], inner: [236, 96, 60], seed: 125 },
  { x: .698, y: .03, rx: .102, ry: .066, angle: -.39, spiral: true, intensity: .73,
    outer: [47, 155, 219], inner: [218, 91, 164], seed: 743 },
  { x: .12, y: -.632, rx: .204, ry: .14, angle: .09, spiral: false,
    outer: [109, 74, 183], inner: [253, 119, 113], seed: 579 },
  { x: -.15, y: .631, rx: .19, ry: .145, angle: -.14, spiral: false,
    outer: [45, 136, 201], inner: [123, 105, 225], seed: 983 }
].map(object => ({ ...object, cos: Math.cos(object.angle), sin: Math.sin(object.angle) }));

const smooth = (a, b, value) => {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function addDeepSkyLight(light, object, u, v, aspect) {
  const dx = u - object.x, dy = (v - object.y) / aspect;
  if (Math.abs(dx) > .25 || Math.abs(v - object.y) > .33) return;
  const x = (dx * object.cos + dy * object.sin) / object.rx;
  const y = (-dx * object.sin + dy * object.cos) / (object.ry / aspect);
  if (Math.abs(x) >= 1 || Math.abs(y) >= 1) return;

  const warpX = noise(x * 3.1, y * 3.1, object.seed + 16) - .5;
  const warpY = noise(x * 4, y * 4, object.seed + 28) - .5;
  const gas = clouds(x * 7 + warpY, y * 6 - warpX, object.seed);
  const grit = noise(x * 42, y * 35, object.seed + 31);
  let outer, inner, core;

  if (object.spiral) {
    // A broad luminous disk, broken spiral arms and dust lanes occupy
    // different depth bands. The dense nucleus has its own warm palette.
    const radius = Math.hypot(x, y);
    const angle = Math.atan2(y * 1.08, x);
    const phase = 2 * angle - 13 * Math.log1p(radius * 2) + 2 * warpX + gas;
    const arms = smooth(-.12, .93, Math.cos(phase));
    const dust = smooth(.05, .82, Math.cos(phase - .83)) * smooth(.24, .72, gas);
    const edge = 1 - smooth(.53 + warpY * .14, .98, radius);
    const cloudsInArm = smooth(.28, .71, gas + grit * .075);
    const lane = 1 - dust * .78;
    outer = edge * (.085 + .29 * arms * lane + .29 * arms * cloudsInArm);
    inner = edge * (arms * cloudsInArm * .48 + Math.exp(-radius * 4) * .33) * lane;
    core = Math.exp(-Math.hypot(x * .90, y * 1.55) * 6) * (1.16 + grit * .12);
  } else {
    // The irregular dust ribbon follows a broad bend, with separate wisps,
    // sharp gas ridges and sparse luminous knots along its inner edge.
    const bend = .22 * Math.sin(6.1 * x + object.seed) + .12 * Math.sin(11 * x) + .40 * warpY;
    const spine = y - bend;
    const broad = 1 - smooth(.13, .80, Math.abs(spine) + .32 * Math.abs(x));
    const edge = (1 - smooth(.62, .99, Math.abs(x))) * (1 - smooth(.59, .98, Math.abs(y)));
    const shadow = smooth(.36, .67, clouds(x * 5, y * 7 - 1.7, object.seed + 180));
    const density = broad * smooth(.25, .70, gas + grit * .045);
    const ridge = Math.exp(-Math.abs(spine - .09 + warpX * .22) * 8.0);
    const filament = Math.exp(-Math.abs(spine + .29 + warpX * .42) * 9.0);
    const warmGas = smooth(.34, .78, gas + .13 * grit);
    const knots = smooth(.63, .90, noise(x * 17, y * 15, object.seed + 84));
    outer = edge * (.70 * density + .18 * broad + .24 * filament * warmGas) * (1 - shadow * .68);
    inner = edge * (.76 * ridge * warmGas + .20 * density) * (1 - shadow * .53);
    core = edge * ridge * knots * (.14 + .95 * warmGas);
  }

  const intensity = object.intensity ?? 1;
  light[0] += (outer * object.outer[0] + inner * object.inner[0] + core * 255) * intensity;
  light[1] += (outer * object.outer[1] + inner * object.inner[1] + core * 211) * intensity;
  light[2] += (outer * object.outer[2] + inner * object.inner[2] + core * 172) * intensity;
}

export function makePixelSky({ width, height, paddingX, paddingY, photograph }) {
  const fullWidth = width + 2 * paddingX, fullHeight = height + 2 * paddingY;
  const scale = Math.min(.78, 1536 / fullWidth, Math.sqrt(1450000 / (fullWidth * fullHeight)));
  const w = Math.max(1, Math.round(fullWidth * scale)), h = Math.max(1, Math.round(fullHeight * scale));
  const { image, ctx } = artSurface(w, h);
  const pixels = ctx.createImageData(w, h);
  const centralWidth = width / fullWidth * w, centralHeight = height / fullHeight * h;
  const left = (w - centralWidth) / 2, top = (h - centralHeight) / 2;
  let photoPixels, photoBox;
  if (photograph) {
    // Sample the same part of the source as the banner at neutral heading.
    // Margins blend into the larger illustrated sky beyond the photograph.
    const { source, x, y, boxWidth, boxHeight } = photograph;
    const cover = Math.max(boxWidth / source.naturalWidth, boxHeight / source.naturalHeight);
    const photoWidth = source.naturalWidth * cover, photoHeight = source.naturalHeight * cover;
    photoBox = {
      x: left + (x + (boxWidth - photoWidth) / 2) * w / fullWidth,
      y: top + (y + (boxHeight - photoHeight) / 2) * h / fullHeight,
      width: photoWidth * w / fullWidth,
      height: photoHeight * h / fullHeight
    };
    ctx.drawImage(source, photoBox.x, photoBox.y, photoBox.width, photoBox.height);
    photoPixels = ctx.getImageData(0, 0, w, h).data;
  }

  const aspect = width / height;
  const light = [0, 0, 0];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (x - w / 2) / centralWidth, v = (y - h / 2) / centralHeight;
    const dust = noise(u * 7 + v * 2, v * 5, 412);
    const halo = Math.max(0, dust - .27) * (1 - .8 * smooth(.17, .87, Math.abs(u + v * .2)));
    let r = 4 + halo * 10, g = 5 + halo * 13, b = 15 + halo * 27;
    const i = (y * w + x) * 4;
    if (photoPixels?.[i + 3]) {
      const rr = photoPixels[i], gg = photoPixels[i + 1], bb = photoPixels[i + 2];
      const sourceY = (y - photoBox.y) / photoBox.height;
      const sourceX = (x - photoBox.x) / photoBox.width;
      const warm = smooth(3, 24, rr - bb) * smooth(1, 18, gg - bb);
      const brightStar = smooth(112, 210, Math.min(rr, gg, bb)) * (1 - smooth(26, 74, Math.max(rr, gg, bb) - Math.min(rr, gg, bb)));
      const haze = Math.max(warm, smooth(.44, .70, sourceY)) * (1 - brightStar);
      const photoBlend = (1 - smooth(.435, .60, Math.abs(u))) * (1 - smooth(.445, .67, Math.abs(v))) *
        smooth(0, .10, sourceY) * (1 - smooth(.93, 1, sourceY)) *
        smooth(0, .09, sourceX) * (1 - smooth(.91, 1, sourceX)) * (1 - haze);
      // Only add celestial light. Matching the illustrated black level and
      // feathering the source boundaries avoids a visible photographic rectangle.
      r += Math.max(0, rr - r) * photoBlend;
      g += Math.max(0, gg - g) * photoBlend;
      b += Math.max(0, bb - b) * photoBlend;
    }
    light[0] = r; light[1] = g; light[2] = b;
    for (const object of deepSkyObjects) addDeepSkyLight(light, object, u, v, aspect);
    const step = dither[(y % 4) * 4 + x % 4] / 16 - .5;
    pixels.data[i] = Math.round((light[0] + step * 2) / 5) * 5;
    pixels.data[i + 1] = Math.round((light[1] + step * 2) / 5) * 5;
    pixels.data[i + 2] = Math.round((light[2] + step * 2) / 5) * 5;
    pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);

  const stars = [];
  const colors = ['#3a4071', '#666e9b', '#8793c4', '#bbc9ee', '#efe2ff', '#f7e7cb'];
  for (let i = 0; i < Math.round(w * h * .0045); i++) {
    const x = Math.floor(hash(i, 2, 746) * w), y = Math.floor(hash(i, 3, 746) * h);
    const u = (x - w / 2) / centralWidth, v = (y - h / 2) / centralHeight;
    const bright = hash(i, 4, 746) ** 2.3;
    if (photograph && Math.abs(u) < .49 && Math.abs(v) < .49 && bright < .60) continue;
    if (bright > .965 && hash(i, 5, 746) > .35) {
      const period = 8 + hash(i, 6, 746) * 13;
      stars.push({
        x: (x + .5) / w, y: (y + .5) / h,
        period, phase: hash(i, 7, 746) * period,
        rise: .8 + hash(i, 8, 746) * 1.3,
        fall: 1.2 + hash(i, 9, 746) * 1.9,
        peak: .50 + hash(i, 10, 746) * .45
      });
      continue;
    }
    ctx.fillStyle = colors[Math.floor(bright * colors.length)];
    ctx.fillRect(x, y, 1, 1);
    if (bright > .965) {
      ctx.fillStyle = '#526495';
      ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
      ctx.fillStyle = '#efeafa'; ctx.fillRect(x, y, 1, 1);
    }
  }
  return { image, stars };
}

// Two transparent depth layers share a shape language but use different
// seeds. They are rasterized once, then scaled and composited during a flyby.
export function makePassingCloud(seed, warm, foreground) {
  const width = 480, height = 252;
  const { image, ctx } = artSurface(width, height);
  const pixels = ctx.createImageData(width, height);
  const coolColor = warm ? [87, 64, 147] : [51, 97, 167];
  const brightColor = warm ? [232, 154, 198] : [126, 198, 233];

  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = (x + .5) / width * 2 - 1, v = (y + .5) / height * 2 - 1;
    const envelope = (1 - smooth(.53, 1, Math.abs(u))) * (1 - smooth(.56, 1, Math.abs(v)));
    const warp = clouds(u * 3.7 + 4, v * 3.2 + 5, seed);
    const crest = .21 * Math.sin(u * 5 + seed) + (warp - .5) * .72;
    const gas = clouds(u * 5.8 + warp * 2, v * 5.2 + warp * 3, seed + 39);
    const fold = Math.exp(-Math.abs(v - crest + .18) * 3.8);
    const wisps = Math.exp(-Math.abs(v - crest - .26) * 6.5);
    const cuts = smooth(.31, .76, noise(u * 9, v * 6, seed + 72));
    const density = envelope * (fold * .68 + wisps * .32) * smooth(.27, .72, gas) * (1 - .54 * cuts);
    if (density < .012) continue;
    const threshold = (dither[(y % 4) * 4 + x % 4] + .5) / 16;
    const glow = clamp(Math.floor((smooth(.36, .77, gas) * .73 + density * .27) * 10 + threshold * .55) / 10, 0, 1);
    const alpha = clamp(Math.round(density * (foreground ? 225 : 260)), 0, 255);
    pixel(pixels.data, (y * width + x) * 4,
      [mix(coolColor[0], brightColor[0], glow), mix(coolColor[1], brightColor[1], glow), mix(coolColor[2], brightColor[2], glow)], alpha);
  }
  ctx.putImageData(pixels, 0, 0);
  return image;
}

export function makePixelPlanet(variant) {
  const ringed = variant === 'ringed';
  const size = 128, radius = 33, center = size / 2;
  const { image, ctx } = artSurface(size, size);
  const pixels = ctx.createImageData(size, size);
  const palette = planetPalettes[variant];
  const craters = [[-.36, -.26, .18], [.27, .16, .12], [-.17, .36, .085], [.06, -.54, .09], [-.55, .08, .07]];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x + .5 - center) / radius, v = (y + .5 - center) / radius;
    const r2 = u * u + v * v;
    const along = u * .93 - v * .37, across = u * .37 + v * .93;
    const ring = Math.hypot(along, across * 3.5);
    const threshold = (dither[(y % 4) * 4 + x % 4] + .5) / 16;
    const index = (y * size + x) * 4;
    if (ringed && ring > 1.22 && ring < 1.86 && (r2 > 1 || across > 0)) {
      if (ring > 1.53 && ring < 1.61) continue;
      const tone = clamp(Math.floor(4.5 + 1.4 * Math.sin(ring * 46) - u * .9 + threshold), 1, 8);
      pixel(pixels.data, index, palette[tone]);
      continue;
    }
    if (r2 >= 1) continue;
    const z = Math.sqrt(1 - r2);
    const sun = clamp(-u * .51 - v * .43 + z * .74, 0, 1);
    let terrain = clouds(u * 4 + z, v * 4 + z, 123);
    if (ringed) terrain += Math.sin(v * 34 + u * 5 + terrain * 4) * .19;
    else if (variant === 'banded') {
      const latitude = v * .96 + u * .22;
      terrain += .38 * Math.sin(latitude * 27 + z * 2 + terrain * 2.4);
    } else {
      terrain += .18 * Math.sin(v * 23 + noise(u * 4, v * 3, 633) * 8);
      for (const [cx, cy, cr] of craters) {
        const d = Math.hypot(u - cx, v - cy) / cr;
        if (d < 1.16) terrain += d < .88 ? -.23 : ((u - cx) + (v - cy)) / cr * .13;
      }
    }
    const rim = z < .28 && sun > .35 ? .45 : 0;
    const tone = clamp(Math.floor(.26 + sun * (4 + terrain * 3.9) + rim + threshold * .8), 0, 8);
    pixel(pixels.data, index, palette[tone]);
  }
  ctx.putImageData(pixels, 0, 0);
  return image;
}

export function makePixelComet() {
  const w = 132, h = 44, headX = 115, headY = 22;
  const { image, ctx } = artSurface(w, h);
  const pixels = ctx.createImageData(w, h);
  const palette = [[36, 40, 99], [58, 63, 149], [74, 104, 196],
    [93, 158, 229], [132, 214, 248], [192, 247, 255], [255, 248, 233]];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = headX - x, dy = y - headY;
    const t = clamp(dx / headX, 0, 1);
    const core = Math.hypot(dx, dy);
    let energy = Math.max(0, 1.24 - core * .115);
    if (dx >= 0) {
      const ion = Math.abs(dy + 5 * t * t), dust = Math.abs(dy - 12 * t * t - 2 * t);
      const streak = hash(x, y, 419);
      energy = Math.max(energy,
        Math.max(0, 1 - ion / (3.1 + 3 * t)) * (1 - t) * (.75 + streak * .3),
        Math.max(0, 1 - dust / (3 + 9 * t)) * (1 - t) * (.32 + streak * .25));
    }
    const cutoff = (dither[(y % 4) * 4 + x % 4] + .5) / 16;
    if (energy < .085 + cutoff * .14) continue;
    const tone = clamp(Math.floor(energy * 6 + cutoff * .55), 0, 6);
    pixel(pixels.data, (y * w + x) * 4, palette[tone], energy > .6 ? 255 : Math.round(110 + energy * 206));
  }
  ctx.putImageData(pixels, 0, 0);
  return { image, headX, headY };
}

export function makePixelAsteroid(seed) {
  const size = 64;
  const { image, ctx } = artSurface(size, size);
  const pixels = ctx.createImageData(size, size);
  const rock = [[19, 20, 33], [28, 29, 44], [42, 42, 59], [58, 54, 71], [76, 68, 84],
    [97, 85, 98], [124, 106, 115], [155, 131, 133], [186, 159, 150]];
  const craters = [[-.31, -.25, .22], [.30, -.12, .16], [.05, .32, .24], [-.47, .32, .10]];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x + .5 - size / 2) / 27, v = (y + .5 - size / 2) / 27;
    const angle = Math.atan2(v, u);
    const edge = .89 + .11 * Math.sin(angle * 3 + seed) + .07 * Math.sin(angle * 7 - seed) +
      .045 * Math.cos(angle * 11) - .11 * Math.abs(u);
    const radius = Math.hypot(u, v) / edge;
    if (radius >= 1) continue;
    const z = Math.sqrt(1 - radius * radius);
    const light = clamp(-u * .57 - v * .58 + z * .54, 0, 1);
    const stone = clouds(u * 6, v * 6, seed);
    const facet = Math.floor(noise(u * 3.9, v * 3.2, seed + 117) * 4) * .15;
    let pits = 0;
    for (const [cx, cy, cr] of craters) {
      const d = Math.hypot(u - cx, v - cy) / cr;
      if (d < 1.1) pits += d < .82 ? -.75 : (u - cx + v - cy) / cr * .68;
    }
    const grain = dither[(y % 4) * 4 + x % 4] / 16;
    const tone = clamp(Math.floor(.18 + 5.5 * light + stone * 2.5 + facet + pits + grain * .8), 0, 8);
    pixel(pixels.data, (y * size + x) * 4, rock[tone]);
  }
  ctx.putImageData(pixels, 0, 0);
  return image;
}
