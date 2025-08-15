const { createCanvas, loadImage } = require("canvas");
const sharp = require("sharp");
const terrainModel = require("../models/terrainModel");
const ruleModel = require("../models/ruleModel");


const Terrain = require("../data/Terrain");
const Rule = require("../data/Rule.js");

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
  const {id} = req.params;

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

function getTextureFromRule(rules, height)
{
  // if (rules || rules.length > 0)
  // {
  //   rules.forEach(rule => {
  //     if (height < rule.condition) return rule.value;
  //   });
  // }

  return "#00ff00"
}

// Render the wireframe mesh
function renderWireframe(terrain, width, height, scale) {
  const heightMap = terrain.heightMap;
  const { minX, maxX, minY, maxY } = terrain.getBounds(scale);

  // Add padding if you want
  const padding = 20;
  const canvasWidth = Math.ceil(maxX - minX + padding * 2);
  const canvasHeight = Math.ceil(maxY - minY + padding * 2);

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");

  //ctx.strokeStyle = "#00ff00";
  ctx.lineWidth = 1;

  const size = heightMap.length;
  // ctx.translate(0, height/2);
  ctx.translate(-minX + padding, -minY + padding);



  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const point = heightMap[y][x];
      const pointRight = heightMap[y][x + 1];
      const pointBelow = heightMap[y + 1][x];

      const v0 = point.projectIsometric(scale, width, height);
      const v1 = pointRight.projectIsometric(scale, width, height);
      const v2 = pointBelow.projectIsometric(scale, width, height);

      // Color lines based on elevation at v0 (you could also blend between two points for accuracy)
      const color = getTextureFromRule(terrain.rules, point.z);
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

  // return canvas.toBuffer("image/png");
  return canvas.createPNGStream();

}

// async function get3DTerrain(req, res, next) {
//   try {
//     // const seed = parseInt(req.query.seed) || 42;
//     // const size = Math.min(parseInt(req.query.size) || 128, 512);
//     const userId = req.user.id;
//     const {id} = req.params;

//     const terrain = await terrainModel.getFromUser(id, userId);

//     const width = terrain.size * scale;
//     const height = terrain.size * scale;

//     terrain.rules = ruleModel.getTerrainRules(terrain.id);
//     const imageBuffer = renderWireframe(terrain, width, height, scale);

//     const scaleFactor = 4;

//   sharp(imageBuffer)
//   .resize(terrain.size * scale, terrain.size * scale, { kernel: "lanczos3" }) // upscale smoothly
//   .png({ compressionLevel: 9 })
//   .toBuffer()
//   .then(data => res.type('png').send(data));

//     // res.set("Content-Type", "image/png");
//     // res.send(imageBuffer);
//   } catch (err) {
//     next(err);
//   }
// }

// async function getHeightMap(req, res, next) {
//   try {
//     const userId = req.user.id;
//     const {id} = req.params;

//     const terrain = await terrainModel.getFromUser(id, userId);
//     const heightMapBuffer = terrain.toStreamBuffer();
//     console.log("ID", id);

//     sharp(heightMapBuffer)
//     .resize(terrain.size * scale, terrain.size * scale, { kernel: "lanczos3" }) // upscale smoothly
//     .png({ compressionLevel: 5 })
//     .toBuffer()
//     .then(data => res.type('png').send(data));

//   } catch (err) {
//     next(err);
//   }
// }

//balony

async function get3DTerrain(req, res, next) {
  try {
    // const seed = parseInt(req.query.seed) || 42;
    // const size = Math.min(parseInt(req.query.size) || 128, 512);
    const userId = req.user.id;
    const {id} = req.query;

    const terrain = await terrainModel.getFromUser(id, userId);

    const width = terrain.size * scale;
    const height = terrain.size * scale;

    terrain.rules = ruleModel.getTerrainRules(terrain.id);

    const scaleFactor = 4;

    // Stream PNG directly to response using Sharp
    const imageStream = renderWireframe(terrain, width, height, scale);

    res.type('image/png');

    imageStream
      .pipe(sharp()
        .resize(terrain.size * scale, terrain.size * scale, { kernel: "lanczos3" })
        .png({ compressionLevel: 5 })
      )
      .on('error', err => next(err))
      .pipe(res);

    // res.set("Content-Type", "image/png");
    // res.send(imageBuffer);
  } catch (err) {
    next(err);
  }
}

async function getHeightMap(req, res, next) {
  try {
    const userId = req.user.id;
    const {id} = req.query;

    const terrain = await terrainModel.getFromUser(id, userId);

    // Stream PNG directly to response using Sharp
    const heightMapStream = terrain.toStreamBuffer(); // this is a stream

    res.type('image/png');

    heightMapStream
      .pipe(sharp()
        .resize(terrain.size * scale, terrain.size * scale, { kernel: "lanczos3" })
        .png({ compressionLevel: 5 })
      )
      .on('error', err => next(err))
      .pipe(res);

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
