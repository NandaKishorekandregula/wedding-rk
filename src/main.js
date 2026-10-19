import * as THREE from 'three';
import gsap from 'gsap';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import './style.css';
import { quadVert, sceneFrag, pVert, pFrag, pageFrag, dVert, dFrag, DEP } from './shaders.js';
import { renderInvite, setupMusic } from './invite.js';

const DEPTH_INVERT = false;   // if near objects move the wrong way, set to true
const BIRD_YAW = 0;           // if parrots fly sideways/backwards, try Math.PI / 2, -Math.PI / 2 or Math.PI
const isMobile = innerWidth < 768;

// ---- show any error on the screen (so a blank page is never silent)
const show = msg => {
  let e = document.getElementById('err');
  if (!e) { e = document.createElement('pre'); e.id = 'err'; document.body.append(e); }
  e.textContent += msg + '\n';
};
addEventListener('error', e => show('ERROR: ' + e.message));
addEventListener('unhandledrejection', e => show('ERROR: ' + (e.reason && e.reason.message || e.reason)));

history.scrollRestoration = 'manual'; scrollTo(0, 0);
renderInvite();
const startMusic = setupMusic(document.getElementById('music'));
const openBtn = document.getElementById('open');
const introEl = document.getElementById('intro');

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg'), antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
renderer.autoClear = false;
renderer.debug.onShaderError = (gl, program, vs, fs) =>
  show('SHADER ERROR:\n' + (gl.getShaderInfoLog(fs) || gl.getShaderInfoLog(vs) || gl.getProgramInfoLog(program)));

const scene = new THREE.Scene();        // pass 1: invitation world + garden + petals + dust
const birdScene = new THREE.Scene();    // pass 2: parrots (hidden behind trees via the depth map)
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
const FOV = 40, CAM_Z = 10;
const cam3 = new THREE.PerspectiveCamera(FOV, 1, .1, 50);
cam3.position.z = CAM_Z;

const loader = new THREE.TextureLoader();
const flat = () => { const t = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1); t.needsUpdate = true; return t; };
const pageFallback = () => {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 800;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 1200, 800);
  gr.addColorStop(0, '#0a2a35'); gr.addColorStop(1, '#071a33');
  g.fillStyle = gr; g.fillRect(0, 0, 1200, 800);
  return new THREE.CanvasTexture(c);
};

async function init() {
  const gardenFile = isMobile ? '/assets/garden_mobile.webp' : '/assets/garden.webp';
  const depthFile = isMobile ? '/assets/garden_depth_mobile.png' : '/assets/garden_depth.png';

  const [texImg, texDepth, texPage] = await Promise.all([
    loader.loadAsync(gardenFile).catch(() => { throw new Error('Cannot load ' + gardenFile + '. Check the file is in public/assets/.'); }),
    loader.loadAsync(depthFile).catch(() => { show('Note: ' + depthFile + ' not found, so the garden is flat.'); return flat(); }),
    loader.loadAsync('/assets/page_bg.webp').catch(() => { show('Note: public/assets/page_bg.webp not found, using a plain teal background.'); return pageFallback(); }),
  ]);
  texDepth.generateMipmaps = false; texDepth.minFilter = THREE.LinearFilter;

  const U = {
    uTex: { value: texImg }, uDepth: { value: texDepth }, uPage: { value: texPage },
    uTime: { value: 0 }, uFade: { value: 0 }, uDolly: { value: 0 }, uInv: { value: DEPTH_INVERT ? 1 : 0 },
    uIris: { value: 0 }, uHide: { value: 0 }, uFlash: { value: 0 }, uDust: { value: 0 }, uScroll: { value: 0 },
    uCam: { value: new THREE.Vector2() }, uRes: { value: new THREE.Vector2(1, 1) },
    uScale: { value: new THREE.Vector2(1, 1) }, uPScale: { value: new THREE.Vector2(1, 1) }, uPAnchor: { value: new THREE.Vector2(.5, .5) },
    uImgAsp: { value: texPage.image.width / texPage.image.height },
    uAspect: { value: 1 }, uPx: { value: renderer.getPixelRatio() },
  };
  const mesh = (fs, extra) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ uniforms: U, vertexShader: quadVert, fragmentShader: fs, depthTest: false, depthWrite: false, ...extra }));
    m.frustumCulled = false; return m;
  };
  const points = (n, vs, fs, defines, blending) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(n * 3).map(Math.random), 3));
    const p = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: U, vertexShader: vs, fragmentShader: fs, defines, transparent: true, depthTest: false, depthWrite: false, blending,
    }));
    p.frustumCulled = false; return p;
  };

  const page = mesh(pageFrag, {});
  const garden = new THREE.Group();
  garden.add(mesh(sceneFrag, { transparent: true }),
    points(isMobile ? 30 : 60, pVert, pFrag, { PETAL: 1 }, THREE.NormalBlending),
    points(isMobile ? 25 : 45, pVert, pFrag, {}, THREE.AdditiveBlending));
  const dust = points(isMobile ? 28 : 50, dVert, dFrag, {}, THREE.AdditiveBlending);
  scene.add(page, garden, dust);

  // ---- parrots: real animated model; each bird has its own depth "layer" (zn) and hides behind nearer scenery
  const birds = [];
  const halfH = z => Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * (CAM_Z - z);
  const halfW = z => halfH(z) * cam3.aspect;
  const HEAD = 'uniform sampler2D uDepth; uniform vec2 uScale, uCam, uRes; uniform float uDolly, uInv, uZ, uHaze, uHide;\n' + DEP + '\n';
  const BODY = `
    vec2 sUv = gl_FragCoord.xy / uRes;
    vec2 bs = (sUv - .5) * uScale / 1.12 + .5;
    float d0 = dep(bs);
    vec2 pp = vec2(.5, .42) + (bs - vec2(.5, .42)) / (1. + uDolly * (.25 + .3 * d0)) + uCam * (d0 - .45) * .015;
    float vis = 1. - smoothstep(uZ + .03, uZ + .14, dep(pp));
    gl_FragColor.rgb = mix(gl_FragColor.rgb * vec3(1., .96, .88), vec3(1., .9, .7), uHaze);
    gl_FragColor.a *= vis * (1. - uHide);`;
  const birdMat = zn => {
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide });
    m.customProgramCacheKey = () => 'bird';
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, { uDepth: U.uDepth, uScale: U.uScale, uCam: U.uCam, uRes: U.uRes, uDolly: U.uDolly, uInv: U.uInv, uHide: U.uHide,
        uZ: { value: zn }, uHaze: { value: Math.max(.85 - zn, 0) * .55 } });
      sh.fragmentShader = HEAD + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' + BODY);
    };
    return m;
  };
  const spawn = b => {
    b.dir = Math.random() < .5 ? -1 : 1;
    b.y = halfH(b.z) * (-.1 + Math.random() * .85);
    b.root.position.x = -b.dir * (halfW(b.z) + 1 + Math.random() * 6);
    b.root.rotation.y = b.dir > 0 ? 0 : Math.PI;
    b.speed = .9 + Math.random() * .7;
  };
  new GLTFLoader().loadAsync('/assets/models/Parrot.glb').then(g => {
    const box = new THREE.Box3().setFromObject(g.scene), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    const k = .65 / Math.max(size.x, size.y, size.z);
    for (let n = 0; n < (isMobile ? 4 : 6); n++) {
      const zn = .3 + Math.random() * .5;
      const root = new THREE.Group(), m = clone(g.scene), mat = birdMat(zn);
      m.traverse(o => { if (o.isMesh) o.material = mat; });
      m.scale.setScalar(k); m.position.copy(mid).multiplyScalar(-k); m.rotation.y = BIRD_YAW;
      root.add(m); root.position.z = (zn - .55) * 8; birdScene.add(root);
      const mixer = new THREE.AnimationMixer(m), clip = g.animations[0];
      if (clip) { const a = mixer.clipAction(clip).play(); a.time = Math.random() * clip.duration; mixer.timeScale = .8 + Math.random() * .5; }
      const b = { root, mixer, z: root.position.z, ph: Math.random() * 6.28 };
      spawn(b); birds.push(b);
    }
  }).catch(e => show('Parrot model not loaded: ' + e.message));

  const cover = (img, out, a) => { const ia = img.width / img.height; a > ia ? out.set(1, ia / a) : out.set(a / ia, 1); };
  const resize = () => {
    const a = innerWidth / innerHeight;
    renderer.setSize(innerWidth, innerHeight, false);
    renderer.getDrawingBufferSize(U.uRes.value);
    cam.left = -a; cam.right = a; cam.updateProjectionMatrix();
    cam3.aspect = a; cam3.updateProjectionMatrix();
    U.uAspect.value = a; cover(texImg.image, U.uScale.value, a);
    // invitation background: on tall phone screens, keep the window on the feather/flute side
    cover(texPage.image, U.uPScale.value, a);
    const hw = U.uPScale.value.x / (2 * 1.068), pos = a < 1 ? .82 : .5;
    U.uPAnchor.value.set(hw + (1 - 2 * hw) * pos, .5);
    birds.forEach(spawn);
  };
  addEventListener('resize', resize); resize();

  // first screen: the blessing + names fade in over the garden, the button follows
  const introIn = gsap.fromTo(introEl, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1.8, delay: 1.2, ease: 'power2.out' });
  const openIn = gsap.fromTo(openBtn, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.6, delay: 2.2, pointerEvents: 'auto' });

  // ---- Open Invitation: gold flash + a golden portal ring opens and reveals the peacock-teal invitation world
  const D = { base: 0 };
  let opened = false, gardenDone = false;
  openBtn.addEventListener('click', () => {
    if (opened) return; opened = true;
    introIn.kill(); openIn.kill();   // stop the button's fade-in so it can never come back
    startMusic();
    gsap.timeline()
      .to(openBtn, { opacity: 0, y: 12, duration: .5, pointerEvents: 'none' }, 0)
      .set(openBtn, { display: 'none' }, .6)
      .to(introEl, { opacity: 0, y: -14, duration: .9, ease: 'power1.in' }, 0)
      .to(D, { base: .25, duration: 3, ease: 'power2.inOut' }, 0)
      .to(U.uFlash, { value: .8, duration: .5, ease: 'power2.in' }, .9)
      .to(U.uFlash, { value: 0, duration: 1, ease: 'power2.out' }, 1.4)
      .to(U.uIris, { value: 1, duration: 2.6, ease: 'power2.inOut' }, 1.2)
      .to(U.uHide, { value: 1, duration: 1.4 }, 1.8)
      .call(() => { gardenDone = true; garden.visible = false; introEl.style.display = 'none'; }, null, 4)
      .to(U.uDust, { value: 1, duration: 2.5 }, 3)
      .call(() => document.body.classList.add('open'), null, 2.6)
      .fromTo('.hero-in', { opacity: 0 }, { opacity: 1, duration: 1.6, ease: 'power2.out' }, 3)
      .fromTo('.hero-in > *', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 1, stagger: .2, ease: 'power2.out' }, 3.3)
      .call(() => document.documentElement.classList.remove('locked'), null, 4.6);
  });

  let cx = 0, cy = 0, tx = 0, ty = 0, last = 0;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth * 2 - 1; ty = 1 - e.clientY / innerHeight * 2; });

  const t0 = performance.now();
  renderer.setAnimationLoop(ms => {
    const t = ms * .001, dt = Math.min(t - last, .05); last = t;
    U.uTime.value = t;
    U.uFade.value = Math.min((performance.now() - t0) * .0005, 1);

    // camera: mouse + slow idle drift (touch screens use the drift)
    cx += (tx * .6 + Math.sin(t * .17) * .5 - cx) * .05;
    cy += (ty * .4 + Math.sin(t * .23 + 1) * .25 - cy) * .05;
    U.uCam.value.set(cx, cy);
    const sc = Math.min(scrollY / Math.max(document.documentElement.scrollHeight - innerHeight, 1), 1);
    U.uScroll.value += (sc - U.uScroll.value) * .08;

    if (!gardenDone) {
      U.uDolly.value = D.base;
      cam3.zoom = 1 + D.base * .4; cam3.updateProjectionMatrix();
      for (const b of birds) {
        b.mixer.update(dt);
        const r = b.root;
        r.position.x += b.dir * b.speed * dt;
        r.position.y = b.y + Math.sin(t * .9 + b.ph) * .12;
        r.rotation.z = Math.cos(t * .9 + b.ph) * .1;
        if (Math.abs(r.position.x) > halfW(b.z) + 2) spawn(b);
      }
    }

    renderer.clear();
    renderer.render(scene, cam);
    if (!gardenDone) { renderer.clearDepth(); renderer.render(birdScene, cam3); }
  });
}

init().catch(e => show('ERROR: ' + e.message));