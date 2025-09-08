const express = require("express");
const router = express.Router();
const terrainController = require("../controllers/terrainController");
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/get3DTerrain', authenticateToken, terrainController.get3DTerrain)
router.get('/getHeightMap', authenticateToken, terrainController.getHeightMap)

router.get('/getAllTerrainsFromUser', authenticateToken, terrainController.getAllFromUser)
router.post('/addTerrain', authenticateToken, terrainController.addTerrain)
router.delete('/deleteTerrain', authenticateToken, terrainController.deleteTerrain)

router.get('/Terrain-Generator/:id/', authenticateToken, terrainController.showTerrainGenerator)

module.exports = router;
