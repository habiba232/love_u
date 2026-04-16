import * as THREE from "https://unpkg.com/three@0.132.2/build/three.module.js?module";

const canvas = document.querySelector("canvas.webgl");
const scene = new THREE.Scene();

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

function getResponsiveConfig() {
  const isMobile = window.innerWidth <= 767;
  const isSmallMobile = window.innerWidth <= 430;

  return {
    isMobile,
    isSmallMobile,
    particleCount: isMobile ? 10000 : 18000,
    particleSize: isMobile ? 0.028 : 0.022,
    heartScale: isMobile ? 0.075 : 0.088,
    heartDepth: isMobile ? 0.05 : 0.08,
    cameraY: isMobile ? 0.2 : 0.4, // رفعت القلب شوية
    cameraZ: isMobile ? 6.6 : 7.2,
    finalCameraZ: isMobile ? 5.9 : 5.7,
    finalCameraY: isMobile ? 0.15 : 0.18,
    heartMoveX: isMobile ? 0 : 2.15, // 👈 في النص
    orbitRadius: isMobile ? 6.2 : 7.0,
  };
}

let responsive = getResponsiveConfig();

const camera = new THREE.PerspectiveCamera(
  responsive.isMobile ? 72 : 65,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(0, responsive.cameraY, responsive.cameraZ);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);

const parameters = {
  get count() {
    return responsive.particleCount;
  },
  get size() {
    return responsive.particleSize;
  },
  radius: 4.8,
  branches: 5,
  spin: 1.25,
  randomness: 0.38,
  randomnessPower: 3,
  insideColor: "#ffd1b0",
  outsideColor: "#5f7dff",
  heartColor: "#ff7eb6",
  get heartScale() {
    return responsive.heartScale;
  },
  get heartDepth() {
    return responsive.heartDepth;
  },
};

let geometry;
let material;
let points;

let galaxyPositions;
let heartPositions;
let galaxyColors;
let heartColors;

const clock = new THREE.Clock();

const timings = {
  galaxyOnly: 3.0,
  morphDuration: 4.2,
  uiStartDelay: 0.4,
  uiMoveDuration: 1.6,
};

let morphFinished = false;

// UI
const overlay = document.createElement("div");
overlay.className = "overlay-ui";

const terminal = document.createElement("div");
terminal.className = "terminal-box";
terminal.innerHTML = `
  <div class="terminal-topbar">
    <span class="dot red"></span>
    <span class="dot yellow"></span>
    <span class="dot green"></span>
    <span class="terminal-title">terminal</span>
  </div>
  <div class="terminal-body">
    <span id="terminalText"></span><span class="cursor">|</span>
  </div>
`;

const actionButton = document.createElement("a");
actionButton.className = "next-button";
actionButton.href = "./message.html";
actionButton.textContent = "Open Message";

document.body.appendChild(overlay);
overlay.appendChild(terminal);
overlay.appendChild(actionButton);

const terminalTextEl = document.getElementById("terminalText");

const terminalLines = [
  "> بصي يا حبيبة يمكن تحسيني غلس",
  "> بس معرفتش ابطل افكر فيكي",
  '> و بصراحة الي جوايا لسه مخلصش"',
];

let typingStarted = false;
let typingFinished = false;
let typingLineIndex = 0;
let typingCharIndex = 0;
let typingAccumulator = 0;
const typingSpeed = 12;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function easeInOutQuint(t) {
  return t < 0.5
    ? 16 * t * t * t * t * t
    : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

function heartPoint(t, scale = 1) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y =
    13 * Math.cos(t) -
    5 * Math.cos(2 * t) -
    2 * Math.cos(3 * t) -
    Math.cos(4 * t);

  return { x: x * scale, y: y * scale };
}

function createGalaxyData() {
  const positions = new Float32Array(parameters.count * 3);
  const colors = new Float32Array(parameters.count * 3);

  const colorInside = new THREE.Color(parameters.insideColor);
  const colorOutside = new THREE.Color(parameters.outsideColor);

  for (let i = 0; i < parameters.count; i++) {
    const i3 = i * 3;
    const radius = Math.random() * parameters.radius;
    const branchAngle =
      ((i % parameters.branches) / parameters.branches) * Math.PI * 2;
    const spinAngle = radius * parameters.spin;

    positions[i3] = Math.cos(branchAngle + spinAngle) * radius;
    positions[i3 + 1] = 0;
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius;

    const mixedColor = colorInside.clone();
    mixedColor.lerp(colorOutside, radius / parameters.radius);

    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;
  }

  return { positions, colors };
}

function createHeartData() {
  const positions = new Float32Array(parameters.count * 3);
  const colors = new Float32Array(parameters.count * 3);
  const heartColor = new THREE.Color(parameters.heartColor);

  for (let i = 0; i < parameters.count; i++) {
    const i3 = i * 3;
    const t = (i / parameters.count) * Math.PI * 2;
    const p = heartPoint(t, parameters.heartScale);

    positions[i3] = p.x;
    positions[i3 + 1] = p.y;
    positions[i3 + 2] = 0;

    colors[i3] = heartColor.r;
    colors[i3 + 1] = heartColor.g;
    colors[i3 + 2] = heartColor.b;
  }

  return { positions, colors };
}

function initParticles() {
  const galaxyData = createGalaxyData();
  const heartData = createHeartData();

  galaxyPositions = galaxyData.positions;
  galaxyColors = galaxyData.colors;
  heartPositions = heartData.positions;
  heartColors = heartData.colors;

  geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(galaxyPositions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(galaxyColors, 3));

  material = new THREE.PointsMaterial({
    size: parameters.size,
    vertexColors: true,
  });

  points = new THREE.Points(geometry, material);
  scene.add(points);
}

initParticles();

function tick() {
  const elapsedTime = clock.getElapsedTime();

  const positionArray = geometry.attributes.position.array;
  const t = Math.min(elapsedTime / 4, 1);

  for (let i = 0; i < parameters.count * 3; i++) {
    positionArray[i] =
      galaxyPositions[i] * (1 - t) + heartPositions[i] * t;
  }

  geometry.attributes.position.needsUpdate = true;

  points.position.x = responsive.heartMoveX;

  // 👇 هنا التعديل (يبص في النص على الموبايل)
  camera.lookAt(
    points.position.x * (responsive.isMobile ? 0 : 0.2),
    0,
    0
  );

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

tick();
