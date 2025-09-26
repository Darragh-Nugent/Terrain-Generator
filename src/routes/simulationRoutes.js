const express = require('express');
const path = require('path');
const router = express.Router();
const { authenticateAccessToken } = require('../middleware/cognito');
const {fallingSnow,fallingSnowVideo, showRenderPage,saveFallingSnowVideo, getSimulationPresignedUrl} = require('../controllers/simulationController');

router.post('/falling-snow-calculation', fallingSnow);
router.get("/simulation-snow-page", (req, res) => {
   res.sendFile(path.join(__dirname,"..", '..',"client", 'UI', "cloud.html"));
});
router.post('/simulation-snowfall-video', fallingSnowVideo);
router.post('/save-snowfall-simulation',saveFallingSnowVideo);


router.get("/3d-snowfall-simulation", showRenderPage);  
router.get('/3d-simulation-url/:id', authenticateAccessToken, getSimulationPresignedUrl);  

module.exports = router;