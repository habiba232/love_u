import * as THREE from "https://unpkg.com/three@0.132.2/build/three.module.js?module";

const canvas = document.querySelector(".webgl");
const scene = new THREE.Scene();

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

const isMobile = window.innerWidth <= 768;

/* CAMERA */
const camera = new THREE.PerspectiveCamera(
  isMobile ? 72 : 65,
  sizes.width / sizes.height,
  0.1,
  100
);

camera.position.set(0, isMobile ? 0.2 : 0.4, isMobile ? 6 : 7);
scene.add(camera);

/* RENDERER */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);

/* PARTICLES */
const geometry = new THREE.BufferGeometry();
const count = isMobile ? 10000 : 18000;

const positions = new Float32Array(count * 3);

for (let i = 0; i < count * 3; i++) {
  positions[i] = (Math.random() - 0.5) * 6;
}

geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

const material = new THREE.PointsMaterial({
  size: isMobile ? 0.03 : 0.02,
  color: "#ff7eb6"
});

const points = new THREE.Points(geometry, material);
scene.add(points);

/* UI */
const terminal = document.createElement("div");
terminal.className = "terminal-box";
terminal.innerHTML = `
  <div class="terminal-body">
    بصي يا حبيبة... ❤️
  </div>
`;

const btn = document.createElement("a");
btn.className = "next-button";
btn.innerText = "Open Message";
btn.href = "message.html";

document.body.appendChild(terminal);
document.body.appendChild(btn);

/* ANIMATION */
let time = 0;

function animate() {
  time += 0.01;

  /* قلب في النص */
  points.position.x = 0;

  /* الكاميرا تبص للنص */
  camera.lookAt(0,0,0);

  /* إظهار UI */
  if (time > 2) terminal.classList.add("show");
  if (time > 3) btn.classList.add("show");

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
