// <!-- CHATGPT GENERATED --> //
import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { PointerLockControls } from '/js/PointerLockControls_fixed.js';
import { OrbitControls } from '/js/OrbitControls_fixed.js';
// For better particles visually
const alphaMap = new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/circle.png');

const form = document.getElementById('simulation_form');
const table = document.getElementById('table');

// Helper to build payload object for backend from form data and initial state table
function buildPayload(formData, initialState) {
    return {
        initialState: initialState,
        steps: Number(formData.steps),
        height: Number(formData.height),
        windSpeed: Number(formData.windSpeed),
        windDir: formData.windDir,
        minNeighbour: Number(formData.minNeighbour),
        maxNeighbour: Number(formData.maxNeighbour),
    };
}

// Send the simulation payload to backend and get result JSON
async function fetchSimulation(payload) {
    const res = await fetch('/simulation/falling-snow-calculation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    return { res, data };
}

// Initialize the simulation with a random grid state (optional for user)
window.randomInitialization = async function () {
    const messageDiv = document.getElementById('randomInitDiv');
    const randomSizeInput = document.querySelector('#randomInit input[name="size"]');
    messageDiv.textContent = '';

    const dim = Number(randomSizeInput.value);
    if (dim < 1 || dim > 50) {
        messageDiv.textContent = "Size must be between 1 and 50.";
        return;
    }

    // Step 1: Create random initial state
    const randomState = Array.from({ length: dim }, () =>
        Array.from({ length: dim }, () => Math.random() > 0.5 ? 1 : 0)
    );

    // Step 2: Read form values for the rest of the config
    const formData = Object.fromEntries(new FormData(document.getElementById('simulation_form')));

    const payload = buildPayload(formData, randomState);

    // Step 3: Send to backend
    const { res, data } = await fetchSimulation(payload);
    if (!res.ok) {
        console.error('Error JSON:', data);
        return;
    }

    // Step 4: Same as form handler logic
    framesX = data.sysCoordHistoryX;
    framesY = data.sysCoordHistoryY;
    framesZ = data.sysCoordHistoryZ;

    if (!framesX || !framesY || !framesZ || !framesX.length) {
        console.error('Bad frames data', data);
        return;
    }

    // Total frames and max points per frame
    T = framesX.length;
    let maxN = 0;
    for (let k = 0; k < framesX.length; k++) {
        maxN = Math.max(maxN, framesX[k].length);
    }
    N = maxN;

    // Clean up old points
    if (points) {
        scene.remove(points);
        points.geometry.dispose();
        points.material.dispose();
        points = null;
    }

    initPointsIfNeeded();
    frameIndex = 0;
    playing = true;
    playPauseBtn.textContent = 'Pause';
}

function initialiseTable(row, col) {
    for (let i = 0; i < row; i++) addRow(col);
}
initialiseTable(4, 4);

// --- THREE setup ---
const host = document.getElementById('three');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101014);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 5000);
camera.position.set(40, 30, 40);

// Orbit Controls
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.enabled = true; // Start with orbit enabled


// PointerLockControls
const pointerControls = new PointerLockControls(camera, document.body);
scene.add(pointerControls.getObject());
pointerControls.enabled = false; // Start disabled

// Movement variables
const moveSpeed = 35; // units per second
let velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

const keysPressed = {};
let usingPointerLock = false;
// Keyboard event listeners
document.addEventListener('keydown', (event) => {
    keysPressed[event.code] = true;
    if (event.code === 'KeyE') {
        event.preventDefault(); // prevent browser focus change
        usingPointerLock = !usingPointerLock;

        if (usingPointerLock) {
            orbitControls.enabled = false;
            pointerControls.lock(); // will enable controls automatically
        } else {
            pointerControls.unlock(); // unlock and go back to orbit
            orbitControls.enabled = true;
        }
    }

});

document.addEventListener('keyup', (event) => {
    keysPressed[event.code] = false;
});


const clock = new THREE.Clock();
const grid = new THREE.GridHelper(200, 20, 0x333333, 0x222222);
grid.position.y = -8.5;
scene.add(grid);

const axes = new THREE.AxesHelper(30);
scene.add(axes);

// // Handle window resizing to keep aspect ratio correct
function resize() {
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// --- Geometry/Material for points ---
let points = null;
let posAttr = null, colAttr = null;
let positions = null, colors = null;

// Animation state
let framesX = null, framesY = null, framesZ = null;
let T = 0, N = 0;
let frameIndex = 0;
const frameDelay = 3;
let frameCounter = 0;
let playing = true;
const playPauseBtn = document.getElementById('playPauseBtn');
playPauseBtn.onclick = () => { playing = !playing; playPauseBtn.textContent = playing ? 'Pause' : 'Play'; };

// View mode (default | depth | velocity)
function getViewMode() {
    const checked = form.querySelector('input[name="view"]:checked');
    return checked ? checked.value : 'default';
}

// 
// Calculate bounding box and scale to fit all points nicely in view
function getBoundsAndScale() {
    let maxX = -Infinity, minX = Infinity;
    let maxY = -Infinity, minY = Infinity;
    let maxZ = -Infinity, minZ = Infinity;

    for (let frame = 0; frame < framesX.length; frame++) {
        const xs = framesX[frame];
        const ys = framesY[frame];
        const zs = framesZ[frame];

        for (let i = 0; i < xs.length; i++) {
            if (xs[i] > maxX) maxX = xs[i];
            if (xs[i] < minX) minX = xs[i];

            if (ys[i] > maxY) maxY = ys[i];
            if (ys[i] < minY) minY = ys[i];

            if (zs[i] > maxZ) maxZ = zs[i];
            if (zs[i] < minZ) minZ = zs[i];
        }
    }

    // Center of bounding box
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Compute scale so the largest dimension fits roughly into a 60-unit cube
    const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1e-6);
    const scale = 100 / maxDim;

    return { centerX, centerY, centerZ, scale };
}


// Create or update the Points object
function initPointsIfNeeded() {
    if (points) return;

    // Allocate typed arrays for positions and colors (N points * 3 coords)
    positions = new Float32Array(N * 3);
    colors = new Float32Array(N * 3);

    const geom = new THREE.BufferGeometry();
    posAttr = new THREE.BufferAttribute(positions, 3);
    colAttr = new THREE.BufferAttribute(colors, 3);
    geom.setAttribute('position', posAttr);
    geom.setAttribute('color', colAttr);

    // Points material with alpha texture for smooth circles, some transparency
    const mat = new THREE.PointsMaterial({
        size: 2.4,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.67,
        depthWrite: false,
        alphaMap: alphaMap,
        alphaTest: 0.01
    });

    points = new THREE.Points(geom, mat);
    scene.add(points);
}

// Per-frame update for positions and colors
// Temporary object to store scale and center, avoid reallocations
const tmp = { cx: 0, cy: 0, cz: 0, scale: 1 };

// Update particle positions and colors for frame k
function updateFrame(k) {
    if (!framesX || !framesY || !framesZ) return;
    if (framesX.length === 0 || framesY.length === 0 || framesZ.length === 0) return;
    if (k >= framesX.length) return;
    const { centerX, centerY, centerZ, scale } = getBoundsAndScale();
    tmp.scale = scale;

    // For velocity coloring, we need previous frame (use same frame if k==0)
    const prev = Math.max(k - 1, 0);
    const frameN = framesX[k].length;
    for (let i = 0; i < N; i++) {
        if (i < frameN) {
            const x = framesX[k][i] - centerX;
            const y = framesY[k][i] - centerY;
            const z = framesZ[k][i] - centerZ;

            positions[3 * i + 0] = x * scale;  // X stays X
            positions[3 * i + 1] = z * scale;  // Z becomes Y (height)
            positions[3 * i + 2] = y * scale;  // Y becomes Z (depth)

            // Color by view mode
            const mode = getViewMode();
            if (mode === 'depth') {
                // map ry to 0..1
                // Find rough normalized height using scale of 60/maxDim => ry ~ [-30, 30]
                const t = THREE.MathUtils.clamp((z + 30) / 60, 0, 1);
                // blue (low) -> white (high)
                const r = 0.2 + 0.8 * t;
                const g = 0.2 + 0.8 * t;
                const b = 1.0 - 0.6 * t;
                colors[3 * i + 0] = r;
                colors[3 * i + 1] = g;
                colors[3 * i + 2] = b;
            } else if (mode === 'velocity') {
                const vx = (framesX[k][i] - framesX[prev][i]);
                const vy = (framesY[k][i] - framesY[prev][i]);
                const vz = (framesZ[k][i] - framesZ[prev][i]);
                const v = Math.sqrt(vx * vx + vy * vy + vz * vz);

                // Simple speed → color map (black -> red -> yellow -> white)
                const t = THREE.MathUtils.clamp(v / 2.0, 0, 1); // adjust denominator for range
                const r = THREE.MathUtils.lerp(0.1, 1.0, t);
                const g = THREE.MathUtils.lerp(0.1, 0.9, t * 0.7);
                const b = THREE.MathUtils.lerp(0.2, 0.2, t);
                colors[3 * i + 0] = r;
                colors[3 * i + 1] = g;
                colors[3 * i + 2] = b;
            } else {
                // default
                colors[3 * i + 0] = 0.95;
                colors[3 * i + 1] = 0.95;
                colors[3 * i + 2] = 1.0;
            }
        }
        else {
            // Hide extra particles for this frame --> hide the padded particles
            positions[3 * i + 0] = 1e6;
            positions[3 * i + 1] = 1e6;
            positions[3 * i + 2] = 1e6;

            colors[3 * i + 0] = 0;
            colors[3 * i + 1] = 0;
            colors[3 * i + 2] = 0;
        }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
}

// Animation loop
function tick() {
    requestAnimationFrame(tick);
    const delta = clock.getDelta();
    direction.set(0, 0, 0);
    if (pointerControls.isLocked && usingPointerLock) {
        direction.set(0, 0, 0);

        if (keysPressed['KeyW']) direction.z -= 1;
        if (keysPressed['KeyS']) direction.z += 1;
        if (keysPressed['KeyA']) direction.x -= 1;
        if (keysPressed['KeyD']) direction.x += 1;
        if (keysPressed['Space']) direction.y += 1;
        if (keysPressed['ShiftLeft'] || keysPressed['ShiftRight']) direction.y -= 1;

        if (direction.lengthSq() > 0) {
            direction.normalize();
            direction.applyQuaternion(pointerControls.getObject().quaternion);

            velocity.copy(direction).multiplyScalar(moveSpeed * delta);
            pointerControls.getObject().position.add(velocity);
        }
    } else {
        orbitControls.update();
    }
    if (playing && framesX) {
        if (frameCounter === 0) {
            updateFrame(frameIndex);
            frameIndex = (frameIndex + 1) % T;
        }
        frameCounter = (frameCounter + 1) % frameDelay;
    }
    renderer.render(scene, camera);
}
tick();

// --- submit handler: fetch sim data and play ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (points) {
        scene.remove(points);
        points.geometry.dispose();
        points.material.dispose();
        points = null;
    }
    // read form data
    const formData = Object.fromEntries(new FormData(form));

    // initial_state from table
    const initialState = [...table.rows].map(row =>
        [...row.cells].map(cell => parseInt(cell.querySelector('input').value) || 0)
    );

    // sanitize numbers
    const payload = buildPayload(formData, initialState);

    const { res, data } = await fetchSimulation(payload);
    if (!res.ok) {
        console.error('Error JSON:', data);
        return;
    }

    // Expecting data: { sysCoordHistoryX, sysCoordHistoryY, sysCoordHistoryZ }
    framesX = data.sysCoordHistoryX;
    framesY = data.sysCoordHistoryY;
    framesZ = data.sysCoordHistoryZ;

    if (!framesX || !framesY || !framesZ || !framesX.length) {
        console.error('Bad frames data', data);
        return;
    }

    T = framesX.length;
    N = Math.max(...framesX.map(f => f.length));


    initPointsIfNeeded();
    frameIndex = 0;
    playing = true;
    playPauseBtn.textContent = 'Pause';
});