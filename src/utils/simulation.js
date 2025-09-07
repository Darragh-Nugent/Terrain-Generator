const {isAllNonPositive,isAllZeros2D,sumArray,findAvg} = require("./arrayUtils.js")
function allParticlesGrounded(array) {
    return isAllNonPositive(array);
}
function isEmptyConfiguration(array) {
    return isAllZeros2D(array);
}

function calculateNumberParticles(state){
    return sumArray(state);
}

function calculateAvgPos(array) {
    return findAvg(array);
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


module.exports = {
    allParticlesGrounded,
    isEmptyConfiguration,
    calculateNumberParticles,
    calculateAvgPos,
    meetsSurvivalCondition,
    calculateParticleDrift,
    calculateWindspeedFactor
}

