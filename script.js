import * as THREE from "https://unpkg.com/three@0.132.2/build/three.module.js?module";

const canvas = document.querySelector("canvas.webgl");
const scene = new THREE.Scene();

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

function getResponsiveConfig() {
  const isMobile = window.innerWidth <= 767;

  return {
    isMobile,
    particleCount: isMobile ? 9500 : 18000,
    particleSize: isMobile ? 0.027 : 0.022,
    heartScale: isMobile ? 0.075 : 0.088,
    heartDepth: isMobile ? 0.05 : 0.08,
    cameraY: isMobile ? 0.18 : 0.4,
    cameraZ: isMobile ? 6.6 : 7.2,
    finalCameraZ: isMobile ? 5.9 : 5.7,
    finalCameraY: isMobile ? 0.22 : 0.18,
    heartMoveX: isMobile ? 0.78 : 2.15,
    orbitRadius: isMobile ? 6.0 : 7.0,
    fov: isMobile ? 72 : 65,
  };
}

let responsive = getResponsiveConfig();

const camera = new THREE.PerspectiveCamera(
  responsive.fov,
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

// -------------------- UI --------------------
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
  "> وبصراحة اللي جوايا لسه مخلصش",
];

let typingStarted = false;
let typingFinished = false;
let typingLineIndex = 0;
let typingCharIndex = 0;
let typingAccumulator = 0;
const typingSpeed = 8;

// -------------------- Helpers --------------------
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

  return {
    x: x * scale,
    y: y * scale,
  };
}

function placeActionButton() {
  const isMobile = window.innerWidth <= 767;

  if (!terminal.classList.contains("show")) return;

  const terminalRect = terminal.getBoundingClientRect();
  const buttonRect = actionButton.getBoundingClientRect();
  const buttonWidth = buttonRect.width || 150;

  if (isMobile) {
    const left = (window.innerWidth - buttonWidth) / 2;
    const top = Math.max(14, terminalRect.top - 74);

    actionButton.style.left = `${left}px`;
    actionButton.style.top = `${top}px`;
    actionButton.style.right = "auto";
    actionButton.style.bottom = "auto";
  } else {
    actionButton.style.left = "auto";
    actionButton.style.top = "70%";
    actionButton.style.right = "12%";
    actionButton.style.bottom = "auto";
  }
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

    const randomX =
      Math.pow(Math.random(), parameters.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness *
      radius;

    const randomY =
      Math.pow(Math.random(), parameters.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness *
      radius *
      0.22;

    const randomZ =
      Math.pow(Math.random(), parameters.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness *
      radius;

    positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
    positions[i3 + 1] = randomY;
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

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

    const edgeSpread = (Math.random() - 0.5) * 0.022;
    const depth = (Math.random() - 0.5) * parameters.heartDepth;

    positions[i3] =
      p.x + Math.cos(t) * edgeSpread + (Math.random() - 0.5) * 0.008;

    positions[i3 + 1] =
      p.y + Math.sin(t) * edgeSpread + (Math.random() - 0.5) * 0.008;

    positions[i3 + 2] = depth;

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
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(galaxyPositions.slice(), 3)
  );
  geometry.setAttribute(
    "color",
    new THREE.BufferAttribute(galaxyColors.slice(), 3)
  );

  material = new THREE.PointsMaterial({
    size: parameters.size,
    sizeAttenuation: true,
    depthWrite: true,
    transparent: false,
    vertexColors: true,
    blending: THREE.NormalBlending,
  });

  points = new THREE.Points(geometry, material);
  scene.add(points);
}

initParticles();

function rebuildSceneForResize() {
  const oldX = points ? points.position.x : 0;

  if (points) {
    scene.remove(points);
    geometry.dispose();
    material.dispose();
  }

  responsive = getResponsiveConfig();

  camera.fov = responsive.fov;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  initParticles();
  points.position.x = oldX;
}

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  rebuildSceneForResize();

  setTimeout(placeActionButton, 60);
});

function updateTyping(deltaTime) {
  if (!typingStarted || typingFinished) return;

  typingAccumulator += deltaTime;

  while (typingAccumulator >= 1 / typingSpeed) {
    typingAccumulator -= 1 / typingSpeed;

    if (typingLineIndex >= terminalLines.length) {
      typingFinished = true;
      actionButton.classList.add("show");
      placeActionButton();
      break;
    }

    const currentLine = terminalLines[typingLineIndex];

    if (typingCharIndex < currentLine.length) {
      typingCharIndex++;
    } else {
      typingLineIndex++;
      typingCharIndex = 0;
    }

    let output = "";
    for (let i = 0; i < typingLineIndex; i++) {
      output += terminalLines[i] + "\n";
    }

    if (typingLineIndex < terminalLines.length) {
      output += terminalLines[typingLineIndex].slice(0, typingCharIndex);
    }

    terminalTextEl.textContent = output;
  }
}

function tick() {
  const deltaTime = clock.getDelta();
  const elapsedTime = clock.elapsedTime;

  const rawMorphProgress =
    (elapsedTime - timings.galaxyOnly) / timings.morphDuration;
  const morphProgress = clamp(rawMorphProgress, 0, 1);
  const easedMorph = easeInOutQuint(morphProgress);
  const colorMorph = smoothstep(morphProgress);

  if (!morphFinished) {
    const positionArray = geometry.attributes.position.array;
    const colorArray = geometry.attributes.color.array;

    if (elapsedTime < timings.galaxyOnly) {
      const orbitRadius = responsive.orbitRadius;
      camera.position.x = Math.cos(elapsedTime * 0.11) * orbitRadius;
      camera.position.z = Math.sin(elapsedTime * 0.11) * orbitRadius;
      camera.position.y = responsive.isMobile ? 0.95 : 1.2;
      camera.lookAt(0, 0, 0);
    }

    for (let i = 0; i < parameters.count * 3; i++) {
      positionArray[i] =
        galaxyPositions[i] * (1 - easedMorph) +
        heartPositions[i] * easedMorph;

      colorArray[i] =
        galaxyColors[i] * (1 - colorMorph) +
        heartColors[i] * colorMorph;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;

    if (morphProgress > 0 && morphProgress < 1) {
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, 0.02);
      camera.position.y = THREE.MathUtils.lerp(
        camera.position.y,
        responsive.finalCameraY,
        0.02
      );
      camera.position.z = THREE.MathUtils.lerp(
        camera.position.z,
        responsive.finalCameraZ,
        0.02
      );
      camera.lookAt(0, 0, 0);
    }

    if (morphProgress >= 1) {
      morphFinished = true;

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(heartPositions.slice(), 3)
      );
      geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(heartColors.slice(), 3)
      );

      camera.position.set(0, responsive.finalCameraY, responsive.finalCameraZ);
      camera.lookAt(0, 0, 0);
    }
  } else {
    const uiTime =
      elapsedTime -
      (timings.galaxyOnly + timings.morphDuration + timings.uiStartDelay);

    const uiProgress = clamp(uiTime / timings.uiMoveDuration, 0, 1);
    const easedUI = easeInOutQuint(uiProgress);

    points.position.x = easedUI * responsive.heartMoveX;
    points.position.y = responsive.isMobile ? 0.42 : 0;

    camera.position.set(0, responsive.finalCameraY, responsive.finalCameraZ);
    camera.lookAt(points.position.x * (responsive.isMobile ? 0.08 : 0.2), 0.08, 0);

    if (uiProgress > 0.02) {
      terminal.classList.add("show");
      placeActionButton();
    }

    if (uiProgress > 0.15 && !typingStarted) {
      typingStarted = true;
    }

    updateTyping(deltaTime);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

tick();
