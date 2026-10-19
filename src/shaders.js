// shared: softened depth lookup (9 taps) so thin branches/vines follow their surroundings instead of tearing.
// Needs `uniform sampler2D uDepth; uniform float uInv;` declared before it.
export const DEP = /* glsl */`
float dep(vec2 q){
  vec2 r = vec2(.010, .017);
  float d = texture2D(uDepth, q).r * .24;
  d += (texture2D(uDepth, q + vec2(r.x, 0.)).r + texture2D(uDepth, q - vec2(r.x, 0.)).r
      + texture2D(uDepth, q + vec2(0., r.y)).r + texture2D(uDepth, q - vec2(0., r.y)).r) * .12;
  d += (texture2D(uDepth, q + r).r + texture2D(uDepth, q - r).r
      + texture2D(uDepth, q + vec2(r.x, -r.y)).r + texture2D(uDepth, q + vec2(-r.x, r.y)).r) * .07;
  return mix(d, 1. - d, uInv);
}`;

export const quadVert = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

// ---------- the garden (first screen): depth parallax + light shafts + mist + golden portal
export const sceneFrag = /* glsl */`
uniform sampler2D uTex, uDepth;
uniform vec2 uScale, uCam;
uniform float uTime, uDolly, uInv, uAspect, uFade, uIris, uFlash;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
}
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a*noise(p); p *= 2.1; a *= .5; } return v; }
${DEP}

void main(){
  vec2 base = (vUv - .5) * uScale / 1.12 + .5;
  vec2 c = vec2(.5, .42);
  float d = dep(base);

  float z = 1. + uDolly * (.25 + .3 * d);
  vec2 p = c + (base - c) / z + uCam * (d - .45) * .015;

  vec3 c0 = texture2D(uTex, p).rgb;
  float leaf = smoothstep(.02, .14, c0.g - max(c0.r, c0.b));
  float far = 1. - smoothstep(.22, .42, d);
  vec2 w = vec2(noise(p * vec2(3., 2.) + vec2(uTime*.12, uTime*.08)), noise(p * vec2(2., 3.) - uTime*.1)) - .5;
  p += w * .0012 * leaf * far * smoothstep(.15, .7, p.y);

  vec3 col = texture2D(uTex, p).rgb;

  float fl = noise(p * vec2(26., 18.) + vec2(uTime * .5, uTime * .3));
  col *= 1. + (fl - .5) * .14 * leaf;

  vec2 q = vUv - vec2(.62, 1.); q.x *= uAspect;
  float ang = atan(q.y, q.x);
  float rays = pow(.5 + .5 * sin(ang*9. + fbm(vec2(ang*2., uTime*.04))*5. + uTime*.05), 2.);
  rays *= exp(-length(q) * 1.3) * (1. - .85 * smoothstep(.5, .85, d)) * (.85 + .15 * sin(uTime*.5));
  col += vec3(1., .82, .5) * rays * .14;

  float band = smoothstep(.08, .3, vUv.y) * (1. - smoothstep(.34, .55, vUv.y));
  float m = fbm(vec2(base.x*3. + uTime*.025, base.y*7.) + uTime*.01);
  col = mix(col, vec3(1., .93, .78), clamp(m * band * (1. - d*.8) * .45, 0., 1.));

  col += uFlash * vec3(1., .86, .55);

  // golden portal: a ring opens from the centre and reveals the invitation world behind
  float dd = length((vUv - .5) * vec2(uAspect, 1.));
  float R = uIris * 1.9 - .1;
  float alpha = smoothstep(R - .1, R + .1, dd);
  float ring = exp(-pow((dd - R) / .045, 2.)) * step(.001, uIris) * (1. - smoothstep(.8, 1., uIris));
  col += ring * vec3(1., .78, .42);
  gl_FragColor = vec4(col * uFade, max(alpha, ring));
}`;

// ---------- garden petals + fireflies (hidden behind nearer scenery)
export const pVert = /* glsl */`
attribute vec3 aSeed;
uniform sampler2D uDepth;
uniform vec2 uCam, uScale;
uniform float uTime, uPx, uInv, uDolly, uHide;
varying float vA, vRot; varying vec3 vCol;
void main(){
  float z = aSeed.z;
#ifdef PETAL
  float fall = fract(aSeed.y + uTime * (.025 + z*.035));
  float x = aSeed.x*2.4 - 1.2 + sin(uTime*(.5 + z) + aSeed.x*40.)*.07 + fall*.12;
  float y = 1.1 - fall*2.2;
  float life = smoothstep(0., .06, fall) * (1. - smoothstep(.94, 1., fall));
  gl_PointSize = (5. + z*12.) * uPx;
  vRot = uTime*(.8 + z*1.6) + aSeed.x*6.28;
  float k = fract(aSeed.x*7.7);
  vCol = k < .45 ? vec3(1., .64, .78) : k < .75 ? vec3(1., .97, .94) : vec3(1., .72, .25);
#else
  float x = aSeed.x*2.2 - 1.1 + sin(uTime*.3 + z*30.)*.06;
  float y = aSeed.y*1.6 - .75 + cos(uTime*.4 + aSeed.x*30.)*.05;
  float life = .35 + .65*(.5 + .5*sin(uTime*(1. + z*2.) + aSeed.y*60.));
  gl_PointSize = (4. + z*9.) * uPx;
  vRot = 0.; vCol = vec3(1., .88, .5);
#endif
  vec2 pos = vec2(x, y) + uCam * (z - .45) * .03;
  vec2 b = pos * .5 * uScale / 1.12 + .5;
  vec2 uv = vec2(.5, .42) + (b - vec2(.5, .42)) / (1. + uDolly * .4);
  float sd = texture2D(uDepth, uv).r; sd = mix(sd, 1. - sd, uInv);
  vA = life * (1. - smoothstep(z + .04, z + .22, sd)) * (1. - uHide);
  gl_Position = vec4(pos, 0., 1.);
}`;

export const pFrag = /* glsl */`
varying float vA, vRot; varying vec3 vCol;
void main(){
  vec2 p = gl_PointCoord - .5;
#ifdef PETAL
  float cs = cos(vRot), sn = sin(vRot); p = mat2(cs, -sn, sn, cs) * p;
  float a = 1. - smoothstep(.3, .45, length(p * vec2(1., 1.9)));
  gl_FragColor = vec4(vCol * (.75 + .25*abs(sin(vRot*2.))), a * vA);
#else
  float g = pow(1. - smoothstep(0., .5, length(p)), 2.);
  gl_FragColor = vec4(vCol, g * vA);
#endif
}`;

// ---------- the invitation world (peacock-teal background) with LAYERED DEPTH
// near layer = the flute + feather cluster (moves as ONE rigid piece, so the feather never tears)
// far layer  = the swirl pattern (moves less, drifts like smoke, slightly soft)
// NOTE: texture uv has y = 0 at the BOTTOM, so the flute sits at the lower-left (.31, .082)
export const pageFrag = /* glsl */`
uniform sampler2D uPage;
uniform vec2 uPScale, uPAnchor, uCam;
uniform float uTime, uImgAsp, uScroll;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
}
float segd(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)); }

void main(){
  // slow breathing zoom (a little extra crop so the layers can move without showing edges)
  float zoom = 1.12 + .012 * sin(uTime * .15);
  vec2 base = (vUv - .5) * uPScale / zoom + uPAnchor;

  // depth layers: weight 1 around the flute/feather cluster, fading to 0 over the dark pattern
  vec2 A = vec2(.31 * uImgAsp, .082), B = vec2(uImgAsp, .624);
  float near = smoothstep(.46, .22, segd(base * vec2(uImgAsp, 1.), A, B));

  // mouse (or idle drift) parallax + scroll parallax: the near layer moves most, the far layer barely
  vec2 u0 = base + uCam * vec2(.012, .008) * (near - .1) - vec2(0., uScroll * .035 * (near * .85 + .1));

  // the pattern drifts like slow smoke; the near layer stays solid
  vec2 fl = vec2(noise(u0 * 3. + vec2(uTime * .05, uTime * .03)), noise(u0 * 3. + 7.3 - uTime * .04)) - .5;
  vec2 uv = clamp(u0 + fl * .01 * (1. - near), 0., 1.);

  // soft focus on the far layer (cheap depth of field); cover the small corner sparkle with nearby pattern
  float bias = (1. - near) * 1.3;
  float sp = 1. - smoothstep(.035, .06, length((u0 - vec2(.959, .066)) * vec2(uImgAsp, 1.)));
  vec3 col = mix(texture2D(uPage, uv, bias).rgb, texture2D(uPage, uv - vec2(.07, 0.), bias).rgb, sp);

  // iridescent shimmer on the feather eyes and the golden flute
  float eye = smoothstep(.5, .75, col.g) * smoothstep(.55, .8, col.b);
  float gold = smoothstep(.45, .7, col.r) * (1. - smoothstep(.25, .45, col.b));
  float sh = pow(.5 + .5 * sin((uv.x * uImgAsp + uv.y * .9) * 7. - uTime * .7), 8.);
  col += (eye * vec3(.2, .5, .65) + gold * vec3(.55, .4, .12)) * (sh * .6 + .12 * (.5 + .5 * sin(uTime * 1.3)));

  // music ripples spreading from the open end of the flute
  float dq = length((uv - vec2(.31, .082)) * vec2(uImgAsp, 1.));
  for (int i = 0; i < 3; i++){
    float k = fract(uTime * .12 + float(i) / 3.);
    col += vec3(1., .82, .45) * exp(-pow((dq - k * .34) / .007, 2.)) * pow(1. - k, 2.) * .22;
  }
  gl_FragColor = vec4(col, 1.);
}`;

// ---------- golden dust rising on the invitation page, at different depths (near = bigger, moves more)
export const dVert = /* glsl */`
attribute vec3 aSeed;
uniform vec2 uCam;
uniform float uTime, uPx, uDust, uScroll;
varying float vA;
void main(){
  float z = aSeed.z;                                   // 0 far .. 1 near
  float rise = fract(aSeed.y + uTime * (.012 + z * .02));
  float x = aSeed.x * 2.2 - 1.1 + sin(uTime * .3 + z * 40.) * .05 + uCam.x * (z - .3) * .05;
  float y = mod(rise * 2.2 + uScroll * (.1 + z) * .7, 2.2) - 1.1 + uCam.y * (z - .3) * .03;
  float tw = .35 + .65 * (.5 + .5 * sin(uTime * (1. + z * 2.) + aSeed.y * 60.));
  vA = smoothstep(0., .1, rise) * (1. - smoothstep(.85, 1., rise)) * tw * uDust;
  gl_PointSize = (3. + z * 7.) * uPx;
  gl_Position = vec4(x, y, 0., 1.);
}`;
export const dFrag = /* glsl */`
varying float vA;
void main(){
  float g = pow(1. - smoothstep(0., .5, length(gl_PointCoord - .5)), 2.);
  gl_FragColor = vec4(1., .84, .45, g * vA);
}`;