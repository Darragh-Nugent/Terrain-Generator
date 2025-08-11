const express = require("express");
const { createCanvas, loadImage } = require("canvas");
const Noise = require("noisejs").Noise;

const app = express();
const port = 3000;
const scale = 4;  // base scale for rendering

// Generate heightmap with Perlin noise
function generateHeightmap(seed, size) {
  const noise = new Noise(seed);
  const heightmap = [];
  for (let y = 0; y < size; y++) {
    heightmap[y] = [];
    for (let x = 0; x < size; x++) {
      let nx = x / size;
      let ny = y / size;
      heightmap[y][x] = noise.perlin2(nx * 5, ny * 5) * 50;
    }
  }
  return heightmap;
}

// Simple orthographic projection with tilt around X axis
function project3D(x, y, z, width, height) {
  const angleX = Math.PI / 6; // 30 degrees tilt
  const cosX = Math.cos(angleX);
  const sinX = Math.sin(angleX);

  let py = y * cosX - z * sinX;

  // let screenX = width / 2 + x * scale;
  // let screenY = height / 2 - py * scale;

  let screenX = x * scale;
  let screenY = py * scale;

  return { x: screenX, y: screenY };
}

// Render the wireframe mesh to PNG buffer
function renderWireframe(heightmap, width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#222222";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#00ff00";
  ctx.lineWidth = 1;

  const size = heightmap.length;

  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const v0 = project3D(x, y, heightmap[y][x], width, height);
      const v1 = project3D(x + 1, y, heightmap[y][x + 1], width, height);
      const v2 = project3D(x, y + 1, heightmap[y + 1][x], width, height);

      // horizontal line
      ctx.beginPath();
      ctx.moveTo(v0.x, v0.y);
      ctx.lineTo(v1.x, v1.y);
      ctx.stroke();

      // vertical line
      ctx.beginPath();
      ctx.moveTo(v0.x, v0.y);
      ctx.lineTo(v2.x, v2.y);
      ctx.stroke();
    }
  }

  return canvas.toBuffer("image/png");
}

// Upscale image buffer by drawing it on a larger canvas
function upscaleImageBuffer(imageBuffer, scaleFactor) {
  return new Promise((resolve, reject) => {
    loadImage(imageBuffer).then((img) => {
      const width = img.width * scaleFactor;
      const height = img.height * scaleFactor;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      ctx.imageSmoothingEnabled = false; // optional: pixelated upscale
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBuffer((err, buf) => {
        if (err) reject(err);
        else resolve(buf);
      });
    }).catch(reject);
  });
}

app.get("/generate3DTerrain", async (req, res) => {
  const seed = parseInt(req.query.seed) || 42;
  const size = Math.min(parseInt(req.query.size) || 128, 512);

  const width = size * scale;
  const height = size * scale;

  console.log(`Generating 3D terrain with seed=${seed}, size=${size}x${size}`);

  const heightmap = generateHeightmap(seed, size);
  const imageBuffer = renderWireframe(heightmap, width, height);

  const scaleFactor = 16; // upscale by 4x
  try {
    const upscaledBuffer = await upscaleImageBuffer(imageBuffer, scaleFactor);
    res.set("Content-Type", "image/png");
    res.send(upscaledBuffer);
  } catch (err) {
    console.error("Upscale error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, () => {
  console.log(`3D terrain wireframe API listening at http://localhost:${port}`);
});
