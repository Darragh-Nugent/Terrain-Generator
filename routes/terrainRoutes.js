const express = require("express");
const router = express.Router();
const terrainController = require("../controllers/terrainController");
const authMiddleware = require('../middleware/authMiddleware');

router.get('/get3DTerrain', authMiddleware.authenticateJWT, terrainController.get3DTerrain)
router.get('/getHeightMap', authMiddleware.authenticateJWT, terrainController.getHeightMap)

router.get('/getAllTerrainsFromUser', authMiddleware.authenticateJWT, terrainController.getAllFromUser)
router.post('/addTerrain', authMiddleware.authenticateJWT, terrainController.addTerrain)
router.delete('/deleteTerrain', authMiddleware.authenticateJWT, terrainController.deleteTerrain)



module.exports = router;
