const { createCanvas, loadImage } = require("canvas");
const sharp = require("sharp");
const terrainModel = require("../models/terrainModel");
const Terrain = require("../data/Terrain");

const scale = 4;

async function addTerrain(req, res) {
  const userId = req.user.id;   // from JWT middleware
  const { seed, size, heightScale, octaves } = req.body;

  try {
    const newTerrain = await terrainModel.addTerrain(seed, size, heightScale, octaves, userId);
    res.status(201).json(newTerrain);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteTerrain(req, res) {
  const userId = req.user.id;
  const {id} = req.body;

  try {
    const terrain = await terrainModel.getFromUser(id, userId)
    if (!terrain) return res.status(401).json({ message: 'This user has no terrain with that id' });
    await terrainModel.deleteTerrain(id);
    res.status(201).json(terrain);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getAllFromUser(req, res) {
  const userId = req.user.id; 

  try {
    const terrains = await terrainModel.getAllFromUser(userId);
    if (!terrains) return res.status(404).json({error: 'There are no terrains for this user'});
    res.status(201).json(terrains);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
  
}

// Render the wireframe mesh
function renderWireframe(heightMap, width, height, scale) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#222222";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#00ff00";
  ctx.lineWidth = 1;

  const size = heightMap.length;

  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      // const v0 = project3D(x, y, heightMap[y][x].z, width, height);
      // const v1 = project3D(x + 1, y, heightMap[y][x + 1].z, width, height);
      // const v2 = project3D(x, y + 1, heightMap[y + 1][x].z, width, height);

      const v0 = heightMap[y][x].projectIsometric(scale, width, height);
      const v1 = heightMap[y][x + 1].projectIsometric(scale, width, height);
      const v2 = heightMap[y + 1][x].projectIsometric(scale, width, height);

      ctx.beginPath();
      ctx.moveTo(v0.x, v0.y);
      ctx.lineTo(v1.x, v1.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(v0.x, v0.y);
      ctx.lineTo(v2.x, v2.y);
      ctx.stroke();
    }
  }

  return canvas.toBuffer("image/png");
}

async function get3DTerrain(req, res, next) {
  try {
    const seed = parseInt(req.query.seed) || 42;
    const size = Math.min(parseInt(req.query.size) || 128, 512);

    const width = size * scale;
    const height = size * scale;

    const terrain = new Terrain(seed, size, 10);
    const imageBuffer = renderWireframe(terrain.heightMap, width, height, scale);

    const scaleFactor = 4;

  sharp(imageBuffer)
  .resize(size * scale, size * scale, { kernel: "lanczos3" }) // upscale smoothly
  .png({ compressionLevel: 9 })
  .toBuffer()
  .then(data => res.type('png').send(data));

    // res.set("Content-Type", "image/png");
    // res.send(imageBuffer);
  } catch (err) {
    next(err);
  }
}

async function getHeightMap(req, res, next) {
    try {
        const seed = parseInt(req.query.seed) || 42;
        const size = Math.min(parseInt(req.query.size) || 128, 512);

        const terrain = new Terrain(seed, size);
        const heightMapBuffer = terrain.toImageBuffer();

        sharp(heightMapBuffer)
        .resize(size * scale, size * scale, { kernel: "lanczos3" }) // upscale smoothly
        .png({ compressionLevel: 5 })
        .toBuffer()
        .then(data => res.type('png').send(data));

    } catch (err) {
    next(err);
  }
}

module.exports = {
  get3DTerrain,
  getHeightMap,
  addTerrain,
  deleteTerrain,
  getAllFromUser
};
