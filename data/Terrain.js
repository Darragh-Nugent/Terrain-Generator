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

    constructor(id = 0, seed, size, heightScale = 10, octaves = 5, userId = 0)
    {   
        this.id = id; 
        this.seed = seed;
        this.size = size;
        this.heightScale = heightScale;
        this.octaves = octaves;
        this.userId = userId;

        this.heightMap = this.#generateHeightMap();
    }

    #generateHeightMap () {
        const noise = new Noise(this.seed);
        const heightMap = [];
        for (let y = 0; y < this.size; y++) {
            heightMap[y] = [];
            for (let x = 0; x < this.size; x++) {
                let nx = x / this.size;
                let ny = y / this.size;

                let h = this.#perlin(noise, nx, ny, this.octaves) * this.heightScale;
                h = Math.pow(h, 2);

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

    toImageBuffer() {
        const size = this.heightMap.length;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext("2d");
        const imageData = ctx.createImageData(size, size);
        const data = imageData.data;
    
        // Find min and max heights to normalize color mapping
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
        return canvas.toBuffer("image/png");
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