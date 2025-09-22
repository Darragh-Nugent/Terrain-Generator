const express = require("express");
const router = express.Router();
const terrainController = require("../controllers/terrainController");
const { authenticateToken } = require('../middleware/authMiddleware');
const { authenticateIdToken,authenticateAccessToken } = require('../middleware/cognito');

router.get('/get3DTerrain', authenticateAccessToken, terrainController.get3DTerrain)
router.get('/getHeightMap', terrainController.getHeightMap)
router.get('/getHeightMapImage', authenticateAccessToken, terrainController.getHeightMapImage)

router.get('/getAllTerrainsFromUser', authenticateAccessToken, terrainController.getAllFromUser)
router.post('/addTerrain', authenticateAccessToken, terrainController.addTerrain)
router.post('/editTerrain', authenticateAccessToken, terrainController.editTerrain)
router.delete('/deleteTerrain', authenticateAccessToken, terrainController.deleteTerrain)

router.get('/Terrain-Generator/:id/', authenticateAccessToken, terrainController.showTerrainGenerator)

module.exports = router;
