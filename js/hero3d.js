// 첫 화면 토스프론트를 3D 모델(img/front3d.glb, 실제 결제 화면을 입힌 것)로 부드럽게 돌린다.
// 처음에는 정지 사진(#spin)으로 빠르게 보여 주고, 페이지 뼈대가 뜨는 대로 3D 를 불러와 같은 자리에서 바꿔 끼운다.
// 3D 를 못 쓰면(동작 줄이기·데이터 절약·느린 회선·WebGL 없음·불러오기 실패) 사진 방식이 그대로 남는다.
const root = document.documentElement;
const hero = document.getElementById('slideHero');
const stage = document.getElementById('heroStage');
const wrap = document.getElementById('spin');
const floatEl = stage && stage.querySelector('.spin-float');

function usable() {
  if (!hero || !stage || !wrap || !floatEl) return false;
  if (!root.classList.contains('motion') || root.classList.contains('reduced')) return false;
  const cn = navigator.connection || {};
  if (cn.saveData || /2g|3g/.test(cn.effectiveType || '')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

// 화이트판(theme-color 가 밝은 색)은 검은 단말기, 네이비판은 흰 단말기
function lightTheme() {
  const m = document.querySelector('meta[name="theme-color"]');
  const h = (m && m.getAttribute('content') || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(h)) return false;
  const n = parseInt(h, 16);
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 160;
}

// 첫 화면 글씨·사진을 먼저 그리게 잠깐(쉬는 틈, 최대 0.8초) 양보한 뒤 3D 를 불러온다
function whenReady() {
  return new Promise((r) => { if (window.requestIdleCallback) requestIdleCallback(() => r(), { timeout: 800 }); else setTimeout(r, 300); });
}

async function start() {
  if (!usable()) return;
  await whenReady();
  if (!root.classList.contains('motion')) return;

  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const dark = lightTheme();

  const canvas = document.createElement('canvas');
  canvas.className = 'spin-3d';
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = dark ? 1.05 : 0.92;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // 조명: 스튜디오 반사광 + 왼쪽 위 주광 + 뒤쪽 푸른 테두리광
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = dark ? 1 : 0.85;
  pm.dispose();
  const key = new THREE.DirectionalLight(0xffffff, dark ? 1.4 : 1.7); key.position.set(-0.45, 0.65, 0.55); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, dark ? 1.1 : 0.9); rim.position.set(0.55, 0.35, -0.6); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x14142a, 0.3));

  const gltf = await new GLTFLoader().loadAsync('img/front3d.glb');
  const model = gltf.scene;
  // 재질: 화면은 조명과 상관없이 또렷하게, 몸체는 판에 맞는 색(흰 단말기 / 검은 단말기)
  const tone = {
    WhitePlastic: dark ? [0x1c1d21, 0.34, 0.45] : [0xd9dbe0, 0.36, 0.3],
    WhiteMatte: dark ? [0x202125, 0.5, 0] : [0xd2d4d9, 0.55, 0],
    GreyTrim: dark ? [0x3a3c42, 0.4, 0.2] : [0xa5a9b1, 0.4, 0.2],
  };
  model.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    if (m.name === 'FrontScreen') {
      const tex = m.emissiveMap || m.map;
      if (tex) tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      o.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
      return;
    }
    const t = tone[m.name];
    if (t) { m.color.setHex(t[0]); m.roughness = t[1]; if ('clearcoat' in m) { m.clearcoat = t[2]; m.clearcoatRoughness = 0.25; } }
  });
  // 받침 아래 작은 고무발은 빼고, 그 높이(4mm)만큼 몸체를 내려 바닥에 바로 세운다
  const feet = [];
  model.traverse((o) => { if (/^Fr_Foot/.test(o.name)) feet.push(o); });
  feet.forEach((o) => o.parent && o.parent.remove(o));
  const tilt = model.getObjectByName('Fr_Tilt');
  if (tilt) tilt.position.y -= 0.004;
  // 받침 바닥 가운데를 회전축으로
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const ctr = box.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(ctr.x, box.min.y, ctr.z));
  const pivot = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);

  // 사진 각도판의 쉬는 각도와 같은 크기·자리(사진 속 단말기 테두리에 픽셀 단위로 맞춘 값). 좁은 화각의 제품 사진 원근
  const FOV = 16, HALF = 0.5706, TY = 0.4736, DX = 0.006;
  const cam = new THREE.PerspectiveCamera(FOV, 1, 0.01, 10);
  const h = size.y;
  model.position.x += DX;
  cam.position.set(0, h * (TY + 0.12), (h * HALF) / Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
  cam.lookAt(0, h * TY, 0);

  floatEl.appendChild(canvas);
  // 레이아웃 크기(clientWidth)로 잰다. getBoundingClientRect 는 등장 모션의 확대·회전이 섞인 작고 기운 상자를 재서 흐리고 찌그러진다
  function fit() {
    const cw = wrap.clientWidth, ch = wrap.clientHeight;
    if (!cw || !ch) return;
    renderer.setSize(cw, ch, false);
    cam.aspect = cw / ch;
    cam.updateProjectionMatrix();
  }
  fit();
  new ResizeObserver(fit).observe(wrap);

  /* 움직임: 쉬는 각도(제목 쪽을 보는 3/4)에서 시작해 정면 쪽으로 천천히 오가며 결제 화면을 보여 주고,
     22초마다 한 바퀴 천천히 돈다. 스크롤로 첫 화면을 벗어날 때는 그만큼 더 돈다. */
  const REST = -0.85, SWAY_C = -0.7, SWAY_A = 0.25, SWAY_T = 10, SPIN_EVERY = 22, SPIN_DUR = 3.2;
  const PHASE = Math.asin(Math.max(-1, Math.min(1, (REST - SWAY_C) / SWAY_A)));
  const easeInOut = (x) => (1 - Math.cos(Math.PI * x)) / 2;
  function yawAt(t) {
    const sway = SWAY_C + SWAY_A * Math.sin((2 * Math.PI * t) / SWAY_T + PHASE);
    const k = Math.floor(t / SPIN_EVERY), u = (t - k * SPIN_EVERY - (SPIN_EVERY - SPIN_DUR)) / SPIN_DUR;
    return sway + 2 * Math.PI * (k + easeInOut(Math.max(0, Math.min(1, u))));
  }
  function heroProgress() {
    const r = hero.getBoundingClientRect();
    return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
  }

  let t = 0, last = 0, raf = 0, inView = true, dead = false;
  function draw() {
    pivot.rotation.y = yawAt(t) + heroProgress() * Math.PI * 2;
    renderer.render(scene, cam);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < 12) return; // 120Hz 화면에서도 초당 60번 정도만 그린다
    t += Math.min(0.05, (now - last) / 1000);
    last = now;
    draw();
  }
  // 단말기가 화면 밖이거나, 탭이 숨었거나, 광고 팝업(html.adp-open)이 떠 있으면 쉰다
  function play() { if (!raf && !dead && inView && !document.hidden && !root.classList.contains('adp-open')) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function pause() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; if (inView) play(); else pause(); }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else play(); });
  new MutationObserver(() => { if (root.classList.contains('adp-open')) pause(); else play(); }).observe(root, { attributes: true, attributeFilter: ['class'] });
  // 앱 전환 등으로 WebGL 이 끊기면 정지 사진으로 돌아간다(사진은 is-3d 동안 숨겨져 있어 그대로 두면 단말기가 사라진다)
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); dead = true; pause(); stage.classList.remove('is-3d'); });

  // 셰이더를 미리 컴파일해 첫 프레임이 제목 등장과 겹쳐 끊기지 않게 한다
  if (renderer.compileAsync) await renderer.compileAsync(scene, cam);
  // 바꿔 끼우기: 사진 각도판을 쉬는 각도로 맞춘 뒤 3D 를 그리고, 사진과 3D 를 겹쳐 서서히 바꾼다
  window.__hero3d = true;
  if (typeof window.__heroRest === 'function') window.__heroRest();
  draw();
  requestAnimationFrame(() => { stage.classList.add('is-3d'); play(); });
}

start().catch(() => {
  // 3D 를 못 띄우면 사진 방식으로 남는다
  window.__hero3d = false;
  const c = stage && stage.querySelector('.spin-3d');
  if (c) c.remove();
  if (stage) stage.classList.remove('is-3d');
});
