const { createCanvas, } = require("canvas");
const terrainModel = require("../models/terrainModel");
const styleModel = require("../models/styleModel.js");
const path = require('path');

const SCALE = 4;

async function addTerrain(req, res) {
  const userId = req.user.id;
  const { seed, size, heightScale, octaves, iterations, style } = req.body;

  try {
    const newTerrain = await terrainModel.addTerrain(seed, size, heightScale, octaves, iterations, style, userId);
    console.log(newTerrain);
    res.status(201).json(newTerrain);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteTerrain(req, res) {
  const userId = req.user.id;
  const { id } = req.query;

  try {
    const terrain = await terrainModel.getFromUser(id, userId)
    if (!terrain) return res.status(401).json({ message: 'This user has no terrain with that id' });
    await terrainModel.deleteTerrain(id);
    res.status(201).json(terrain);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function editTerrain(req, res) {
  const userId = req.user.id;
  const newTerrain = req.body;

  try {
    const terrain = await terrainModel.getFromUser(newTerrain.id, userId)
    if (!terrain) return res.status(401).json({ message: 'This user has no terrain with that id' });
    await terrainModel.editTerrain(newTerrain, userId);
    
    res.status(201).json(terrain);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getAllFromUser(req, res) {
  const userId = req.user.id;

  try {
    const terrains = await terrainModel.getAllFromUser(userId);
    if (!terrains) return res.status(404).json({ error: 'There are no terrains for this user' });
    res.status(200).json(terrains);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }

}

function getColourFromHeight(style, height, minHeight, maxHeight) {
  const t = (maxHeight - height) / (maxHeight - minHeight);

  for (const rule of style.mapping) {
    if (t <= rule.max) {
      return rule.color;
    }
  }
}

async function getColours(styleQuery) {
  const styles = await styleModel.loadStyles();

  const result = styles.find(style => style.name === styleQuery);
  if (!result) {
    return "#00ff00";
  }
  else {
    console.log(result);
    return result;
  }

}

// Render the wireframe mesh
async function renderWireframe(terrain, width, height, scale, style) {
  const heightMap = await terrain.generateErodedHeightMap();
  const { minX, maxX, minY, maxY, minZ, maxZ } = terrain.getBounds(heightMap, scale);
  const size = heightMap.length;

  const padding = 50;
  const canvasWidth = Math.ceil(maxX - minX + padding * 2);
  const canvasHeight = Math.ceil(maxY - minY + padding * 2);

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");
  ctx.lineWidth = 1;
  ctx.translate(-minX + padding, -minY + padding);

  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const point = heightMap[y][x];
      const pointRight = heightMap[y][x + 1];
      const pointBelow = heightMap[y + 1][x];

      const v0 = point.projectIsometric();
      const v1 = pointRight.projectIsometric();
      const v2 = pointBelow.projectIsometric();

      const color = getColourFromHeight(style, point.z, minZ, maxZ);
      ctx.strokeStyle = color;


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

  return canvas.toBuffer();

}


async function get3DTerrain(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.query;
    const { styleQuery } = req.query;

    if (!await terrainModel.hasTerrain(id, userId)) {
      return res.status(401).json({ message: 'This user has no terrain with that id' });
    }

    if (!await terrainModel.has3DMapBucket(id)) {
      const terrain = await terrainModel.getFromUser(id, userId);
      const style = await getColours(styleQuery);

      const width = terrain.size;
      const height = terrain.size;

      const imageBuffer = await renderWireframe(terrain, width, height, SCALE, style);
      await terrainModel.create3DMapBucket(id, imageBuffer);
    }

    const presignedUrl = await terrainModel.getPresigned3DMapUrl(id);

    res.json({ url: presignedUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getHeightMapImage(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.query;

    if (!await terrainModel.hasTerrain(id, userId)) {
      return res.status(401).json({ message: 'This user has no terrain with that id' });
    }

    if (!await terrainModel.hasHeightMapBucket(id)) {
      const terrain = await terrainModel.getFromUser(id, userId);
      const heightMapBuffer = terrain.toBuffer();
      await terrainModel.createHeightMapBucket(id, heightMapBuffer);
    }

    const presignedUrl = await terrainModel.getPresignedHeightMapUrl(id);

    res.json({ url: presignedUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getHeightMap(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.query;

    const terrain = await terrainModel.getFromUser(1, 1);

    const heightMap = terrain.generateErodedHeightMap();

    res.status(201).json({ heightMap });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function showTerrainGenerator(req, res, next) {
  try {
    res.sendFile(path.join(__dirname, '..', '..', 'client', 'UI', 'terrain.html'));
  } catch (err) {
    console.error("Error loading terrain generator page:", err);
    res.status(500).send('Server error');
  }
}

module.exports = {
  get3DTerrain,
  getHeightMap,
  getHeightMapImage,
  addTerrain,
  deleteTerrain,
  editTerrain,
  getAllFromUser,
  showTerrainGenerator
};
