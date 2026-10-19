import gsap from 'gsap';
import { config as c } from './config.js';
import { injectFeather, featherSvg } from './peacock.js';

const sep = '<div class="sep"><i></i></div>';
const click = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 9l10 4-4.5 1.8L12.7 19.5z"/><path d="M5.2 5.2l1.4 1.4M3 10h2M10 3v2M14.8 5.2l-1.4 1.4M5.2 14.8l1.4-1.4"/></svg>';

// Krishna's bansuri: the golden flute the two feathers hang from
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

export function renderInvite() {
  injectFeather();

  // first screen text (over the garden). To show the bride first, swap the two names below.
  const intro = document.getElementById('intro');
  
  // Inject Ganesha into the sky so it fades out with the intro screen
  if (!document.getElementById('ganesha-sky')) {
    intro.insertAdjacentHTML('afterbegin', `<img id="ganesha-sky" src="/assets/ganesha.png" alt="Lord Ganesha" aria-hidden="true" />`);
  }

  intro.querySelector('.bless').textContent = c.introBlessing;
  intro.querySelector('.names').innerHTML = `${c.groom.name} <span>&amp;</span> ${c.bride.name}`;

  const el = document.getElementById('invite');
  el.innerHTML = `
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
            <span class="ring"></span>
            <span class="swing">${featherSvg('pfs')}</span>
            <span class="cap"><b>${x.label}</b><small>Click here${click}</small></span>
          </button>`).join('')}
        ${flute}
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
    </section>`;

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .15 });
  el.querySelectorAll('.reveal').forEach(n => io.observe(n));

  // ---- details overlay: a peacock opens its tail, then the panel rises like a curtain
  const ov = document.createElement('div');
  ov.id = 'ov'; ov.hidden = true;
  ov.innerHTML = `<div class="ov-bg"></div><div class="fanwrap"></div>
    <button class="x" type="button" aria-label="Close">✕</button>
    <div class="pwrap"><section class="panel" role="dialog" aria-modal="true" aria-labelledby="pt">
      <p class="kicker">Radhe Radhe</p><h2 id="pt"></h2>${sep}<div class="evs"></div>
    </section></div>`;
  document.body.append(ov);

  const fanwrap = ov.querySelector('.fanwrap'), panel = ov.querySelector('.panel'), xBtn = ov.querySelector('.x');
  const fan = [];
  [[11, 160, 1, 'back'], [10, 136, .78, '']].forEach(([n, spread, k, cls]) => {
    for (let i = 0; i < n; i++) {
      const f = document.createElement('div');
      f.className = 'fi ' + cls + (i % 2 ? ' m' : ''); f.innerHTML = `<i>${featherSvg('')}</i>`;
      fanwrap.append(f);
      fan.push({ el: f, a: (i / (n - 1) - .5) * spread, k });
    }
  });

  let tl, last, sway;
  const stopSway = () => { if (sway) sway.kill(); gsap.set(fanwrap.querySelectorAll('svg'), { rotation: 0 }); };
  const closed = () => {
    stopSway(); ov.hidden = true; document.documentElement.classList.remove('modal');
    if (last) last.focus({ preventScroll: true });
  };
  const close = () => { if (tl && !ov.hidden) { stopSway(); tl.timeScale(1.7).reverse(); } };

  const openDetails = (i, trigger) => {
    const x = c.ceremonies[i];
    panel.querySelector('#pt').textContent = x.title || x.label;
    panel.querySelector('.evs').innerHTML = x.events.map(evItem).join('');
    last = trigger;
    
    const portrait = innerHeight > innerWidth, oy = portrait ? .65 : .66;
    
    ov.classList.toggle('portrait', portrait);
    ov.hidden = false; document.documentElement.classList.add('modal');
    fanwrap.style.top = oy * 100 + '%';
    
    // CHANGED HERE: We allow the fan to grow to 95% of the screen width on phones so it extends past the panel
    const L = Math.min(innerHeight * oy - 24, portrait ? innerWidth * 0.95 : innerWidth * 0.62, 620);
    
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
        { rotation: k => fan[k].a, scale: 1, opacity: 1, duration: 1.4, ease: 'back.out(1.25)', stagger: { each: .045, from: 'center' } }, .15)
      .fromTo(panel,
        { clipPath: `inset(${H}px -60px -60px -60px)`, y: 30 },
        { clipPath: 'inset(-40px -60px -60px -60px)', y: 0, duration: 1.1, ease: 'power3.out' }, .75)
      .fromTo([xBtn, ...panel.querySelectorAll('.kicker, h2, .sep, .evi')],
        { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .6, stagger: .1, ease: 'power2.out' }, 1.15);
    stopSway();   // once the tail is open, every feather breathes gently, each on its own rhythm
    sway = gsap.to(fanwrap.querySelectorAll('svg'), { rotation: k => (k % 2 ? 1 : -1) * (1.2 + (k % 4) * .4), duration: k => 2.4 + (k % 5) * .35,
      ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 1.5, transformOrigin: '50% 0%' });
    gsap.delayedCall(1.3, () => { if (!ov.hidden) xBtn.focus({ preventScroll: true }); });
  };

  el.querySelectorAll('.fth').forEach(b => b.addEventListener('click', () => openDetails(+b.dataset.i, b)));
  xBtn.addEventListener('click', close);
  ov.addEventListener('click', e => { if (!e.target.closest('.panel')) close(); });
  addEventListener('keydown', e => {
    if (ov.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'Tab') { e.preventDefault(); xBtn.focus(); }
  });
}

// returns start(): call it from the Open Invitation click (browsers only allow sound after a click)
export function setupMusic(btn) {
  const a = new Audio(c.music); a.loop = true; a.volume = 0;
  let on = false, failed = false;
  const set = v => {
    on = v; btn.classList.toggle('off', !v); btn.setAttribute('aria-pressed', v);
    if (v) a.play().then(() => gsap.to(a, { volume: .6, duration: 2 })).catch(() => {});
    else gsap.to(a, { volume: 0, duration: .6, onComplete: () => a.pause() });
  };
  a.addEventListener('error', () => { failed = true; btn.hidden = true; });
  btn.addEventListener('click', () => set(!on));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) a.pause(); else if (on) a.play().catch(() => {});
  });
  return () => { if (failed) return; btn.hidden = false; set(true); };
}