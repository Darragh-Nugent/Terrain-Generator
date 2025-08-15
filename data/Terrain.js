const Noise = require("noisejs").Noise;
const { createCanvas, loadImage } = require("canvas");
const Point = require("./Point");


class Terrain {
    id;
    heightMap;
    seed;
    size;
    heightScale;
    octaves;
    userId;
    rules;

    constructor(seed, size, heightScale = 10, octaves = 5, id = 0, userId = 0)
    {   
        this.id = id; 
        this.seed = seed;
        this.size = size;
        this.heightScale = heightScale;
        this.octaves = octaves;
        this.userId = userId;

        this.heightMap = this.#generateHeightMap();
    }

    // #generateHeightMap () {
    //     const noise = new Noise(this.seed);
    //     const heightMap = [];
    //     const offset = this.size / 2;
    //     for (let y = 0; y < this.size; y++) {
    //         heightMap[y] = [];
    //         for (let x = 0; x < this.size; x++) {
    //             let nx = x / this.size;
    //             let ny = y / this.size;

    //             let h = this.#perlin(noise, nx, ny, this.octaves) * this.heightScale;
    //             // h = Math.pow(h, 2);

    //             heightMap[y][x] = new Point(x - offset, y - offset, h);
    //         }
    //     }
    //     return heightMap;
    // }

    #generateHeightMap() {
        const noise = new Noise(this.seed);
        const heightMap = [];
        const offset = this.size / 2;

        let min = Infinity;
        let max = -Infinity;

        // 1. Generate raw heights & track min/max
        for (let y = 0; y < this.size; y++) {
            heightMap[y] = [];
            for (let x = 0; x < this.size; x++) {
                let nx = x / this.size;
                let ny = y / this.size;

                let h = this.#perlin(noise, nx, ny, this.octaves);
                min = Math.min(min, h);
                max = Math.max(max, h);

                heightMap[y][x] = new Point(x - offset, y - offset, h); // store unscaled for now
            }
        }

        // 2. Normalize and apply heightScale
        const range = max - min || 1; // avoid div by 0

        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                let normalized = (heightMap[y][x].z - min) / range; // [0, 1]
                heightMap[y][x].z = normalized * this.heightScale;  // [0, heightScale]
                heightMap[y][x].z = Math.pow(normalized, 1.2) * this.heightScale;

            }
        }

        return heightMap;
    }

    #perlin(noise, x, y, octaves = 5, persistence = 0.5, lacunarity = 2) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;
    
        for (let i = 0; i < octaves; i++) {
        total += noise.perlin2(x * frequency, y * frequency) * amplitude;
        maxValue += amplitude;
    
        amplitude *= persistence;   // decrease amplitude each octave
        frequency *= lacunarity;    // increase frequency each octave
        }
    
        return total / maxValue;  // normalize to [-1,1]
    }

    getBounds() {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        for (let row of this.heightMap) {
            for (let point of row) {
                minX = Math.min(minX, point.x);
                maxX = Math.max(maxX, point.x);
                minY = Math.min(minY, point.y);
                maxY = Math.max(maxY, point.y);
            }
        }
        return { minX, minY, maxX, maxY };
    }

    getIsometricBounds(scale = 1) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    const bounds = this.getBounds();

    for (let row of this.heightMap) {
        for (let point of row) {
            const projected = point.projectIsometricRaw(scale, bounds.minX, bounds.minY);
            minX = Math.min(minX, projected.x);
            maxX = Math.max(maxX, projected.x);
            minY = Math.min(minY, projected.y);
            maxY = Math.max(maxY, projected.y);
        }
    }

    return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
        offsetX: -minX,
        offsetY: -minY
    };
}


    toStreamBuffer() {
        const size = this.heightMap.length;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext("2d");
        const imageData = ctx.createImageData(size, size);
        const data = imageData.data;
    
        // Find   and max heights to normalize color mapping
        let min = Infinity, max = -Infinity;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (this.heightMap[y][x].z < min) min = this.heightMap[y][x].z;
                if (this.heightMap[y][x].z > max) max = this.heightMap[y][x].z;
            }
        }
    
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                let normalized = (this.heightMap[y][x].z - min) / (max - min); // map from [-1,1] to [0,1]
                let grayscale = Math.floor(normalized * 255);
    
                // Set pixel color (RGBA)
                let idx = (y * size + x) * 4;
                data[idx] = grayscale;     // R
                data[idx + 1] = grayscale; // G
                data[idx + 2] = grayscale; // B
                data[idx + 3] = 255;       // A (opaque)
            }
            
        }
    
        ctx.putImageData(imageData, 0, 0);
        // return canvas.toBuffer("image/png");
        return canvas.createPNGStream();
    }

    toJSON() {
        return {
        id: this.id,
        seed: this.seed,
        size: this.size,
        heightScale: this.heightScale,
        octaves: this.octaves,
        userId: this.userId,
        };
    }
}

module.exports = Terrain;