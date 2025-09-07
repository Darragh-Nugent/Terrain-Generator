function findBoundaries(x, y, z) {
    let maxX = -Infinity, minX = Infinity;
    let maxY = -Infinity, minY = Infinity;
    let maxZ = -Infinity, minZ = Infinity;

    for (let frame = 0; frame < x.length; frame++) {
        const xs = x[frame];
        const ys = y[frame];
        const zs = z[frame];

        for (let i = 0; i < xs.length; i++) {
            if (xs[i] > maxX) maxX = xs[i];
            if (xs[i] < minX) minX = xs[i];

            if (ys[i] > maxY) maxY = ys[i];
            if (ys[i] < minY) minY = ys[i];

            if (zs[i] > maxZ) maxZ = zs[i];
            if (zs[i] < minZ) minZ = zs[i];
        }
    }
    return { maxX, minX, maxY, minY, maxZ, minZ };
}
function isAllNonPositive(array) {
    return array.every(z => z <= 0);
}
function isAllZeros2D(array) {
    return array.every(sub_array => sub_array.every(i => i === 0));
}

function sumArray(state) {
    return state.flat().reduce((accumulator, cur_value) => accumulator += cur_value, 0)
}

function findAvg(array) {
    if (array.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < array.length; i++) {
        sum += array[i]
    }
    return sum / array.length;
}

module.exports = {
    findBoundaries,
    isAllNonPositive,
    isAllZeros2D,
    sumArray,
    findAvg
}
