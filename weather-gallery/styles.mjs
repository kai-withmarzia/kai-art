/**
 * Weather Art Styles — each function returns a complete HTML document
 * that renders a generative art piece driven by weather data.
 * 
 * Weather data is embedded directly into the HTML so Playwright can
 * render it without needing a network fetch.
 */

// Style 1: Flow Fields (evolved from london-live.html)
// Best for: windy conditions, moderate temps
export function flowFields(weather) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>* { margin:0; padding:0; } body { background:#000; overflow:hidden; } canvas { display:block; }
#info { position:fixed; bottom:20px; left:20px; color:rgba(255,255,255,0.35); font:11px/1.8 'Courier New',monospace; letter-spacing:1px; text-transform:uppercase; z-index:10; }
#title { position:fixed; top:20px; left:20px; color:rgba(255,255,255,0.2); font:10px 'Courier New',monospace; letter-spacing:3px; text-transform:uppercase; z-index:10; }
</style></head><body>
<div id="title">${weather.location} · ${weather.timeStr}</div>
<div id="info">${weather.temp}°C ${weather.condition} · Wind ${weather.windLabel} ${weather.windSpeed}km/h<br>Humidity ${weather.humidity}% · Pressure ${weather.pressure}mb · Cloud ${weather.cloudCover}%</div>
<canvas id="c"></canvas>
<script>
const W = ${JSON.stringify(weather)};
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const width = canvas.width = 1920;
const height = canvas.height = 1080;
let time = 0;
const cols = 80, rows = 60;
const flowField = new Array(cols * rows);
const particles = [];

const night = W.isNight;
const warmth = Math.max(0, Math.min(1, (W.temp - 5) / 25));
const cloudGray = W.cloudCover / 100;

const pal = night ? {
  sky: { r: 8 + cloudGray * 20, g: 12 + cloudGray * 15, b: 28 + cloudGray * 10 },
  particle: { r: 60 + cloudGray * 40, g: 90 + cloudGray * 20, b: 140 - cloudGray * 30 },
  accent: { r: 100 - cloudGray * 30, g: 160 - cloudGray * 40, b: 200 - cloudGray * 40 }
} : {
  sky: { r: 20 + warmth * 40 + cloudGray * 60, g: 30 + warmth * 20 + cloudGray * 60, b: 50 + (1-warmth) * 30 + cloudGray * 50 },
  particle: { r: 80 + warmth * 100, g: 100 + warmth * 50 - cloudGray * 30, b: 160 - warmth * 80 },
  accent: { r: 120 + warmth * 80, g: 150 + warmth * 40, b: 200 - warmth * 80 }
};

class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * width; this.y = Math.random() * height;
    this.vx = 0; this.vy = 0;
    this.life = Math.random() * 200 + 100; this.maxLife = this.life;
    this.size = Math.random() * 1.5 + 0.3;
  }
  update() {
    const col = Math.floor((this.x / width) * cols);
    const row = Math.floor((this.y / height) * rows);
    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      const angle = flowField[row * cols + col];
      const speed = W.windSpeed / 20;
      this.vx += Math.cos(angle) * speed * 0.3;
      this.vy += Math.sin(angle) * speed * 0.3;
    }
    this.vx *= 0.96; this.vy *= 0.96;
    this.x += this.vx; this.y += this.vy;
    this.life--;
    if (this.life <= 0 || this.x < -10 || this.x > width + 10 || this.y < -10 || this.y > height + 10) this.reset();
  }
  draw() {
    const lr = this.life / this.maxLife;
    const a = lr * 0.35;
    const r = pal.particle.r + Math.sin(this.x * 0.01) * 20;
    const g = pal.particle.g + Math.cos(this.y * 0.01) * 20;
    const b = pal.particle.b + Math.sin(time * 0.1) * 10;
    ctx.fillStyle = \`rgba(\${Math.floor(r)},\${Math.floor(g)},\${Math.floor(b)},\${a})\`;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
  }
}

function updateFlow() {
  const windRad = (W.windDir - 90) * Math.PI / 180;
  const pWave = (W.pressure - 1013) / 20;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const nx = x / cols, ny = y / rows;
    let a = windRad;
    a += Math.sin(nx * 4 + time * 0.3) * Math.cos(ny * 3 + time * 0.2) * pWave * 0.5;
    a += Math.sin(nx * 6 + ny * 4 + time * 0.15) * (W.temp / 30) * 0.8;
    a += Math.sin(nx * 8 - time * 0.4) * Math.cos(ny * 5 + time * 0.25) * (W.humidity / 100) * 0.6;
    flowField[y * cols + x] = a;
  }
}

const n = Math.min(800, 300 + W.humidity * 4);
for (let i = 0; i < n; i++) particles.push(new Particle());

ctx.fillStyle = \`rgb(\${Math.floor(pal.sky.r)},\${Math.floor(pal.sky.g)},\${Math.floor(pal.sky.b)})\`;
ctx.fillRect(0, 0, width, height);

function frame() {
  time++;
  ctx.fillStyle = \`rgba(\${Math.floor(pal.sky.r)},\${Math.floor(pal.sky.g)},\${Math.floor(pal.sky.b)},0.06)\`;
  ctx.fillRect(0, 0, width, height);
  updateFlow();
  for (const p of particles) { p.update(); p.draw(); }
  if (time < 400) requestAnimationFrame(frame);
  else window.__RENDER_DONE = true;
}
frame();
</script></body></html>`;
}


// Style 2: Rain Streaks — moody vertical lines with splashes
// Best for: rainy/wet conditions
export function rainStreaks(weather) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>* { margin:0; padding:0; } body { background:#0a0c14; overflow:hidden; } canvas { display:block; }
#info { position:fixed; bottom:20px; left:20px; color:rgba(255,255,255,0.3); font:11px/1.8 'Courier New',monospace; letter-spacing:1px; text-transform:uppercase; z-index:10; }
#title { position:fixed; top:20px; left:20px; color:rgba(255,255,255,0.15); font:10px 'Courier New',monospace; letter-spacing:3px; text-transform:uppercase; z-index:10; }
</style></head><body>
<div id="title">${weather.location} · ${weather.timeStr} · rain</div>
<div id="info">${weather.temp}°C ${weather.condition} · ${weather.precipMM}mm rain<br>Wind ${weather.windLabel} ${weather.windSpeed}km/h · Humidity ${weather.humidity}%</div>
<canvas id="c"></canvas>
<script>
const W = ${JSON.stringify(weather)};
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const width = canvas.width = 1920;
const height = canvas.height = 1080;
let time = 0;

const intensity = Math.min(1, Math.max(0.2, W.precipMM / 5));
const drops = [];
const splashes = [];
const numDrops = Math.floor(200 + intensity * 600);

// Moody blue-gray palette
const bg = { r: 10, g: 12, b: 20 };
const dropColor = { r: 80 + W.temp * 2, g: 100 + W.temp, b: 160 - W.temp * 2 };

class Drop {
  constructor() { this.reset(true); }
  reset(init) {
    this.x = Math.random() * width;
    this.y = init ? Math.random() * height : -20;
    this.speed = 4 + Math.random() * 8 * intensity;
    this.length = 15 + Math.random() * 30 * intensity;
    this.thickness = Math.random() * 1.5 + 0.3;
    this.opacity = 0.1 + Math.random() * 0.3;
    this.windOffset = (W.windSpeed / 40) * (Math.random() * 0.5 + 0.75);
  }
  update() {
    this.x += this.windOffset;
    this.y += this.speed;
    if (this.y > height) {
      if (Math.random() < 0.3) splashes.push(new Splash(this.x, height - 5));
      this.reset(false);
    }
  }
  draw() {
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + this.windOffset * 3, this.y + this.length);
    ctx.strokeStyle = \`rgba(\${dropColor.r},\${dropColor.g},\${dropColor.b},\${this.opacity})\`;
    ctx.lineWidth = this.thickness;
    ctx.stroke();
  }
}

class Splash {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.life = 20; this.maxLife = 20;
    this.radius = 2 + Math.random() * 4;
  }
  update() { this.life--; }
  draw() {
    const lr = this.life / this.maxLife;
    const r = this.radius * (1 - lr) * 3;
    ctx.beginPath(); ctx.arc(this.x, this.y, r, Math.PI, 0);
    ctx.strokeStyle = \`rgba(\${dropColor.r},\${dropColor.g},\${dropColor.b},\${lr * 0.15})\`;
    ctx.lineWidth = 0.5; ctx.stroke();
  }
}

for (let i = 0; i < numDrops; i++) drops.push(new Drop());

// Background wash
ctx.fillStyle = \`rgb(\${bg.r},\${bg.g},\${bg.b})\`;
ctx.fillRect(0, 0, width, height);

// Misty horizontal bands
for (let i = 0; i < 5; i++) {
  const y = height * (0.3 + i * 0.12);
  const grad = ctx.createLinearGradient(0, y - 40, 0, y + 40);
  grad.addColorStop(0, 'rgba(40,50,70,0)');
  grad.addColorStop(0.5, \`rgba(40,50,70,\${0.03 + intensity * 0.02})\`);
  grad.addColorStop(1, 'rgba(40,50,70,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, y - 40, width, 80);
}

function frame() {
  time++;
  ctx.fillStyle = \`rgba(\${bg.r},\${bg.g},\${bg.b},0.15)\`;
  ctx.fillRect(0, 0, width, height);

  for (const d of drops) { d.update(); d.draw(); }
  for (let i = splashes.length - 1; i >= 0; i--) {
    splashes[i].update(); splashes[i].draw();
    if (splashes[i].life <= 0) splashes.splice(i, 1);
  }

  if (time < 300) requestAnimationFrame(frame);
  else window.__RENDER_DONE = true;
}
frame();
</script></body></html>`;
}


// Style 3: Thermal Gradient — abstract heat map
// Best for: warm/hot days or interesting temperature contrasts
export function thermalGradient(weather) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>* { margin:0; padding:0; } body { background:#000; overflow:hidden; } canvas { display:block; }
#info { position:fixed; bottom:20px; left:20px; color:rgba(255,255,255,0.3); font:11px/1.8 'Courier New',monospace; letter-spacing:1px; text-transform:uppercase; z-index:10; }
#title { position:fixed; top:20px; left:20px; color:rgba(255,255,255,0.15); font:10px 'Courier New',monospace; letter-spacing:3px; text-transform:uppercase; z-index:10; }
</style></head><body>
<div id="title">${weather.location} · ${weather.timeStr} · thermal</div>
<div id="info">${weather.temp}°C feels like ${weather.feelsLike}°C · ${weather.condition}<br>Humidity ${weather.humidity}% · UV ${weather.uvIndex}</div>
<canvas id="c"></canvas>
<script>
const W = ${JSON.stringify(weather)};
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const width = canvas.width = 1920;
const height = canvas.height = 1080;
let time = 0;

// Temperature-driven palette
const warmth = Math.max(0, Math.min(1, (W.temp - 2) / 28));
const humid = W.humidity / 100;

function tempToColor(t) {
  // cold=deep blue → warm=amber/red
  const n = Math.max(0, Math.min(1, (t - 2) / 28));
  return {
    r: Math.floor(20 + n * 220),
    g: Math.floor(40 + n * 120 - Math.abs(n - 0.5) * 80),
    b: Math.floor(180 - n * 160)
  };
}

// Layered noise using sin combinations
function noise(x, y, t) {
  return (
    Math.sin(x * 0.003 + t * 0.02) * Math.cos(y * 0.004 - t * 0.015) +
    Math.sin(x * 0.007 - y * 0.005 + t * 0.03) * 0.5 +
    Math.cos(x * 0.01 + y * 0.008 + t * 0.01) * 0.3 +
    Math.sin((x + y) * 0.002 + t * 0.025) * 0.7
  ) / 2.5;
}

const imageData = ctx.createImageData(width, height);
const buf = imageData.data;

function render() {
  time++;
  const tempBase = W.temp;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      // Local temperature variation
      const n = noise(x, y, time);
      const localTemp = tempBase + n * 8 - 2 + Math.sin(y * 0.003) * 3;
      const c = tempToColor(localTemp);

      // Humidity adds shimmer
      const shimmer = humid * Math.sin(x * 0.02 + y * 0.015 + time * 0.08) * 15;

      const r = Math.max(0, Math.min(255, c.r + shimmer));
      const g = Math.max(0, Math.min(255, c.g + shimmer * 0.5));
      const b = Math.max(0, Math.min(255, c.b - shimmer * 0.3));

      // Write 2x2 block
      for (let dy = 0; dy < 2 && y + dy < height; dy++) {
        for (let dx = 0; dx < 2 && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = 255;
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Overlay: soft horizontal temp bands
  for (let i = 0; i < 8; i++) {
    const by = (W.hourlyTemps[i] || tempBase);
    const yPos = height * (i / 8);
    const c = tempToColor(by);
    ctx.fillStyle = \`rgba(\${c.r},\${c.g},\${c.b},0.04)\`;
    ctx.fillRect(0, yPos, width, height / 8);
  }

  if (time < 120) requestAnimationFrame(render);
  else window.__RENDER_DONE = true;
}
render();
</script></body></html>`;
}


// Style 4: Fog / Minimal — ethereal layers for low visibility / foggy days
// Best for: fog, mist, low visibility, overcast
export function fogLayers(weather) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>* { margin:0; padding:0; } body { background:#0e1118; overflow:hidden; } canvas { display:block; }
#info { position:fixed; bottom:20px; left:20px; color:rgba(255,255,255,0.2); font:11px/1.8 'Courier New',monospace; letter-spacing:1px; text-transform:uppercase; z-index:10; }
#title { position:fixed; top:20px; left:20px; color:rgba(255,255,255,0.12); font:10px 'Courier New',monospace; letter-spacing:3px; text-transform:uppercase; z-index:10; }
</style></head><body>
<div id="title">${weather.location} · ${weather.timeStr} · fog</div>
<div id="info">${weather.temp}°C ${weather.condition} · Visibility ${weather.visibility}km<br>Humidity ${weather.humidity}% · Cloud ${weather.cloudCover}%</div>
<canvas id="c"></canvas>
<script>
const W = ${JSON.stringify(weather)};
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const width = canvas.width = 1920;
const height = canvas.height = 1080;
let time = 0;

const fog = Math.max(0.3, 1 - W.visibility / 10);
const layers = [];

for (let i = 0; i < 12; i++) {
  layers.push({
    y: height * (0.2 + (i / 12) * 0.7),
    speed: 0.1 + Math.random() * 0.3,
    amplitude: 20 + Math.random() * 40,
    freq: 0.001 + Math.random() * 0.003,
    thickness: 60 + Math.random() * 100,
    opacity: 0.02 + fog * 0.03,
    phase: Math.random() * Math.PI * 2,
    hue: Math.floor(200 + Math.random() * 30), // blue-gray
  });
}

// Floating orbs — barely visible
const orbs = [];
for (let i = 0; i < 20; i++) {
  orbs.push({
    x: Math.random() * width, y: Math.random() * height,
    r: 30 + Math.random() * 80,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.2,
    opacity: 0.01 + Math.random() * 0.02 * fog,
  });
}

ctx.fillStyle = '#0e1118';
ctx.fillRect(0, 0, width, height);

function frame() {
  time++;
  ctx.fillStyle = 'rgba(14,17,24,0.03)';
  ctx.fillRect(0, 0, width, height);

  // Draw fog layers
  for (const l of layers) {
    const yOffset = Math.sin(time * l.speed * 0.02 + l.phase) * l.amplitude;
    const grad = ctx.createLinearGradient(0, l.y + yOffset - l.thickness, 0, l.y + yOffset + l.thickness);
    grad.addColorStop(0, 'rgba(180,190,210,0)');
    grad.addColorStop(0.3, \`rgba(180,190,210,\${l.opacity})\`);
    grad.addColorStop(0.7, \`rgba(180,190,210,\${l.opacity * 0.8})\`);
    grad.addColorStop(1, 'rgba(180,190,210,0)');
    ctx.fillStyle = grad;
    
    ctx.beginPath();
    ctx.moveTo(0, l.y + yOffset - l.thickness);
    for (let x = 0; x <= width; x += 20) {
      const wave = Math.sin(x * l.freq + time * 0.01 + l.phase) * l.amplitude * 0.5;
      ctx.lineTo(x, l.y + yOffset + wave);
    }
    ctx.lineTo(width, l.y + yOffset + l.thickness + 100);
    ctx.lineTo(0, l.y + yOffset + l.thickness + 100);
    ctx.closePath();
    ctx.fill();
  }

  // Floating orbs
  for (const o of orbs) {
    o.x += o.vx; o.y += o.vy;
    if (o.x < -o.r) o.x = width + o.r;
    if (o.x > width + o.r) o.x = -o.r;
    if (o.y < -o.r) o.y = height + o.r;
    if (o.y > height + o.r) o.y = -o.r;
    const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
    grad.addColorStop(0, \`rgba(200,210,230,\${o.opacity})\`);
    grad.addColorStop(1, 'rgba(200,210,230,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
  }

  if (time < 400) requestAnimationFrame(frame);
  else window.__RENDER_DONE = true;
}
frame();
</script></body></html>`;
}


// Style 5: Starfield — deep night sky with constellations
// Best for: clear nights
export function starfield(weather) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>* { margin:0; padding:0; } body { background:#030308; overflow:hidden; } canvas { display:block; }
#info { position:fixed; bottom:20px; left:20px; color:rgba(255,255,255,0.25); font:11px/1.8 'Courier New',monospace; letter-spacing:1px; text-transform:uppercase; z-index:10; }
#title { position:fixed; top:20px; left:20px; color:rgba(255,255,255,0.15); font:10px 'Courier New',monospace; letter-spacing:3px; text-transform:uppercase; z-index:10; }
</style></head><body>
<div id="title">${weather.location} · ${weather.timeStr} · night sky</div>
<div id="info">${weather.temp}°C ${weather.condition} · ${weather.moonPhase} ${weather.moonIllum}%<br>Cloud ${weather.cloudCover}% · Wind ${weather.windLabel} ${weather.windSpeed}km/h</div>
<canvas id="c"></canvas>
<script>
const W = ${JSON.stringify(weather)};
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const width = canvas.width = 1920;
const height = canvas.height = 1080;
let time = 0;

const clarity = Math.max(0.1, 1 - W.cloudCover / 100);
const stars = [];
const numStars = Math.floor(clarity * 500 + 100);

for (let i = 0; i < numStars; i++) {
  stars.push({
    x: Math.random() * width, y: Math.random() * height * 0.85,
    size: Math.random() * 2 + 0.2,
    brightness: Math.random() * 0.6 + 0.2,
    twinkleSpeed: Math.random() * 0.04 + 0.01,
    twinklePhase: Math.random() * Math.PI * 2,
    hue: Math.random() < 0.1 ? (Math.random() < 0.5 ? 'warm' : 'cool') : 'white',
  });
}

// Nebula blobs
const nebulae = [];
for (let i = 0; i < 4; i++) {
  nebulae.push({
    x: width * (0.2 + Math.random() * 0.6),
    y: height * (0.15 + Math.random() * 0.5),
    rx: 100 + Math.random() * 200,
    ry: 60 + Math.random() * 120,
    r: Math.random() * 30 + 20,
    g: Math.random() * 20 + 10,
    b: Math.random() * 60 + 40,
    opacity: 0.008 + Math.random() * 0.012 * clarity,
    rotation: Math.random() * Math.PI,
  });
}

// Initial sky gradient
const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
skyGrad.addColorStop(0, 'rgb(3,3,12)');
skyGrad.addColorStop(0.6, 'rgb(5,5,18)');
skyGrad.addColorStop(1, 'rgb(12,10,20)');
ctx.fillStyle = skyGrad;
ctx.fillRect(0, 0, width, height);

// Draw nebulae once
for (const n of nebulae) {
  ctx.save();
  ctx.translate(n.x, n.y);
  ctx.rotate(n.rotation);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, n.rx);
  grad.addColorStop(0, \`rgba(\${n.r},\${n.g},\${n.b},\${n.opacity})\`);
  grad.addColorStop(0.6, \`rgba(\${n.r},\${n.g},\${n.b},\${n.opacity * 0.4})\`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.ellipse(0, 0, n.rx, n.ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Moon
const mx = width * 0.78, my = height * 0.12, mr = 22;
if (W.moonIllum > 5) {
  const glow = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 5);
  glow.addColorStop(0, \`rgba(180,190,220,\${0.02 + W.moonIllum * 0.002})\`);
  glow.addColorStop(1, 'rgba(180,190,220,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(mx, my, mr * 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = \`rgba(200,210,230,\${0.1 + W.moonIllum * 0.005})\`;
  ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
}

function frame() {
  time++;
  // Very subtle fade — keep trails
  ctx.fillStyle = 'rgba(3,3,10,0.02)';
  ctx.fillRect(0, 0, width, height);

  for (const s of stars) {
    s.twinklePhase += s.twinkleSpeed;
    const twinkle = (Math.sin(s.twinklePhase) + 1) / 2;
    const bright = s.brightness * (0.4 + twinkle * 0.6) * clarity;

    let r = 200, g = 210, b = 240;
    if (s.hue === 'warm') { r = 240; g = 190; b = 150; }
    if (s.hue === 'cool') { r = 150; g = 180; b = 255; }

    ctx.fillStyle = \`rgba(\${r},\${g},\${b},\${bright})\`;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.size * (0.7 + twinkle * 0.3), 0, Math.PI * 2); ctx.fill();

    // Subtle glow on bright stars
    if (s.size > 1.2 && bright > 0.4) {
      ctx.fillStyle = \`rgba(\${r},\${g},\${b},\${bright * 0.05})\`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  if (time < 300) requestAnimationFrame(frame);
  else window.__RENDER_DONE = true;
}
frame();
</script></body></html>`;
}


// Choose the best style for current conditions
export function chooseStyle(weather) {
  const { precipMM, cloudCover, visibility, isNight, windSpeed, temp } = weather;

  // Rain
  if (precipMM > 0.5) return { name: 'rain-streaks', fn: rainStreaks };

  // Fog / low visibility
  if (visibility < 5 || (cloudCover > 85 && humidity > 80)) return { name: 'fog-layers', fn: fogLayers };

  // Clear night
  if (isNight && cloudCover < 50) return { name: 'starfield', fn: starfield };

  // Warm/interesting temps
  if (temp > 18 || (temp > 10 && cloudCover < 30)) return { name: 'thermal', fn: thermalGradient };

  // Default: flow fields (good all-rounder)
  return { name: 'flow-fields', fn: flowFields };
}
