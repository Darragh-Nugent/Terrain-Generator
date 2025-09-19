const { isAllNonPositive, isAllZeros2D, sumArray, findAvg } = require("./arrayUtils.js")
function allParticlesGrounded(particleArray) {
    return particleArray.every(p => p.z <= 0);
}

function isEmptyConfiguration(array) {
    return isAllZeros2D(array);
}

function calculateNumberParticles(state) {
    return sumArray(state);
}

function calculateAvgPos(array) {
    return findAvg(array);
}

function calculateAvgParticlePos(particleArray) {
    let xSum, ySum
    const numParticles = particleArray.length;
    for (let i = 0; i < numParticles; i++) {
        xSum += particleArray[i].x;
        ySum += particleArray[i].y;
    }
    return {
        xAvg: xSum / numParticles,
        yAvg: ySum / numParticles
    }
}

function meetsSurvivalCondition(liveNeighbours, minNeighbours, maxNeighbours) {
    return (liveNeighbours >= minNeighbours) && (liveNeighbours <= maxNeighbours)
        && (liveNeighbours != maxNeighbours - minNeighbours)
}

function calculateParticleDrift(windSpeed, numParticles = 1) {
    const airDensity = 1.225; // kg/m^3
    const dragCoeff = 0.6;
    const particleArea = 0.0001; // m^2 
    const mass = 0.000002; // 2 mg, small snowflake
    const velocity = windSpeed;
    const maxSpeed = 50;

    const totalArea = particleArea * numParticles;
    const totalMass = mass * numParticles;

    const dragForce = 0.5 * airDensity * velocity * velocity * dragCoeff * totalArea;

    // f = ma
    const accel = dragForce / totalMass;
    // displacement = 1/2 a t^2 + v t --> v = 0, t = 1
    const scaleFactor = 0.01 + Math.min(velocity / maxSpeed, 1) * 0.1;
    const baseDelta = 0.1 + Math.random();
    let maxDelta = 3; // max movement per timestep
    if (numParticles > 1) maxDelta = maxDelta // for clouds
    return Math.min(baseDelta + (accel / 2) * scaleFactor, maxDelta);;
}

function calculateWindspeedFactor(windSpeed) {
    const maxFactor = 0.65
    // since its probabilty, we want to apply the sigmoid function to keep between 0 and 1
    return maxFactor * 1 / (1 + Math.exp(-(windSpeed - 10)));
}

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
            const { x, y, z, xVel, yVel, zVel } = particleArray[step][p].getCoordsAndVel();

            bounds.maxX = Math.max(bounds.maxX, x);
            bounds.minX = Math.min(bounds.minX, x);

            bounds.maxY = Math.max(bounds.maxY, y);
            bounds.minY = Math.min(bounds.minY, y);

            bounds.maxZ = Math.max(bounds.maxZ, z);
            bounds.minZ = Math.min(bounds.minZ, z);

            bounds.maxSpeedX = Math.max(bounds.maxSpeedX, xVel);
            bounds.minSpeedX = Math.min(bounds.minSpeedX, xVel);

            bounds.maxSpeedY = Math.max(bounds.maxSpeedY, yVel);
            bounds.minSpeedY = Math.min(bounds.minSpeedY, yVel);

            bounds.maxSpeedZ = Math.max(bounds.maxSpeedZ, zVel);
            bounds.minSpeedZ = Math.min(bounds.minSpeedZ, zVel);
        }
    }

    return bounds;
}

module.exports = {
    allParticlesGrounded,
    isEmptyConfiguration,
    calculateNumberParticles,
    calculateAvgPos,
    meetsSurvivalCondition,
    calculateParticleDrift,
    calculateWindspeedFactor,
    calculateAvgParticlePos,
    findParticleBoundaries
}

