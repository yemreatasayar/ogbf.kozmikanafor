// Eight seamless phases of an emissive gas column. A travelling compression
// wave and softer outer halo share a bright core. Cache them once so flight
// needs two bitmap blends per engine rather than a new gradient every frame.
const plumeWidth=80, plumeHeight=108, plumeCenter=40, plumeOrigin=25;
const phaseCount=8;

function buildPlumes() {
  return Array.from({length:phaseCount},(_,frameIndex)=>{
    const frame=document.createElement('canvas');
    frame.width=plumeWidth; frame.height=plumeHeight;
    const ctx=frame.getContext('2d');
    const pixels=ctx.createImageData(plumeWidth,plumeHeight);
    const phase=frameIndex*Math.PI*2/phaseCount;
    for(let y=0; y<plumeHeight; y++) {
      const dy=y-plumeOrigin;
      const t=Math.max(0,dy/(plumeHeight-plumeOrigin));
      const wave=Math.sin(phase-t*16);
      const width=3+10*Math.pow(1-t,.68)*(1+.08*wave);
      for(let x=0; x<plumeWidth; x++) {
        const dx=x-plumeCenter;
        const r=Math.hypot(dx,dy);
        const halo=.27*Math.exp(-r*r/216);
        const center=dx-Math.sin(phase+t*10)*t*1.75;
        const d=center*center/(width*width);
        const fade=dy<0 ? Math.exp(-dy*dy/40) : Math.pow(1-t,1.26);
        const core=Math.exp(-d*3.8)*Math.exp(-t*3.6);
        const inner=Math.exp(-d*1.1)*(.65+.16*wave*t)*fade;
        const outer=Math.exp(-d*.38)*fade*.34;
        const energy=inner+outer+halo;
        if(energy<.006) continue;
        const heat=Math.exp(-r*r/95);
        const i=(y*plumeWidth+x)*4;
        pixels.data[i]=Math.min(255,47+core*168+heat*138+halo*170);
        pixels.data[i+1]=Math.min(255,124+core*115+heat*42);
        pixels.data[i+2]=Math.min(255,255-heat*72);
        pixels.data[i+3]=Math.round(Math.min(1,energy)*255);
      }
    }
    ctx.putImageData(pixels,0,0);
    return frame;
  });
}

function plume(ctx, direction, time, boost) {
  const phase=(time*2.2%1)*phaseCount;
  const index=Math.floor(phase), mix=phase-index;
  const stretch = .26 + .71 * boost + .018 * Math.sin(time * 11);
  const intensity = boost ** .72;
  ctx.save();
  ctx.transform(1+.09*boost,0,direction*.085,stretch,0,0);
  ctx.globalCompositeOperation='lighter';
  ctx.globalAlpha = (1 - mix) * intensity;
  ctx.drawImage(plumeFrames[index],-plumeCenter,-plumeOrigin);
  ctx.globalAlpha = mix * intensity;
  ctx.drawImage(plumeFrames[(index+1)%phaseCount],-plumeCenter,-plumeOrigin);
  ctx.restore();
}

// Right-handed object coordinates: X is starboard, Y is up, +Z is the nose.
// The renderer projects solid cross-sections, including the underside and the
// inside wall of each engine bell. No attitude uses a billboard of the hull.
const points = [];
const faces = [];
const visible = [];
let plumeFrames;
const paint = {
  porcelain: [150,155,175], silver: [121,132,157], pale: [184,181,190],
  violet: [99,109,136], plate: [72,82,109], edge: [50,58,81],
  graphite: [47,52,70], shadow: [27,31,45], ceramic: [37,41,56],
  orange: [213,120,58], orangeDark: [151,83,50], rim: [166,141,122],
  glass: [33,55,78], glassLight: [54,86,111], brass: [184,123,73],
  white: [255,248,213], fire: [255,184,83], amber: [238,132,58]
};
const palettes = new Map();
const shadeSteps = 64;
const glintSteps = 4;
const unlitNozzle = Array(shadeSteps * glintSteps).fill('#000000');
const surfaceGlint = {
  porcelain: .38, silver: .58, pale: .42, violet: .25, plate: .28,
  edge: .22, orange: .26, orangeDark: .18, rim: .78, brass: .65,
  glass: 1, glassLight: 1,
};

function palette(material, emission = 0, engineLight = 0) {
  if (material === 'nozzleOff') return unlitNozzle;
  const name = `${material}:${emission}:${engineLight}`;
  if (!palettes.has(name)) {
    const values = [];
    const [r,g,b] = paint[material];
    for (let glint = 0; glint < glintSteps; glint++) {
      const sheen = glint / (glintSteps - 1) * (surfaceGlint[material] ?? 0) * 43;
      for (let shade = 0; shade < shadeSteps; shade++) {
        const level = shade / (shadeSteps - 1);
        const light = Math.max(emission, .30 + level * 1.16);
        const shadow = (1 - level) * (1 - emission);
        const key = level * (1 - emission);
        const red = Math.round(r * light + key * 15 + sheen + engineLight * 5);
        const green = Math.round(g * light + key * 6 + sheen * .93 + engineLight * 8);
        const blue = Math.round(b * light + shadow * 10 + sheen * .78 + engineLight * 14);
        values.push(`rgb(${Math.min(255, red)},${Math.min(255, green)},${Math.min(255, blue)})`);
      }
    }
    palettes.set(name,values);
  }
  return palettes.get(name);
}

function vertex(x,y,z) {
  const point={x,y,z,px:0,py:0,depth:0};
  points.push(point);
  return point;
}

const armourMaterials = new Set(['porcelain', 'silver', 'pale', 'violet', 'plate', 'orange', 'orangeDark']);
const surfaceTextures = new Map();

function makeSurfaceTexture(kind, variant) {
  const tile = document.createElement('canvas');
  tile.width = 48; tile.height = 48;
  const ink = tile.getContext('2d');
  if (kind === 'glass') {
    ink.fillStyle = 'rgba(18, 23, 41, .48)';
    ink.fillRect(0, 29, 48, 19);
    ink.fillStyle = 'rgba(124, 189, 223, .29)';
    for (let step = 0; step < 8; step++) ink.fillRect(step * 6, 3 + step, 6, 3);
    ink.fillStyle = 'rgba(213, 224, 244, .48)';
    ink.fillRect(4, 3, 9, 1);
    return tile;
  }

  // Dark gaskets, a thin reflected edge and small paint chips form one cached tile.
  ink.fillStyle = 'rgba(13, 21, 38, .37)';
  ink.fillRect(0, 0, 48, 1); ink.fillRect(0, 0, 1, 48);
  ink.fillRect(2, 45, 44, 1);
  ink.fillStyle = 'rgba(246, 220, 184, .34)';
  ink.fillRect(2, 1, 44, 1); ink.fillRect(2, 2, 1, 42);
  if (variant === 0) {
    ink.fillStyle = 'rgba(16, 25, 43, .48)';
    ink.fillRect(30, 29, 11, 10);
    ink.fillStyle = 'rgba(198, 212, 235, .36)';
    for (const y of [30, 33, 36]) ink.fillRect(32, y, 7, 1);
  }
  let seed = 1721 + variant * 9981;
  for (let mark = 0; mark < 43; mark++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const x = 4 + seed % 40, y = 4 + (seed >>> 12) % 39;
    ink.fillStyle = mark % 3 ? 'rgba(34, 43, 66, .17)' : 'rgba(245, 220, 182, .28)';
    ink.fillRect(x, y, mark % 6 === 0 ? 3 : 1, 1);
  }
  return tile;
}

function drawSurfaceTexture(ctx, face) {
  const [a, b, , d] = face.vertices;
  ctx.save();
  ctx.clip();
  // Project the texture into the same surface as the hull, so markings turn
  // with the panel and stay behind nearer parts of the model.
  ctx.transform((b.px - a.px) / 48, (b.py - a.py) / 48,
    (d.px - a.px) / 48, (d.py - a.py) / 48, a.px, a.py);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(face.texture, 0, 0);
  ctx.restore();
}

function surface(vertices, material, outward, emission=0, firingMaterial) {
  const [a,b,c]=vertices;
  const ux=b.x-a.x, uy=b.y-a.y, uz=b.z-a.z;
  const vx=c.x-a.x, vy=c.y-a.y, vz=c.z-a.z;
  let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
  let length=Math.hypot(nx,ny,nz);
  if (length<.0001) return;
  if(nx*outward[0]+ny*outward[1]+nz*outward[2]<0) length=-length;
  nx/=length; ny/=length; nz/=length;
  const center=vertices.reduce((v,p)=>[v[0]+p.x,v[1]+p.y,v[2]+p.z],[0,0,0]).map(v=>v/vertices.length);
  const glass = material === 'glass' || material === 'glassLight';
  const textured = vertices.length === 4 && ny > .38 && (glass || armourMaterials.has(material));
  const [cx, cy, cz] = center;
  const nozzleDistance = Math.hypot(Math.abs(cx) - 42, cy, cz + 60);
  const engineLight = Math.round(Math.max(0, 1 - nozzleDistance / 54));
  faces.push({vertices,nx,ny,nz,center,shades:palette(material,emission,engineLight),depth:0,color:'',
    textureKind: textured ? (glass ? 'glass' : 'armour') : null, variant: faces.length % 3,
    firingShades: firingMaterial ? palette(firingMaterial, 1) : null,
    cloudReflectance: material === 'nozzleOff' ? 0 : .30 + Math.max(0, ny * .60 - nx * .20) });
}

// Join station rings along the spine. Straight upper facets give the body
// porcelain armour panels; deeper, independently lit lower facets form the keel.
function loft(stations, section, choose) {
  const rings=stations.map(([z,w,h,cy])=>section.map(([sx,sy])=>vertex(sx*w,cy+sy*h,z)));
  for(let k=0;k<rings.length-1;k++){
    for(let j=0;j<section.length;j++){
      const n=(j+1)%section.length;
      surface([rings[k][j],rings[k][n],rings[k+1][n],rings[k+1][j]],choose(k,j),
        [section[j][0]+section[n][0],section[j][1]+section[n][1],0]);
    }
  }
  surface(rings[0],'graphite',[0,0,-1]);
  surface(rings.at(-1),'silver',[0,0,1]);
}

const bodySection=[[-.55,1],[.55,1],[.87,.68],[1,.16],[.87,-.59],[.48,-1],[-.48,-1],[-.87,-.59],[-1,.16],[-.87,.68]];
function buildFuselage() {
  loft([[-53,48,17,0],[-38,53,22,1],[-7,56,27,2],[31,51,29,3],
        [65,43,26,5],[97,34,21,7],[124,23,16,8],[148,12,10,7],[158,3,4,6]],bodySection,
    (k,j)=>j===0 ? ['silver','porcelain','silver','porcelain','pale','porcelain','silver','pale'][k]
      : j===1||j===9 ? (k%3===0?'violet':'silver') : j===2||j===8 ? 'plate' : 'graphite');
  // Stepped dorsal spine and a narrow keel protrude between the pods.
  loft([[-80,8,18,0],[-68,10,22,0],[-45,10,21,10],[-14,7,15,21],[14,5,11,30],[40,2,4,32]],
    bodySection,(k,j)=>j===0?'rim':j===1||j===9?'plate':'graphite');
  loft([[86,21,3,26],[97,21,6,26],[112,17,9,23],[132,11,6,21],[141,4,2,18]],
    bodySection,(k,j)=>k===0||k===3?'edge':j===0?'glassLight':'glass');
  // Transverse panel grooves wrap over the shoulder facets as the fuselage tapers.
  for(const [z,w,h,cy] of [[33,50.6,28.8,3.1],[67,42.4,25.7,5.2],[127,21.7,15.2,7.9]]){
    for(let j of [0,1,2,8,9]){
      const n=(j+1)%bodySection.length;
      const cross=(i,dz)=>vertex(bodySection[i][0]*(w+.4),cy+bodySection[i][1]*(h+.5),z+dz);
      surface([cross(j,0),cross(n,0),cross(n,1.6),cross(j,1.6)],'edge',[bodySection[j][0]+bodySection[n][0],1,0]);
    }
  }
}

function buildWing(side){
  // span, leading Z, trailing Z, upper camber, thickness
  const profile=[[40,81,-47,5,12],[61,74,-51,7,12],[81,60,-51,6,11],
    [104,35,-49,4,9],[140,6,-46,3,7],[169,-16,-42,2,6],[190,-33,-40,1,4]];
  const cuts=[0,.09,.45,.75,.96,1];
  const upper=[], lower=[];
  const camber=[0,.75,1,.8,.55,.13];
  for(const [x,front,back,y,h] of profile){
    upper.push(cuts.map((t,j)=>vertex(x*side,y+h*camber[j]*.43,front+(back-front)*t)));
    lower.push(cuts.map((t,j)=>vertex(x*side,y-h*(.38+.44*camber[j]),front+(back-front)*t)));
  }
  for(let i=0;i<profile.length-1;i++) {
    for(let j=0;j<cuts.length-1;j++) {
      const patch=(r)=>[r[i][j],r[i+1][j],r[i+1][j+1],r[i][j+1]];
      const material=i===5 ? (j===4?'orangeDark':'orange')
        : i===0 ? 'plate' : j===0?'pale':j===4?'edge':j===3?'violet':(i+j)%3?'silver':'porcelain';
      const panel=patch(upper);
      surface(panel,material,[0,1,0]);
      surface(patch(lower),j===4?'shadow':'graphite',[0,-1,0]);
      // Gaskets and thin chamfer highlights follow the real panel planes.
      if(i>0 && j>0 && j<4){
        const [a,b,c,d]=panel;
        const lerp=(u,v,t)=>vertex(u.x+(v.x-u.x)*t,u.y+(v.y-u.y)*t+.28,u.z+(v.z-u.z)*t);
        surface([lerp(a,d,.03),lerp(b,c,.03),lerp(b,c,.065),lerp(a,d,.065)],'edge',[0,1,0]);
        surface([lerp(a,b,.025),lerp(d,c,.025),lerp(d,c,.065),lerp(a,b,.065)],'edge',[0,1,0]);
      }
    }
    for(const j of [0,5]){
      surface([upper[i][j],upper[i+1][j],lower[i+1][j],lower[i][j]],j===0?'rim':'graphite',[0,0,j===0?1:-1]);
    }
  }
  const tip=profile.length-1;
  for(let j=0;j<5;j++) surface([upper[tip][j],upper[tip][j+1],lower[tip][j+1],lower[tip][j]],'orangeDark',[side,0,0]);
  // A lamp is recessed into the trailing edge of each wing tip.
  surface([vertex(side*173,1,-42.6),vertex(side*184,1,-41.4),vertex(side*184,-.7,-41.4),vertex(side*173,-.7,-42.6)],'fire',[0,0,-1],1.15);
}

const nozzleSegments=20;
function buildEngine(side){
  const x=38*side, y=-3;
  // Shrinking rings articulate the hard casing, seams, shrouds and nozzle petals.
  const stations=[[43,11,'plate'],[31,17,'silver'],[6,21,'graphite'],[4,22,'edge'],[0,20,'plate'],
    [-23,23,'violet'],[-25,24,'edge'],[-28,23,'graphite'],[-42,24,'silver'],[-45,25,'edge'],
    [-47,23,'graphite'],[-60,24,'plate'],[-64,25,'rim'],[-69,24,'graphite'],[-74,21,'brass']];
  const circle=(z,r)=>Array.from({length:nozzleSegments},(_,j)=>{
    const a=j*2*Math.PI/nozzleSegments;
    return vertex(x+r*Math.cos(a),y+r*Math.sin(a),z);
  });
  const rings=stations.map(([z,r])=>circle(z,r));
  for(let i=0;i<rings.length-1;i++){
    for(let j=0;j<nozzleSegments;j++){
      const n=(j+1)%nozzleSegments, a=(j+.5)*2*Math.PI/nozzleSegments;
      const panel=[rings[i][j],rings[i][n],rings[i+1][n],rings[i+1][j]];
      const base=stations[i+1][2];
      surface(panel, j%5===1 && i===7?'graphite':j%3===0 && i===12?'rim':base,[Math.cos(a),Math.sin(a),0]);
    }
  }
  // The aft ring is open: the copper lip encloses a recessed incandescent throat.
  const lip=rings.at(-1), bore=circle(-74,17), throat=circle(-70,14);
  const center=vertex(x,y,-70.1);
  for(let j=0;j<nozzleSegments;j++){
    const n=(j+1)%nozzleSegments;
    surface([lip[j],lip[n],bore[n],bore[j]],j%2?'rim':'plate',[0,0,-1]);
    surface([bore[j],bore[n],throat[n],throat[j]], 'nozzleOff', [0,0,-1], 0, j % 3 ? 'fire' : 'amber');
    surface([throat[j],throat[n],center], 'nozzleOff', [0,0,-1], 0, 'white');
  }
  return vertex(x,y,-74.1);
}

buildFuselage();
buildWing(-1);
buildWing(1);
const nozzles=[buildEngine(-1),buildEngine(1)];
function thruster(x, y, z, exhaustX, exhaustY, behind = false) {
  return {
    origin: vertex(x, y, z),
    direction: vertex(x + exhaustX, y + exhaustY, z),
    behind
  };
}

// Opposite impulses at the fore and aft ports create a turning moment
// without pushing the whole craft sideways or vertically.
const yawJets = [-1, 1].map(turn => [
  thruster(-turn * 69, 6, 67, -turn * 28, 0, true),
  thruster(turn * 187, 1, -39.5, turn * 28, 0)
]);
const pitchJets = [-1, 1].map(turn => [
  thruster(16, turn > 0 ? -13 : 27, 90, 0, -turn * 27, turn > 0),
  thruster(-18, turn > 0 ? 23 : -22, -64, 0, turn * 27, turn < 0)
]);
const cameraDistance=525;
const byFarDepth=(a,b)=>b.depth-a.depth;

function project(bank,pitch){
  const yaw=bank*.43+.033, roll=-bank*.35;
  const elevation=.425+pitch*.34;
  const sy=Math.sin(yaw), cy=Math.cos(yaw);
  const sr=Math.sin(roll), cr=Math.cos(roll);
  const se=Math.sin(elevation), ce=Math.cos(elevation);
  // Object-to-camera basis: horizontal, vertical and away from the eye.
  const xx=cy*cr, xy=-cy*sr, xz=sy;
  const yx=ce*sr-se*sy*cr, yy=ce*cr+se*sy*sr, yz=se*cy;
  const zx=-ce*sy*cr-se*sr, zy=ce*sy*sr-se*cr, zz=ce*cy;
  for(const p of points){
    p.depth=p.x*zx+p.y*zy+p.z*zz;
    const f=cameraDistance/(cameraDistance+p.depth);
    p.px=(p.x*xx+p.y*xy+p.z*xz)*f;
    p.py=-(p.x*yx+p.y*yy+p.z*yz)*f;
  }
  visible.length=0;
  for(const face of faces){
    const {nx,ny,nz,center}=face;
    const normalDepth=nx*zx+ny*zy+nz*zz;
    // Perspective backface culling uses the actual eye-to-face direction.
    if(normalDepth*cameraDistance+center[0]*nx+center[1]*ny+center[2]*nz>0) continue;
    const nxView=nx*xx+ny*xy+nz*xz, nyView=nx*yx+ny*yy+nz*yz;
    const sun = Math.max(0, nxView * .48 + nyView * .74 - normalDepth * .47);
    const reflectedSky = Math.max(0, -nxView * .85 + nyView * .24 - normalDepth * .28);
    const shade = Math.min(shadeSteps - 1, Math.round(3 + sun * 51 + reflectedSky * 10));
    // The half vector between the key and the camera concentrates highlights.
    const halfDot = nxView * .28 + nyView * .43 - normalDepth * .86;
    const glint = Math.round((glintSteps - 1) * Math.max(0, halfDot) ** 12 * sun);
    const light = shade + Math.min(glintSteps - 1, glint) * shadeSteps;
    face.color=face.shades[light];
    face.firingColor = face.firingShades?.[light];
    face.depth=center[0]*zx+center[1]*zy+center[2]*zz;
    visible.push(face);
  }
  visible.sort(byFarDepth);
}

function drawModel(ctx, throttle, cloudGlow, cloudColor) {
  // A narrow same-colour stroke seals subpixel AA gaps between adjoining faces.
  ctx.lineWidth=.35;
  ctx.lineJoin='round';
  for(const face of visible){
    const polygon=face.vertices;
    ctx.beginPath();
    ctx.moveTo(polygon[0].px,polygon[0].py);
    for(let i=1;i<polygon.length;i++) ctx.lineTo(polygon[i].px,polygon[i].py);
    ctx.closePath();
    ctx.fillStyle=face.color;
    ctx.fill();
    if (face.textureKind) {
      if (!face.texture) {
        const key = face.textureKind + face.variant;
        if (!surfaceTextures.has(key)) surfaceTextures.set(key, makeSurfaceTexture(face.textureKind, face.variant));
        face.texture = surfaceTextures.get(key);
      }
      drawSurfaceTexture(ctx, face);
    }
    ctx.strokeStyle=face.color;
    ctx.stroke();
    if (cloudGlow > 0 && face.cloudReflectance > 0) {
      ctx.globalAlpha = cloudGlow * face.cloudReflectance;
      ctx.fillStyle = cloudColor;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (face.firingColor && throttle > 0) {
      ctx.globalAlpha = throttle;
      ctx.fillStyle = face.firingColor;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

// Cache the raster by attitude, density and coarse throttle for the glowing throat.
let modelLayer=null, lastBank=NaN, lastPitch=NaN, lastDensity=0, lastThrottle = -1, lastGlow = -1, lastWarm = false;
let modelBottom=0, modelMidX=0;
const extentX=235, extentY=168;
function renderPose(bank, pitch, scale, boost, cloudLight, warmCloud) {
  const density = Math.max(.75, Math.min(2.25, Math.ceil(scale * 4.4) / 4));
  const throttle = Math.round(boost * 16) / 16;
  const glow = Math.round(cloudLight * 20) / 20;
  if (bank === lastBank && pitch === lastPitch && density === lastDensity && throttle === lastThrottle &&
      glow === lastGlow && warmCloud === lastWarm) return;
  project(bank,pitch);
  modelBottom = -Infinity;
  let left = Infinity, right = -Infinity;
  for (const face of visible) {
    for (const point of face.vertices) {
      modelBottom = Math.max(modelBottom, point.py);
      left = Math.min(left, point.px);
      right = Math.max(right, point.px);
    }
  }
  modelMidX = (left + right) / 2;
  if(!modelLayer) modelLayer=document.createElement('canvas');
  if(density!==lastDensity){
    modelLayer.width=Math.ceil(extentX*2*density);
    modelLayer.height=Math.ceil(extentY*2*density);
  }
  const g=modelLayer.getContext('2d');
  g.setTransform(density,0,0,density,extentX*density,extentY*density);
  g.clearRect(-extentX,-extentY,extentX*2,extentY*2);
  drawModel(g, throttle, glow * .27, warmCloud ? '#d7a8f5' : '#86d0fa');
  lastBank=bank; lastPitch=pitch; lastDensity=density; lastThrottle=throttle;
  lastGlow = glow; lastWarm = warmCloud;
}

let rcsPuff;

function makeRcsPuff() {
  const texture = document.createElement('canvas');
  texture.width = 52;
  texture.height = 26;
  const gas = texture.getContext('2d');
  const opacity = gas.createLinearGradient(0, 0, 52, 0);
  opacity.addColorStop(0, 'rgba(255,255,255,.94)');
  opacity.addColorStop(.13, 'rgba(247,248,253,.78)');
  opacity.addColorStop(.58, 'rgba(231,239,252,.24)');
  opacity.addColorStop(1, 'rgba(231,239,252,0)');
  gas.fillStyle = opacity;
  gas.beginPath();
  gas.moveTo(0, 11);
  gas.quadraticCurveTo(19, 6, 52, 1);
  gas.lineTo(52, 25);
  gas.quadraticCurveTo(17, 19, 0, 15);
  gas.closePath();
  gas.fill();
  gas.fillStyle = 'rgba(255,255,255,.84)';
  gas.fillRect(0, 11, 7, 4);
  return texture;
}

function drawRcsPair(ctx, jets, pulse, behind) {
  const power = Math.abs(pulse);
  if (power < .035) return;
  rcsPuff ??= makeRcsPuff();
  for (const {origin, direction, behind: underHull} of jets) {
    if (underHull !== behind) continue;
    const dx = direction.px - origin.px, dy = direction.py - origin.py;
    const foreshortening = Math.min(1, Math.hypot(dx, dy) / 24);
    const width = (14 + power * 24) * foreshortening;
    const height = 5 + power * 7;
    ctx.save();
    ctx.translate(origin.px, origin.py);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.globalAlpha = power;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(rcsPuff, -1, -height / 2, width, height);
    ctx.restore();
  }
}

function drawRcsTrail(ctx, pose, time, x, y, scale, yaw, pitchPair) {
  const trail = pose.rcsTrail;
  if (!trail) return;
  if (time >= pose.nextPuff && Math.max(Math.abs(pose.rcsX), Math.abs(pose.rcsY)) > .23) {
    rcsPuff ??= makeRcsPuff();
    addTrailPuffs(trail, yaw, pose.rcsX, pose, time, x, y, scale);
    addTrailPuffs(trail, pitchPair, pose.rcsY, pose, time, x, y, scale);
    pose.nextPuff = time + .085;
  }
  for (let i = trail.length - 1; i >= 0; i--) {
    const puff = trail[i];
    const age = (time - puff.time) / .39;
    if (age >= 1) { trail.splice(i, 1); continue; }
    const fade = (1 - age) ** 2 * Math.min(1, age * 6);
    const drift = age * 36 * puff.scale;
    ctx.save();
    ctx.translate(puff.x - (pose.viewX - puff.viewX) + Math.cos(puff.angle) * drift,
      puff.y + (pose.viewY - puff.viewY) + Math.sin(puff.angle) * drift);
    ctx.rotate(puff.angle);
    ctx.globalAlpha = fade * puff.power * .48;
    ctx.imageSmoothingEnabled = true;
    const height = (4 + age * 13) * puff.scale;
    ctx.drawImage(rcsPuff, 0, -height / 2, (10 + age * 19) * puff.scale, height);
    ctx.restore();
  }
}

function addTrailPuffs(trail, jets, pulse, pose, time, x, y, scale) {
  const power = Math.abs(pulse);
  if (power <= .23) return;
  for (const { origin, direction } of jets) {
    trail.push({ x: x + origin.px * scale, y: y + origin.py * scale, time, power, scale,
      angle: Math.atan2(direction.py - origin.py, direction.px - origin.px),
      viewX: pose.viewX, viewY: pose.viewY });
  }
}

export function drawShip(ctx,width,height,horizontalOffset,elapsedSeconds,pose={}){
  if(!plumeFrames) plumeFrames=buildPlumes();
  const { bank = 0, pitch = 0, boost = 0, cameraBoost = boost, rcsX = 0, rcsY = 0, cloudLight = 0, warmCloud = false, verticalOffset = 0 } = pose;
  const scale = .8 * (1 - cameraBoost * .055) * Math.min(width * .48, height * 1.06) / 395;
  renderPose(bank, pitch, scale, boost, cloudLight, warmCloud);
  const plumeLength = boost > .025 ? 24 + boost * 60 : 0;
  const nozzleBottom=Math.max(nozzles[0].py,nozzles[1].py)+plumeLength;
  const desiredY = height * .72 - pitch * height * .085 - cameraBoost * height * .013;
  const centerY = Math.min(desiredY, height - scale * Math.max(modelBottom, nozzleBottom) - 8) + verticalOffset;
  const yaw = yawJets[Number(rcsX > 0)];
  const pitchPair = pitchJets[Number(rcsY > 0)];
  const centerX = width / 2 + horizontalOffset - scale * modelMidX;
  drawRcsTrail(ctx, pose, elapsedSeconds, centerX, centerY, scale, yaw, pitchPair);
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale,scale);
  drawRcsPair(ctx, yaw, rcsX, true);
  drawRcsPair(ctx, pitchPair, rcsY, true);
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(modelLayer,-extentX,-extentY,extentX*2,extentY*2);
  if (boost > .025) for(let i=0;i<2;i++){
    const direction=i===0?-1:1;
    const p=nozzles[i];
    ctx.save();
    ctx.translate(p.px,p.py);
    ctx.rotate(bank*.46);
    const f=cameraDistance/(cameraDistance+p.depth);
    ctx.scale(f*.98,f*(.9+.15*pitch));
    plume(ctx,direction,elapsedSeconds+i*.43,boost);
    ctx.restore();
  }
  drawRcsPair(ctx, yaw, rcsX, false);
  drawRcsPair(ctx, pitchPair, rcsY, false);
  ctx.restore();
}
