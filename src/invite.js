import gsap from 'gsap';
import { config as c } from './config.js';
import { injectFeather, featherSvg } from './peacock.js';

const sep = '<div class="sep"><i></i></div>';
const click = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 9l10 4-4.5 1.8L12.7 19.5z"/><path d="M5.2 5.2l1.4 1.4M3 10h2M10 3v2M14.8 5.2l-1.4 1.4M5.2 14.8l1.4-1.4"/></svg>';

const flute = `<svg class="flute" viewBox="0 0 560 40" style="overflow:visible" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7e2a2"/><stop offset=".3" stop-color="#e2b64e"/><stop offset=".65" stop-color="#c08a28"/><stop offset="1" stop-color="#6f4a12"/></linearGradient>
    <linearGradient id="fk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d38a"/><stop offset=".5" stop-color="#a8741a"/><stop offset="1" stop-color="#5e3d0e"/></linearGradient>
    <linearGradient id="fs" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="fc"><rect x="14" y="10" width="532" height="20" rx="3"/></clipPath>
  </defs>
  <rect x="14" y="10" width="532" height="20" rx="3" fill="url(#fb)"/>
  <rect x="22" y="12.4" width="516" height="2.2" rx="1.1" fill="#fff" opacity=".3"/>
  <g clip-path="url(#fc)"><rect class="shine" x="-90" y="10" width="80" height="20" fill="url(#fs)"/></g>
  <g fill="url(#fk)"><rect x="50" y="8.5" width="7" height="23" rx="2"/><rect x="190" y="8.5" width="7" height="23" rx="2"/><rect x="392" y="8.5" width="7" height="23" rx="2"/><rect x="490" y="8.5" width="7" height="23" rx="2"/></g>
  <rect x="1" y="6.5" width="19" height="27" rx="6" fill="url(#fk)"/><rect x="540" y="6.5" width="19" height="27" rx="6" fill="url(#fk)"/>
  <ellipse cx="10" cy="14" rx="4" ry="2" fill="#fff" opacity=".35"/><ellipse cx="550" cy="14" rx="4" ry="2" fill="#fff" opacity=".35"/>
  <ellipse cx="100" cy="20.5" rx="7.5" ry="4.6" fill="#2b1905"/>
  <g fill="#2b1905" stroke="#f3d38a" stroke-opacity=".55" stroke-width=".8">${[0, 1, 2, 3, 4, 5].map(i => `<ellipse cx="${226 + i * 26}" cy="20.5" rx="5" ry="3.6"/>`).join('')}</g>
  <g fill="#d9a93f">
    <path d="M10 33V38" stroke="#d9a93f" stroke-width="1.6"/><circle cx="10" cy="40" r="2.6"/><path d="M10 42L5.5 60L14.5 60Z" fill="#c58f2a"/>
    <path d="M550 33V38" stroke="#d9a93f" stroke-width="1.6"/><circle cx="550" cy="40" r="2.6"/><path d="M550 42L545.5 60L554.5 60Z" fill="#c58f2a"/>
  </g>
</svg>`;

const person = p => `<article class="card reveal"><h3>${p.name}</h3><p>${p.about}</p><p class="sub">${p.parents}</p></article>`;
const evItem = e => `<div class="evi"><h3>${e.name}</h3><p class="when">${e.date} · ${e.time}</p><p>${e.venue}</p>${e.note ? `<p class="sub">${e.note}</p>` : ''}</div>`;

// ---- GLOBAL SINGLETON AUDIO ENGINE (Fixes Interruption & Overlap) ----
let bgAudio = null;

export function startMusic() {
  if (!bgAudio) {
    bgAudio = new Audio(c.music);
    bgAudio.loop = true;
    bgAudio.volume = 0;
  }
  bgAudio.play().then(() => {
    gsap.to(bgAudio, { volume: 0.6, duration: 2 });
    const btn = document.getElementById('music');
    if (btn) {
      btn.classList.remove('off');
      btn.setAttribute('aria-pressed', 'true');
    }
  }).catch(() => console.warn("Autoplay blocked. Awaiting user interaction."));
}

export function setupMusic(btn) {
  if (!btn) return () => {};
  if (!bgAudio) {
    bgAudio = new Audio(c.music);
    bgAudio.loop = true;
    bgAudio.volume = 0;
  }
  
  const a = bgAudio;
  let on = false, failed = false;
  
  const set = v => {
    on = v; 
    btn.classList.toggle('off', !v); 
    btn.setAttribute('aria-pressed', v);
    if (v) a.play().then(() => gsap.to(a, { volume: 0.6, duration: 1 })).catch(() => {});
    else gsap.to(a, { volume: 0, duration: 0.5, onComplete: () => a.pause() });
  };
  
  a.addEventListener('error', () => { failed = true; btn.hidden = true; });
  
  // Overwrite onClick to prevent double bindings
  btn.onclick = () => set(!on);
  
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) a.pause(); 
    else if (on) a.play().catch(() => {});
  });
  
  return () => { 
    if (failed) return; 
    btn.hidden = false; 
    set(true); 
  };
}

// ---- SANGEET NOTES ENGINE (Both Ends to Empty Spaces) ----
function initSangeetNotes(canvas, fluteBox) {
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animId = null;
  let active = false;
  let tick = 0;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resize);
  resize();

  const symbols = ['♪', '♫', '♬', '♩', '✧'];
  const colors = ['#f3d38a', '#d9a93f', '#f6efdc', '#ffb142'];

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    tick++;

    if (tick % 8 === 0 && particles.length < 80 && fluteBox) {
      const rect = fluteBox.getBoundingClientRect();
      const isLeftEnd = Math.random() > 0.5;
      const holeOffset = isLeftEnd ? (0.05 + Math.random() * 0.15) : (0.80 + Math.random() * 0.15); 
      
      const originX = rect.left + (rect.width * holeOffset);
      const originY = rect.top + (rect.height * 0.5);

      const vx = isLeftEnd ? -(1.5 + Math.random() * 2.5) : (1.5 + Math.random() * 2.5);

      particles.push({
        x: originX,
        y: originY,
        vx: vx,
        vy: -(1.5 + Math.random() * 2.5),
        swayOffset: Math.random() * Math.PI * 2, 
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 16 + Math.random() * 26,
        alpha: 0,
        targetAlpha: 0.4 + Math.random() * 0.4,
        rotation: (Math.random() - 0.5) * 0.6,
        vRot: (Math.random() - 0.5) * 0.02,
        life: 0,
        maxLife: 350 + Math.random() * 150
      });
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.x += Math.sin(tick * 0.03 + p.swayOffset) * 0.8;
      p.rotation += p.vRot;
      p.life++;

      if (p.life < 30 && p.alpha < p.targetAlpha) p.alpha += 0.02;
      if (p.life > p.maxLife - 50) p.alpha -= 0.02;
      if (p.alpha <= 0 && p.life > 30) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.font = `${p.size}px 'Cormorant Garamond', serif`;
      ctx.shadowBlur = 12;
      ctx.shadowColor = p.color;
      ctx.fillText(p.symbol, 0, 0);
      ctx.restore();
    }
    if (active) animId = requestAnimationFrame(loop);
  }

  return {
    start: () => { cancelAnimationFrame(animId); active = true; resize(); particles = []; tick = 0; loop(); },
    stop: () => { active = false; cancelAnimationFrame(animId); ctx.clearRect(0, 0, canvas.width, canvas.height); particles = []; }
  };
}

// ---- PURE HALDI SPLASH ENGINE (No Bowls) ----
function initHaldiEngine(canvas) {
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animId = null;
  let active = false;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resize);
  resize();

  const colors = ['#e59807', '#f1a60e', '#d17e02', '#c06e00', '#f6b825', '#db8c04', '#eb9e0c'];

  function createParticles() {
    particles = [];
    const isMobile = window.innerWidth < 768;
    const powderCount = isMobile ? 320 : 600;
    const originX = 0;
    const originY = window.innerHeight;

    for (let i = 0; i < powderCount; i++) {
      const angle = (-10 - Math.random() * 72) * (Math.PI / 180);
      const blastPower = 12 + Math.random() * 34;
      const isClump = Math.random() < 0.12;

      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * blastPower * (0.8 + Math.random() * 0.5),
        vy: Math.sin(angle) * blastPower * (0.8 + Math.random() * 0.5),
        w: isClump ? 3 + Math.random() * 2.5 : 1 + Math.random() * 1.6,
        h: isClump ? 2 + Math.random() * 2 : 0.8 + Math.random() * 1.3,
        isClump,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.95,
        targetAlpha: isClump ? 0.35 + Math.random() * 0.2 : 0.45 + Math.random() * 0.35,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.15,
        drag: isClump ? 0.93 : 0.915,
        gravity: 0.22 + Math.random() * 0.22,
        falling: false,
        fallSpeed: 0.5 + Math.random() * 1.2,
        swaySpeed: 0.02 + Math.random() * 0.03,
        swayAmp: 0.4 + Math.random() * 0.8,
        swayOffset: Math.random() * Math.PI * 2
      });
    }
  }

  let tick = 0;
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let p of particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.isClump) {
        ctx.beginPath();
        ctx.moveTo(-p.w / 2, -p.h / 2);
        ctx.lineTo(p.w / 2, -p.h / 3);
        ctx.lineTo(p.w / 3, p.h / 2);
        ctx.lineTo(-p.w / 3, p.h / 3);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }
  }

  function loop() {
    tick++;
    for (let p of particles) {
      if (!p.falling) {
        p.x += p.vx; p.y += p.vy;
        p.vx *= p.drag; p.vy *= p.drag; p.vy += p.gravity;
        p.rotation += p.vRot;
        if (p.alpha > p.targetAlpha) p.alpha -= 0.008;
        if (Math.abs(p.vx) < 0.3 && p.vy >= 0) { p.falling = true; p.alpha = p.targetAlpha; }
      } else {
        p.y += p.fallSpeed;
        p.x += Math.sin(tick * p.swaySpeed + p.swayOffset) * p.swayAmp;
        p.rotation += p.vRot * 0.3;
        if (p.y > canvas.height + 20) { p.y = -15; p.x = Math.random() * canvas.width; }
      }
    }
    render();
    if (active) animId = requestAnimationFrame(loop);
  }

  return {
    spray: () => { cancelAnimationFrame(animId); active = true; resize(); createParticles(); loop(); },
    stop: () => { active = false; cancelAnimationFrame(animId); ctx.clearRect(0, 0, canvas.width, canvas.height); particles = []; }
  };
}

export function renderInvite() {
  injectFeather();

  const intro = document.getElementById('intro');
  if (!document.getElementById('ganesha-sky')) {
    intro.insertAdjacentHTML('afterbegin', `<img id="ganesha-sky" src="/assets/ganesha.png" alt="Lord Ganesha" aria-hidden="true" />`);
  }

  intro.querySelector('.bless').textContent = c.introBlessing;
  intro.querySelector('.names').innerHTML = `${c.groom.name} <span>&amp;</span> ${c.bride.name}`;

  const el = document.getElementById('invite');
  el.innerHTML = `
    <div id="magic-layer" aria-hidden="true"></div>
    <section class="hero">
      <div class="hero-in">
        <p class="kicker">Radhe Radhe</p>
        <p class="line">${c.heroBlessing}</p>
        ${sep}
        <h1>${c.groom.name} <span>&amp;</span> ${c.bride.name}</h1>
        <p class="date">${c.date}</p>
      </div>
    </section>
    <section class="blk">
      <div class="card wide reveal"><p class="shloka">${c.blessing}</p>${sep}<p>${c.message}</p></div>
    </section>
    <section class="blk">
      <h2 class="reveal">Meet the Couple</h2>${sep}
      <div class="grid">${person(c.groom)}${person(c.bride)}</div>
    </section>
    <section class="blk">
      <h2 class="reveal">Celebrations</h2>${sep}
      <div class="feathers reveal">
        ${c.ceremonies.map((x, i) => `
          <button class="fth" type="button" data-i="${i}" aria-haspopup="dialog" aria-label="Open ${x.label} details">
            <span class="swing">${featherSvg('pfs')}</span>
            <span class="cap"><b>${x.label}</b><small>Click here${click}</small></span>
          </button>`).join('')}
        ${flute}
      </div>
    </section>
    <section class="blk gallery-section reveal">
      <p class="kicker">Radhe Radhe</p>
      <h2>Moments of Love</h2>
      ${sep}
      <div class="gallery-wrapper">
        <div class="gallery-frame">
          ${c.gallery.map((item, idx) => `
            <div class="gallery-slide ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
              <img src="${item.src}" alt="Pre-wedding photo" loading="lazy" />
            </div>
          `).join('')}
        </div>
        <button class="g-btn prev" type="button" aria-label="Previous photo">‹</button>
        <button class="g-btn next" type="button" aria-label="Next photo">›</button>
        <div class="g-dots">
          ${c.gallery.map((_, idx) => `
            <span class="g-dot ${idx === 0 ? 'active' : ''}" data-idx="${idx}"></span>
          `).join('')}
        </div>
      </div>
    </section>
    <section class="blk">
      <div class="card wide reveal">
        <h2>The Wedding Day</h2>
        ${c.mainEvents.map(e => `<p><span class="when">${e.name}</span> · ${e.date} ·${e.time}</p>`).join('')}
        ${sep}
        <p class="when">${c.venue.name}</p><p>${c.venue.address}</p>
        <a class="btn" href="${c.venue.mapUrl}" target="_blank" rel="noopener">Open in Google Maps</a>
      </div>
    </section>
    <section class="blk foot">
      ${sep}<p class="reveal">${c.families}</p><p class="kicker reveal">Radhe Radhe</p>
    </section>
    
    <button id="music" class="off" type="button" aria-label="Toggle music" title="Play Music">♫</button>
  `;

  // Attach safe singleton audio toggle
  const musicBtn = el.querySelector('#music');
  if (musicBtn) setupMusic(musicBtn);

  // Slideshow
  const slides = el.querySelectorAll('.gallery-slide');
  const dots = el.querySelectorAll('.g-dot');
  let currentSlide = 0;
  let slideInterval;

  function showSlide(index) {
    if (!slides.length) return;
    const nextIndex = (index + slides.length) % slides.length;
    gsap.to(slides[currentSlide], { opacity: 0, duration: 0.8, ease: 'power2.inOut' });
    slides[currentSlide].classList.remove('active');
    dots[currentSlide]?.classList.remove('active');
    gsap.to(slides[nextIndex], { opacity: 1, duration: 0.8, ease: 'power2.inOut' });
    slides[nextIndex].classList.add('active');
    dots[nextIndex]?.classList.add('active');
    currentSlide = nextIndex;
  }

  const startAutoSlide = () => { slideInterval = setInterval(() => showSlide(currentSlide + 1), 4500); };
  const stopAutoSlide = () => clearInterval(slideInterval);

  el.querySelector('.g-btn.next')?.addEventListener('click', () => { stopAutoSlide(); showSlide(currentSlide + 1); startAutoSlide(); });
  el.querySelector('.g-btn.prev')?.addEventListener('click', () => { stopAutoSlide(); showSlide(currentSlide - 1); startAutoSlide(); });
  dots.forEach((dot, idx) => { dot.addEventListener('click', () => { stopAutoSlide(); showSlide(idx); startAutoSlide(); }); });
  startAutoSlide();

  const magicLayer = el.querySelector('#magic-layer');
  const floaters = ['/assets/feather_small.png', '/assets/lotus.png'];
  for (let i = 0; i < 16; i++) {
    const img = document.createElement('img');
    img.src = floaters[i % 2];
    img.className = 'magic-item';
    img.style.left = (Math.random() * 100) + 'vw';
    img.style.width = (16 + Math.random() * 16) + 'px';
    img.style.animationDuration = (16 + Math.random() * 14) + 's';
    img.style.animationDelay = (Math.random() * -30) + 's';
    img.style.setProperty('--sway', (Math.random() > 0.5 ? 1 : -1) * (15 + Math.random() * 25) + 'deg');
    magicLayer.appendChild(img);
  }

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .15 });
  el.querySelectorAll('.reveal').forEach(n => io.observe(n));

  // Modal Dialog
  const ov = document.createElement('div');
  ov.id = 'ov'; ov.hidden = true;
  ov.innerHTML = `
    <div class="ov-bg"></div>
    <canvas id="haldi-canvas"></canvas>
    <canvas id="sangeet-canvas"></canvas>
    <div class="fanwrap"></div>
    <div class="sangeet-wrap" style="display:none;">
      <div class="sangeet-sway">
        <div class="sangeet-strings"><div class="sangeet-string"></div><div class="sangeet-string"></div></div>
        <div class="sangeet-flute-box">${flute}</div>
      </div>
    </div>
    <div class="pwrap"><section class="panel" role="dialog" aria-modal="true" aria-labelledby="pt">
      <p class="kicker">Radhe Radhe</p><h2 id="pt"></h2>${sep}<div class="evs"></div>
    </section></div>
    <button class="x" type="button" aria-label="Close">✕</button>`;
  document.body.append(ov);

  const haldiEngine = initHaldiEngine(ov.querySelector('#haldi-canvas'));
  const sangeetEngine = initSangeetNotes(ov.querySelector('#sangeet-canvas'), ov.querySelector('.sangeet-flute-box'));
  const fanwrap = ov.querySelector('.fanwrap'), panel = ov.querySelector('.panel'), xBtn = ov.querySelector('.x');
  const sangeetWrap = ov.querySelector('.sangeet-wrap'), sangeetSwayEl = ov.querySelector('.sangeet-sway');
  let sangeetSwayAnim;
  const fan = [];
  
  [[15, 210, 1, 'back'], [13, 175, .84, '']].forEach(([n, spread, k, cls]) => {
    for (let i = 0; i < n; i++) {
      const f = document.createElement('div');
      f.className = 'fi ' + cls + (i % 2 ? ' m' : ''); f.innerHTML = `<i>${featherSvg('')}</i>`;
      fanwrap.append(f);
      fan.push({ el: f, a: (i / (n - 1) - .5) * spread, k });
    }
  });

  let tl, last, sway;
  const stopSway = () => { 
    if (sway) sway.kill(); 
    if (sangeetSwayAnim) sangeetSwayAnim.kill();
    gsap.set(fanwrap.querySelectorAll('svg'), { rotation: 0 }); 
  };
  const closed = () => {
    stopSway(); haldiEngine.stop(); sangeetEngine.stop();
    ov.hidden = true; document.documentElement.classList.remove('modal');
    if (last) last.focus({ preventScroll: true });
  };
  const close = () => { if (tl && !ov.hidden) { stopSway(); tl.timeScale(1.7).reverse(); } };

  const openDetails = (i, trigger) => {
    const x = c.ceremonies[i];
    panel.querySelector('#pt').textContent = x.title || x.label;
    panel.querySelector('.evs').innerHTML = x.events.map(evItem).join('');
    last = trigger;
    
    const isHaldi = (x.label && x.label.toLowerCase().includes('haldi')) || (x.title && x.title.toLowerCase().includes('haldi'));
    const isSangeet = (x.label && x.label.toLowerCase().includes('sangeet')) || (x.title && x.title.toLowerCase().includes('sangeet'));
    
    // Display flute for BOTH Sangeet and Haldi
    const showFlute = isSangeet || isHaldi;

    const portrait = innerHeight > innerWidth;
    ov.classList.toggle('portrait', portrait);
    ov.hidden = false; document.documentElement.classList.add('modal');

    sangeetWrap.style.display = showFlute ? 'block' : 'none';

    const rect = panel.getBoundingClientRect();
    const archCenterY = rect.top + (rect.width * 0.35);
    fanwrap.style.top = `${archCenterY}px`;
    
    const L = Math.max(rect.width * 0.9, portrait ? innerWidth * 0.75 : 540);
    fan.forEach(f => {
      const h = L * f.k, w = h / 2;
      Object.assign(f.el.style, { height: h + 'px', width: w + 'px', marginLeft: -w / 2 + 'px' });
    });
    const H = panel.offsetHeight;

    if (tl) tl.kill();
    tl = gsap.timeline({ onReverseComplete: closed });
    tl.fromTo('.ov-bg', { opacity: 0 }, { opacity: 1, duration: .5 }, 0)
      .fromTo(fan.map(f => f.el),
        { rotation: 0, scale: .55, opacity: 0, transformOrigin: '50% 100%' },
        { rotation: k => fan[k].a, scale: 1, opacity: 1, duration: 1.4, ease: 'back.out(1.25)', stagger: { each: .035, from: 'center' } }, .15)
      .fromTo(panel,
        { clipPath: `inset(${H}px -60px -60px -60px)`, y: 30 },
        { clipPath: 'inset(-40px -60px -60px -60px)', y: 0, duration: 1.1, ease: 'power3.out' }, .75)
      .fromTo([xBtn, ...panel.querySelectorAll('.kicker, h2, .sep, .evi')],
        { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .6, stagger: .1, ease: 'power2.out' }, 1.15);

    if (isHaldi) gsap.delayedCall(0.2, () => haldiEngine.spray());
    
    if (showFlute) {
      tl.fromTo(sangeetWrap, { opacity: 0, y: '30vh' }, { opacity: 1, y: '0vh', duration: 1.6, ease: 'back.out(1.2)' }, 0.5);
      gsap.delayedCall(2.1, () => {
        sangeetSwayAnim = gsap.to(sangeetSwayEl, { y: -10, duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      });
      gsap.delayedCall(1.2, () => sangeetEngine.start());
    }
    
    stopSway();  
    sway = gsap.to(fanwrap.querySelectorAll('svg'), { 
      rotation: k => (k % 2 ? 1 : -1) * (1.2 + (k % 4) * .4), duration: k => 2.4 + (k % 5) * .35,
      ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 1.5, transformOrigin: '50% 0%' 
    });
    gsap.delayedCall(1.3, () => { if (!ov.hidden) xBtn.focus({ preventScroll: true }); });
  };

  el.querySelectorAll('.fth').forEach(b => b.addEventListener('click', () => openDetails(+b.dataset.i, b)));
  xBtn.addEventListener('click', close);
  ov.addEventListener('click', e => { if (!e.target.closest('.panel')) close(); });
  addEventListener('keydown', e => { if (ov.hidden) return; if (e.key === 'Escape') close(); else if (e.key === 'Tab') { e.preventDefault(); xBtn.focus(); }});
}