// <!-- CHATGPT GENERATED --> //
import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { PointerLockControls } from '/js/PointerLockControls_fixed.js';
import { OrbitControls } from '/js/OrbitControls_fixed.js';
// import { findParticleBoundaries } from '/src/utils/simulation.js';

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
    // framesX = data.sysCoordHistoryX;
    // framesY = data.sysCoordHistoryY;
    // framesZ = data.sysCoordHistoryZ;
    // velocity = data.sysVelocityHistory;
    frames = data.sysParticleHistory;
    computeStaticFrameMetrics();

    if (!frames | !frames.length) {
        console.error('Bad frames data', data);
        return;
    }

    // Total frames and max points per frame
    T = frames.length;
    let maxN = 0;
    for (let k = 0; k < frames.length; k++) {
        maxN = Math.max(maxN, frames[k].length);
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

// have to copy this over from util because the browser doesnt serve src
function findParticleBoundaries(particleArray) {
    const bounds = {
        maxX: -Infinity, minX: Infinity,
        maxY: -Infinity, minY: Infinity,
        maxZ: -Infinity, minZ: Infinity,
        maxSpeedX: -Infinity, minSpeedX: Infinity,
        maxSpeedY: -Infinity, minSpeedY: Infinity,
        maxSpeedZ: -Infinity, minSpeedZ: Infinity
    };

    for (let step = 0; step < particleArray.length; step++) {
        for (let p = 0; p < particleArray[step].length; p++) {
            const { x, y, z, xVelocity, yVelocity, zVelocity } = particleArray[step][p];

            bounds.maxX = Math.max(bounds.maxX, x);
            bounds.minX = Math.min(bounds.minX, x);

            bounds.maxY = Math.max(bounds.maxY, y);
            bounds.minY = Math.min(bounds.minY, y);

            bounds.maxZ = Math.max(bounds.maxZ, z);
            bounds.minZ = Math.min(bounds.minZ, z);

            bounds.maxSpeedX = Math.max(bounds.maxSpeedX, xVelocity);
            bounds.minSpeedX = Math.min(bounds.minSpeedX, xVelocity);

            bounds.maxSpeedY = Math.max(bounds.maxSpeedY, yVelocity);
            bounds.minSpeedY = Math.min(bounds.minSpeedY, yVelocity);

            bounds.maxSpeedZ = Math.max(bounds.maxSpeedZ, zVelocity);
            bounds.minSpeedZ = Math.min(bounds.minSpeedZ, zVelocity);
        }
    }
    return bounds;
}

function getMinMaxZ(particles) {
    let minZ = Infinity, maxZ = -Infinity;
    for (const frame of particles) {
        for (const p of frame) {
            if (p.z < minZ) minZ = p.z;
            if (p.z > maxZ) maxZ = p.z;
        }
    }
    return { minZ, maxZ };
}
function computeStaticFrameMetrics() {
    cachedBounds = getBoundsAndScale();
    cachedHeightRange = getMinMaxZ(frames);
}

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
// let framesX = null, framesY = null, framesZ = null;
let cachedBounds = null;
let cachedHeightRange = null;
let frames = null;
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
    const { maxX, minX, maxY, minY, maxZ, minZ, maxSpeedX, minSpeedX, maxSpeedY, minSpeedY, maxSpeedZ, minSpeedZ } = findParticleBoundaries(frames);

    // Center of bounding box
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Compute scale so the largest dimension fits roughly into a 60-unit cube
    const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1e-6);
    const scale = 100 / maxDim;

    return { centerX, centerY, centerZ, scale, maxSpeedX, maxSpeedY, maxSpeedZ };
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
    if (!frames) return;
    if (frames.length === 0) return;
    if (k >= frames.length) return;
    const { centerX, centerY, centerZ, scale, maxSpeedX, maxSpeedY, maxSpeedZ } = cachedBounds;
    tmp.scale = scale;

    // For velocity coloring, we need previous frame (use same frame if k==0)
    const frameN = frames[k].length;
    for (let i = 0; i < N; i++) {
        if (i < frameN) {
            const { x, y, z, xVelocity, yVelocity, zVelocity } = frames[k][i];

            const xOffset = x - centerX;
            const yOffset = y - centerY;
            const zOffset = z - centerZ;

            positions[3 * i + 0] = xOffset * scale;  // X stays X
            positions[3 * i + 1] = zOffset * scale;  // Z becomes Y (height)
            positions[3 * i + 2] = yOffset * scale;  // Y becomes Z (depth)

            // Color by view mode
            const mode = getViewMode();
            if (mode === 'depth') {
                const { minZ, maxZ } = cachedHeightRange;
                // Find rough normalized height
                const t = THREE.MathUtils.clamp(
                    (z - minZ) / (maxZ - minZ + 1e-6),
                    0, 1
                );

                // pinkish
                // const topR = 1.0, topG = 0.1, topB = 0.7; 
                // const botR = 0.5, botG = 0.5, botB = 0.5; 

                // goldish
                const topR = 1.0, topG = 0.8, topB = 0.3; // warm gold
                const botR = 0.5, botG = 0.5, botB = 0.5;  // neutral grey


                // Lerp from top colour (t=1) to bottom colour (t=0)
                const r = THREE.MathUtils.lerp(botR, topR, t);
                const g = THREE.MathUtils.lerp(botG, topG, t);
                const b = THREE.MathUtils.lerp(botB, topB, t);
                colors[3 * i + 0] = r;
                colors[3 * i + 1] = g;
                colors[3 * i + 2] = b;
            } else if (mode === 'velocity') {
                // Normalize each velocity component separately to [0,1]
                const normX = Math.min(Math.abs(xVelocity / maxSpeedX), 1);
                const normY = Math.min(Math.abs(yVelocity / maxSpeedY), 1);
                const normZ = Math.min(Math.abs(zVelocity / maxSpeedZ), 1);

                // Make color more vibrant by boosting the base
                const base = 0.6;
                const r = base + normX * (1 - base); // Red from xVel
                const g = base + normY * (1 - base); // Green from yVel
                const b = base + normZ * (1 - base); // Blue from zVel

                colors[3 * i + 0] = THREE.MathUtils.clamp(r, 0, 1);
                colors[3 * i + 1] = THREE.MathUtils.clamp(g, 0, 1);
                colors[3 * i + 2] = THREE.MathUtils.clamp(b, 0, 1);
            }
            else {
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
    if (playing && frames) {
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

    // Expecting data: {sysParticleHistory }
    // framesX = data.sysCoordHistoryX;
    // framesY = data.sysCoordHistoryY;
    // framesZ = data.sysCoordHistoryZ;
    // velocity = data.sysVelocityHistory;

    frames = data.sysParticleHistory;
    computeStaticFrameMetrics();
    if (!frames || !frames.length) {
        console.error('Bad frames data', data);
        return;
    }

    T = frames.length;
    N = Math.max(...frames.map(f => f.length));


    initPointsIfNeeded();
    frameIndex = 0;
    playing = true;
    playPauseBtn.textContent = 'Pause';
});