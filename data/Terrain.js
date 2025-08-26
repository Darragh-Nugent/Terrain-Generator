const Noise = require("noisejs").Noise;
const { createCanvas, loadImage } = require("canvas");
const Point = require("./Point");


class Terrain {
    id;
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
                // h = Math.pow(h, 2) * this.heightScale;
                h = (h + 1) / 2; // Normalize from [-1, 1] to [0, 1]
                h = Math.pow(h, 2); // Optional: emphasize lower terrain
                h *= this.heightScale;

                heightMap[y][x] = new Point(x, y, h);

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
    
    getBounds(heightMap, scale) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        const size = heightMap.length;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const point = heightMap[y][x];
                const projected = point.projectIsometric(scale, 0, 0); // width/height not needed here

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
        const heightMap = this.generateHeightMap();
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
                let normalized = (heightMap[y][x].z - min) / (max - min); // map from [-1,1] to [0,1]
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