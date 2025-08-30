const Noise = require("noisejs").Noise;
const { createCanvas } = require("canvas");
const Point = require("./Point");


class Terrain {
    id;
    seed;
    size;
    heightScale;
    octaves;
    iterations;
    userId;

    constructor(seed, size, heightScale = 10, octaves = 5, iterations = 0, id = 0, userId = 0)
    {   
        this.id = id; 
        this.seed = seed;
        this.size = size;
        this.heightScale = heightScale;
        this.octaves = octaves;
        this.iterations = iterations;
        this.userId = userId;
    }

    #perlin(noise, x, y, octaves = 5, persistence = 0.5, lacunarity = 2) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;
    
        for (let i = 0; i < octaves; i++) {
        total += noise.perlin2(x * frequency, y * frequency) * amplitude;
        maxValue += amplitude;
    
        amplitude *= persistence;
        frequency *= lacunarity;
        }
    
        return total / maxValue;  // normalize to [-1,1]
    }

    generateHeightMap () {
        const noise = new Noise(this.seed);
        const heightMap = [];
        for (let y = 0; y < this.size; y++) {
            heightMap[y] = [];
            for (let x = 0; x < this.size; x++) {
                let nx = x / this.size;
                let ny = y / this.size;

                let h = this.#perlin(noise, nx, ny, this.octaves) ;
                h = (h + 1) / 2; // Normalize from [-1, 1] to [0, 1]
                h = Math.pow(h, 2);
                h *= this.heightScale;

                heightMap[y][x] = new Point(x, y, h);

            }
        }
        return heightMap;
    }

    async generateErodedHeightMap() {
        const heightMap = this.generateHeightMap();
        const water = Array(this.size).fill().map(() => Array(this.size).fill(0));
        const sediment = Array(this.size).fill().map(() => Array(this.size).fill(0));
        const maxSediment = 0.05;
        const dissolveRate = 0.01;
        const depositRate = 0.01;
        const rainAmount = 0.01;
        const evaporationRate = 0.5;

        for (let iter = 0; iter < this.iterations; iter++) {
            // Add rain
            for (let y = 0; y < this.size; y++) {
                for (let x = 0; x < this.size; x++) {
                water[y][x] += rainAmount;
                }
            }

            // Process water flow and sediment transport
            for (let y = 0; y < this.size; y++) {
                for (let x = 0; x < this.size; x++) {
                    if (water[y][x] <= 0) continue;

                    // Find lowest neighbor
                    let minHeight = heightMap[y][x].z;
                    let minX = x;
                    let minY = y;
                    const neighbors = [
                        [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
                        [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
                    ];

                    for (const [nx, ny] of neighbors) {
                        if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                        if (heightMap[ny][nx].z < minHeight) {
                            minHeight = heightMap[ny][nx].z;
                            minX = nx;
                            minY = ny;
                        }
                        }
                    }

                    // Calculate slope and move sediment
                    const slope = heightMap[y][x].z - minHeight;
                    if (slope > 0 && (minX !== x || minY !== y)) {
                        const sedimentCapacity = slope * water[y][x] * maxSediment;
                        const dissolved = Math.min(heightMap[y][x].z, dissolveRate * slope);
                        heightMap[y][x].z -= dissolved;
                        sediment[y][x] += dissolved;

                        if (sediment[y][x] > sedimentCapacity) {
                        const deposit = (sediment[y][x] - sedimentCapacity) * depositRate;
                        heightMap[y][x].z += deposit;
                        sediment[y][x] -= deposit;
                        }

                        // Move water and sediment to lowest neighbor
                        water[minY][minX] += water[y][x];
                        sediment[minY][minX] += sediment[y][x];
                        water[y][x] = 0;
                        sediment[y][x] = 0;
                    }
                }
            }

            // Evaporate water
            for (let y = 0; y < this.size; y++) {
                for (let x = 0; x < this.size; x++) {
                    water[y][x] *= evaporationRate;
                    if (sediment[y][x] > 0) {
                        const deposit = sediment[y][x] * depositRate;
                        heightMap[y][x].z += deposit;
                        sediment[y][x] -= deposit;
                    }
                }
            }
        }

        return heightMap;
    }
    
    getBounds(heightMap, scale) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        const size = heightMap.length;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const point = heightMap[y][x];
                const projected = point.projectIsometric(scale, 0, 0);

                minX = Math.min(minX, projected.x);
                maxX = Math.max(maxX, projected.x);
                minY = Math.min(minY, projected.y);
                maxY = Math.max(maxY, projected.y);
                minZ = Math.min(minZ, projected.z);
                maxZ = Math.max(maxZ, projected.z);
            }
        }

        return { minX, maxX, minY, maxY, minZ, maxZ };
    }


    toStreamBuffer() {
        const heightMap = this.generateErodedHeightMap();
        const size = heightMap.length;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext("2d");
        const imageData = ctx.createImageData(size, size);
        const data = imageData.data;
    
        // Find min and max heights to normalize color mapping
        let min = Infinity, max = -Infinity;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (heightMap[y][x].z < min) min = heightMap[y][x].z;
                if (heightMap[y][x].z > max) max = heightMap[y][x].z;
            }
        }
    
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                let normalized = (heightMap[y][x].z - min) / (max - min);
                let grayscale = Math.floor(normalized * 255);
    
                // Set pixel color (RGBA)
                let idx = (y * size + x) * 4;
                data[idx] = grayscale;     
                data[idx + 1] = grayscale; 
                data[idx + 2] = grayscale; 
                data[idx + 3] = 255;       
            }
            
        }
    
        ctx.putImageData(imageData, 0, 0);
        return canvas.createPNGStream();
    }

    toJSON() {
        return {
        id: this.id,
        seed: this.seed,
        size: this.size,
        heightScale: this.heightScale,
        octaves: this.octaves,
        iterations: this.iterations,
        userId: this.userId,
        };
    }
}

module.exports = Terrain;