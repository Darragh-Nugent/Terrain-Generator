const { spawn } = require('child_process');
const { createCanvas } = require('canvas');
const { allParticlesGrounded, isEmptyConfiguration,
    calculateNumberParticles, calculateAvgPos,
    meetsSurvivalCondition, calculateParticleDrift,
    calculateWindspeedFactor,
    calculateAvgParticlePos,
    findParticleBoundaries } = require("../utils/simulation")
const { findBoundaries, findAvg } = require("../utils/arrayUtils");
const Particle = require("../data/Particle");
function fallingSnow(initialState, steps, regionHeight, windSpeed, windDir, minNeighbour, maxNeighbour) {
    let cloudConfigs = calculateCloudConfig(initialState, minNeighbour, maxNeighbour, steps);
    // remove configurations that are dead, otherwise it will perform random walks on particles at (0,0,0)
    for (let i = 0; i < cloudConfigs.length; i++) {
        if (isEmptyConfiguration(cloudConfigs[i])) {
            if (i === 0) throw new Error("Must have at least 1 cloud particle!");
            cloudConfigs = cloudConfigs.slice(0, i);
            break;
        }
    }

    const batches = [];
    let maxSteps = 0;
    let prevAvgPos = 0;
    // for each configuration, compute the random walks of each state / cloud config
    for (let i = 0; i < cloudConfigs.length; i++) {
        let { particleArray, numParticles, averagePos } = initialiseState(cloudConfigs[i], regionHeight);
        if (i === 0) {
            prevAvgPos = averagePos;
        } else {
            // Drift the points for this configuration
            // initial_x, initial_y, k, offset_x, offset_y, delta, displacement_prob, thresholds
            const delta = calculateParticleDrift(windSpeed, numParticles);
            const thresholds = calculateThresholds(windDir, windSpeed);
            let offset_x = (prevAvgPos.x - averagePos.x)
            let offset_y = (prevAvgPos.y - averagePos.y)

            for (let k = 0; k < numParticles; k++) {
                displace1D(particleArray, k, offset_x, offset_y, delta, thresholds);
            }
            const { xAvg, yAvg } = calculateAvgParticlePos(particleArray);
            /////////////////////////// ^^^^^^^^^^^^/ might be this
            let newAvgPos = {
                x: xAvg,
                y: yAvg
            }
            prevAvgPos = newAvgPos;
        }

        // generate the time evolution arrays for the particles through random walks in format[all particles at time n, number of particles]
        const walk = randomWalks(numParticles, particleArray, windSpeed, windDir);
        batches.push(walk);

        // upper bound
        if (walk.randomWalks.length > maxSteps) {
            maxSteps = walk.randomWalks.length;
        }
    }

    // cloud config length is added as the next cloud configuration is offset by one
    const totalSteps = maxSteps + cloudConfigs.length - 1;
    // let sysCoordHistoryX = Array.from({ length: totalSteps }, () => []);
    // let sysCoordHistoryY = Array.from({ length: totalSteps }, () => []);
    // let sysCoordHistoryZ = Array.from({ length: totalSteps }, () => []);
    // let sysVelocityHistory = Array.from({ length: totalSteps }, () => []);
    let sysParticleHistory = Array.from({ length: totalSteps }, () => []);

    // store each walk for each batch into the system --> note the offset required for each config as explained above
    for (let i = 0; i < batches.length; i++) {
        const { randomWalks } = batches[i];
        const localStepsForConfig = randomWalks.length;
        // add random walks of each config into the global system coords history
        for (let step = 0; step < localStepsForConfig; step++) {
            // offset by config time --> e.g config 2 starts at global step 2
            const globalStep = i + step;
            if (globalStep >= totalSteps) break;

            let numParticles = randomWalks[step].length;
            // find if particle is falling or has reached ground
            for (let particle = 0; particle < numParticles; particle++) {
                const { x, y, z, xVel, yVel, zVel } = randomWalks[step][particle].getCoordsAndVel();

                // let particle_velocity = velocity[step][particle];
                // if (!particle_velocity)console.log("Here",particle_velocity)
                // sysCoordHistoryX[globalStep].push(x);
                // sysCoordHistoryY[globalStep].push(y);
                // prevent reaching below ground
                if (z <= 0) {
                    const newParticle = new Particle(x, y, 0, 0, 0, 0);
                    sysParticleHistory[globalStep].push(newParticle);
                    // sysCoordHistoryZ[globalStep].push(0);
                    // sysVelocityHistory[globalStep].push(0)
                }
                else {
                    const newParticle = new Particle(x, y, z, xVel, yVel, zVel)
                    sysParticleHistory.push(newParticle);
                    // sysCoordHistoryZ[globalStep].push(z);
                    // sysVelocityHistory[globalStep].push(particle_velocity)
                }
            }
            // last step indicate particles have hit the ground - add particle to all timesteps
            if (step === localStepsForConfig - 1) {
                const last = localStepsForConfig - 1;
                const numParticles = randomWalks[last].length;
                for (let future_steps = globalStep + 1; future_steps < totalSteps; future_steps++) {
                    for (let p = 0; p < numParticles; p++) {
                        if (randomWalks[last][p] <= 0) { // landed
                            // sysCoordHistoryX[future_steps].push(randomWalksX[last][p]);
                            // sysCoordHistoryY[future_steps].push(randomWalksY[last][p]);
                            // sysCoordHistoryZ[future_steps].push(0);
                            // sysVelocityHistory[future_steps].push(0);
                            const newParticle = new Particle(randomWalks[last][p].x, randomWalks[last][p].y, 0, 0, 0, 0);
                            sysParticleHistory[globalStep].push(newParticle);
                        }
                    }
                }
            }
        }
    }
    return { sysParticleHistory };
}

function displace1D(particleArray, index, xOffset, yOffset, delta, thresholds) {
    const { threshold_1, threshold_2, threshold_3 } = thresholds;
    const baseX = particleArray[index].x + xOffset;
    const baseY = particleArray[index].y + yOffset;
    let displacementProb = Math.random();
    let newX = baseX;
    let newY = baseY;
    const z = particleArray[index].z;

    if (displacementProb < threshold_1) {
        // left
        newX = baseX - delta;
    } else if (displacementProb < threshold_2) {
        // right
        newX = baseX + delta;
    } else if (displacementProb < threshold_3) {
        // down
        newY = baseY - delta;
    } else {
        // up
        newY = baseY + delta;
    }
    particleArray[index].setPosition(newX, newY, z)
}
function displace2D(xPrev, yPrev, zPrev, delta, verticalDisplacement, thresholds) {
    const displacement_prob = Math.random();
    const { threshold_1, threshold_2, threshold_3 } = thresholds;
    let newX = xPrev;
    let newY = yPrev;
    let newZ = zPrev - verticalDisplacement;
    // left
    if (displacement_prob < threshold_1) {
        newX = xPrev - delta;
    }
    // right
    else if (displacement_prob < threshold_2) {
        newX = xPrev + delta;
    }
    // down
    else if (displacement_prob < threshold_3) {
        newY = yPrev - delta;
    }
    // up
    else {
        newY = yPrev + delta;
    }
    let xVelocity = newX - xPrev;
    let yVelocity = newY - yPrev;
    let zVelocity = newZ - zPrev;
    return new Particle(newX, newY, newZ, xVelocity, yVelocity, zVelocity)
}


function cellularAutomata(initialState, minNeighbour, maxNeighbour, timeframe) {
    let cellula_automata_config = calculateCloudConfig(initialState, minNeighbour, maxNeighbour, timeframe);
    return cellula_automata_config;
}


// initialises the starting layer (t = 0 or column 0) --> moving from initial state into a 1d particle array at step = 0
function initialiseState(initialState, regionHeight) {
    // initial state should be a binary 2d matrix, with 1 representing a particle
    // e.g [[1,0,1,1],
    //       1,1,1,0]]
    const numParticles = calculateNumberParticles(initialState)
    const regionWidth = initialState[0].length;
    const regionLength = initialState.length;
    const maxHeight = regionHeight;
    const minHeight = regionHeight - (regionHeight / 4)

    // time evolution array for every particle in the system
    const particleArray = [];

    // keep track of particles
    let particleIndex = 0;

    // keep track of the center of the configuration
    let sumX = 0, sumY = 0;
    // save the inital state into the first time column for each coordinate for each particle (represented by a 1)
    for (let i = 0; i < regionLength; i++) {
        for (let j = 0; j < regionWidth; j++) {
            // record coord of particle, serperated into x and y arrays
            if (initialState[i][j] === 1) {
                sumX += j;
                sumY += i;
                const z = Math.random() * (maxHeight - minHeight) + minHeight;
                particleArray.push(new Particle(j, i, z));
                particleIndex++;
            }
        }
    }
    const averagePos = {
        x: sumX / particleIndex,
        y: sumY / particleIndex,
    }
    return { particleArray, numParticles, averagePos };
}

function calculateThresholds(windDir, windSpeed) {
    let windFactor = calculateWindspeedFactor(windSpeed);
    // random walk base probabilities
    let probLeft = 0.25;
    let probRight = 0.25;
    let probUp = 0.25;
    let probDown = 0.25;
    // scale down other thresholds accordingly
    let leftOverProb = (1 - windFactor) / 3;
    switch ((windDir ? windDir.toLowerCase() : 'default')) {
        case 'north':
            probLeft = probRight = probDown = leftOverProb;
            probUp = windFactor;
            break;
        case 'east':
            probLeft = probDown = probUp = leftOverProb;
            probRight = windFactor;
            break;
        case 'south':
            probLeft = probRight = probUp = leftOverProb;
            probDown = windFactor;
            break;
        case 'west':
            probLeft = windFactor;
            probRight = probDown = probUp = leftOverProb;
            break;
        default: // even 0.25 each
    }
    let threshold_1 = probLeft;
    let threshold_2 = probLeft + probRight;
    let threshold_3 = probLeft + probRight + probDown;
    return { threshold_1, threshold_2, threshold_3 };
}
function findVelocity(deltaX, deltaY, deltaZ) {
    let distance = Math.sqrt(deltaX ** 2 + deltaY ** 2 + deltaZ ** 2);
    return distance;
}

function randomWalks(numParticles, particleArray, windSpeed, windDir) {
    const delta = calculateParticleDrift(windSpeed);

    let thresholds = calculateThresholds(windDir, windSpeed);
    let randomWalks = [];
    // let randomWalksX = [];
    // let randomWalksY = [];
    // let randomWalksZ = [];
    // let velocity = [];
    // let timestepVelocity = [];
    let systemUnstable = true;
    let timeStep = 0; // timestep = 0 is initial state
    randomWalks.push([...particleArray]);
    // randomWalksX.push([...initialWalksX]);
    // randomWalksY.push([...initialWalksY]);
    // randomWalksZ.push([...initialWalksZ]);
    // velocity.push(Array.from({ length: numParticles }).fill(0))

    while (systemUnstable) {
        timeStep++;
        // randomWalksX[timeStep] = [];
        // randomWalksY[timeStep] = [];
        // randomWalksZ[timeStep] = [];
        randomWalks[timeStep] = [];
        // timestepVelocity = [];
        let verticalDisplacement = Array.from({ length: numParticles }, () => Math.random())
        for (let j = 0; j < numParticles; j++) {
            let xPrev = randomWalks[timeStep - 1][j].x;
            let yPrev = randomWalks[timeStep - 1][j].y;
            let zPrev = randomWalks[timeStep - 1][j].z;

            // check if certain particle has already hit the ground (z = 0)
            if (randomWalks[timeStep - 1][j].z <= 0) {
                // revert changes as previous iteration has already hit the ground
                randomWalks[timeStep].push(new Particle(xPrev, yPrev, 0, 0, 0, 0));
                // timestepVelocity.push(0)
                continue;
            }
            // update coordinates and velocity accordingly        
            // randomWalks[timeStep][j].z = z_prev - verticalDisplacement[j];
            // randomWalks[timeStep][j].zVelocity = verticalDisplacement[j] - z_prev;
            const localVertDisplacement = verticalDisplacement[j]
            let displacedParticle = displace2D(xPrev, yPrev, zPrev, delta, localVertDisplacement, thresholds);
            randomWalks[timeStep].push(displacedParticle);
            // timestepVelocity.push(findVelocity(randomWalksX, randomWalksY, randomWalksZ, timeStep, j));
        }
        if (allParticlesGrounded(randomWalks[timeStep])) {
            systemUnstable = false;
        }
        // velocity.push(timestepVelocity)
    }
    // return { randomWalksX, randomWalksY, randomWalksZ, velocity }
    return { randomWalks }
}

function calculateNextConfig(state, neighbourDir, minNeighbour, maxNeighbour) {
    let cols = state[0].length;
    let rows = state.length;
    let tmpState = state.map(row => [...row]);

    // count the number of cloud particles and their respective neighbours
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let liveNeighbours = findNumNeighbours(state, neighbourDir, i, j);
            // condition to survive
            if (state[i][j] && meetsSurvivalCondition(liveNeighbours, minNeighbour, maxNeighbour)) {
                tmpState[i][j] = 1;
            }
            // new particle is born
            else if (state[i][j] === 0 && liveNeighbours >= minNeighbour && liveNeighbours <= maxNeighbour) {
                tmpState[i][j] = 1;
            }
            // particle is dead
            else {
                tmpState[i][j] = 0;
            }
        }
    }
    return tmpState;
}

function calculateCloudConfig(initialState, minNeighbour, maxNeighbour, timeframe) {
    // note inital state must be a 2d binary matrix --> make the required checks !
    let cols = initialState[0].length;
    let rows = initialState.length;
    // set boundary for cellula automata e.g wrap around for each cardinal direction
    // [0,1,2,3,4] => [4,0,1,2,3] for north
    // [0,1,2,3,4] => [1,2,3,4,0] for south
    // --> note south and east are similar but will each depend on rows and cols respectively, same with north and west
    // [0,1,2,3,4] => [4,0,1,2,3] for west
    // [0,1,2,3,4] => [1,2,3,4,0] for east
    const northNeighbourIndex = Array.from({ length: rows }, (_, row_index) => (row_index - 1 + rows) % rows);
    const westNeighbourIndex = Array.from({ length: cols }, (_, col_index) => (col_index - 1 + cols) % cols);

    const southNeighbourIndex = Array.from({ length: rows }, (_, row_index) => (row_index + 1) % rows);
    const eastNeighbourIndex = Array.from({ length: cols }, (_, col_index) => (col_index + 1) % cols);

    // create obj for neighbourhood indexes
    const neighbour_dir = {
        north: northNeighbourIndex,
        east: eastNeighbourIndex,
        south: southNeighbourIndex,
        west: westNeighbourIndex
    };

    // store each configuration of the C.A take shape in form (configs,row,col)
    let cellularAutomaraConfig = Array.from(Array(timeframe), () => Array.from(Array(rows), () => Array(cols).fill(0)));
    let tmpState = initialState.map(row => [...row]);
    cellularAutomaraConfig[0] = initialState.map(row => [...row]);

    for (let i = 1; i < timeframe; i++) {
        tmpState = calculateNextConfig(tmpState, neighbour_dir, minNeighbour, maxNeighbour);
        cellularAutomaraConfig[i] = tmpState.map((rows) => [...rows]);
        if (calculateNumberParticles(tmpState) === 0) {
            // if the configuration dies out before the timeframe ends 
            if (i != timeframe - 1) return cellularAutomaraConfig.slice(0, i + 1);
        }
    }
    return cellularAutomaraConfig;
}


function findNumNeighbours(initialState, neighbourDir, i, j) {
    let liveNeighbours = 0;
    const { north, east, south, west } = neighbourDir;
    // count the number of cloud particles and their respective neighbours
    liveNeighbours =
        // cardinal neighbours
        initialState[north[i]][j] + initialState[i][west[j]]
        + initialState[south[i]][j] + initialState[i][east[j]]
        // diagonal neighbouts
        + initialState[north[i]][east[j]] + initialState[north[i]][west[j]]
        + initialState[south[i]][east[j]] + initialState[south[i]][west[j]];
    return liveNeighbours;
}


async function saveRenderVideo(params, writeStream) {
    try {
        await renderVideo(params, writeStream);
        console.log('Video saved to disk!');
        return true;
    } catch (err) {
        console.error('Error rendering video:', err);
        throw err; // optional
    }
}


// CHATGPT
async function renderVideo(params, writeStream) {
    let { initialState, steps, height, windSpeed = 0, windDir = null, minNeighbour, maxNeighbour, view = "default" } = params;

    if (!initialState || !steps || !height || !minNeighbour || !maxNeighbour) throw new Error("Invalid parameters");

    // run simulation
    const sim = fallingSnow(initialState, steps, height, windSpeed, windDir, minNeighbour, maxNeighbour);
    // const framesX = sim.sysCoordHistoryX;
    // const framesY = sim.sysCoordHistoryY;
    // const framesZ = sim.sysCoordHistoryZ;
    // const velocity = sim.sysVelocityHistory;
    const frames = sim.sysParticleHistory;

    const width = 800, heightPx = 600;
    const canvas = createCanvas(width, heightPx);
    const ctx = canvas.getContext('2d');

    // spawn ffmpeg
    const ffmpeg = spawn('ffmpeg', [
        '-y',
        '-f', 'image2pipe',
        '-vcodec', 'png',
        '-r', '20',
        '-i', '-',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-movflags', 'frag_keyframe+faststart',
        '-f', 'mp4',
        'pipe:1'
    ]);

    ffmpeg.stdout.pipe(writeStream);
    ffmpeg.stderr.on('data', d => console.error(d.toString()));

    const writeFrame = (buf) => new Promise((resolve, reject) => {
        ffmpeg.stdin.write(buf, err => (err ? reject(err) : resolve()));
    });

    // center and scale calculation
    const { maxX, minX, maxY, minY, maxZ, minZ, maxSpeedX, minSpeedX, maxSpeedY, minSpeedY, maxSpeedZ, minSpeedZ } = findParticleBoundaries(frames);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
    const baseScale = (Math.min(width, heightPx) / 2 - 50) / maxDim;
    const angle = Math.PI / 6;
    const maxSize = Math.max(0.5, 1.5 - maxZ * 0.05);
    const timeStep = frames.length;
    for (let t = (view === "velocity" ? 1 : 0); t < timeStep; t++) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, heightPx);
        for (let p = 0; p < timeStep.length; p++) {
            const x = frames[t][p].x - centerX;
            const y = frames[t][p].y - centerY;
            const z = frames[t][p].z - centerZ;
            const minSize = maxSize * 0.2;
            const denom = Math.max(minSize, 1 - z * 0.05);
            const scale = 1 / denom;
            const screenX = (x - y) * Math.cos(angle) * baseScale + width / 2;
            const screenY = (x + y) * Math.sin(angle) * baseScale - z * baseScale + heightPx / 2;


            const radius = 2 * scale;
            if (view === "depth") {
                const zNorm = (z - minZ) / (maxZ - minZ); // normalize 0–1
                const brightness = Math.floor(100 + (255 - 100) * zNorm);
                ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
            }
            else if (view === "velocity") {
                // let maxSpeed = -Infinity;
                // for (let t = 0; t < velocity.length; t++) {
                //     for (let p = 0; p < velocity[t].length; p++) {
                //         if (velocity[t][p] > maxSpeed) {
                //             maxSpeed = velocity[t][p];
                //         }
                //     }
                // }
                // const speed = velocity[t][p];
                let maxSpeed = findVelocity(maxSpeedX, maxSpeedY, maxSpeedZ)
                const normSpeed = Math.min(speed / maxSpeed, 1); // normalize and clamp to 0-1 // max delta is 3 so its roughly the max vel

                // Brightness scales with speed — dark red to bright red
                const brightness = Math.floor(100 + 255 * normSpeed); // [50–255] range
                ctx.fillStyle = `rgb(${brightness}, 0, 0)`; // Red only
            }
            else {
                const base = 100; // minimum brightness (dark grey)
                const brightness = Math.min(255, Math.max(base, 150 + z * 10));
                ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
            }

            ctx.beginPath();
            ctx.arc(screenX, screenY, radius, 0, 2 * Math.PI);
            ctx.fill();
        }
        const buf = canvas.toBuffer('image/png');
        await writeFrame(buf);
    }

    ffmpeg.stdin.end();

    return new Promise((resolve, reject) => {
        ffmpeg.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`ffmpeg exited with code ${code}`));
        });
    });
}


module.exports = {
    fallingSnow,
    cellularAutomata,
    renderVideo,
    saveRenderVideo
}