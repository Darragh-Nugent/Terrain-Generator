const { fallingSnow, renderVideo, saveRenderVideo, create3DSimulationBucket, getPresigned3DSimulation } = require('../models/simulationModel')
const path = require('path');
const fs = require('fs');

exports.fallingSnow = async (req, res) => {
    let { initialState, steps, height, windSpeed = 0, windDir = null, minNeighbour, maxNeighbour, id = null } = req.body;
    if (!initialState || !steps || !height || !minNeighbour || !maxNeighbour) return res.status(422).json({ error: "Please enter in a valid value" })
    try {
        if (!windSpeed) windSpeed = 0;
        if (!windDir) windDir = null;
        const falling_snow_coords = fallingSnow(initialState, steps, height, windSpeed, windDir, minNeighbour, maxNeighbour);
        // if user is logged in, save to s3 bucket
        if (id) {
            const success = await saveSimulationData(id, falling_snow_coords);
            if (!success) {
                console.error('Error saving simulation data:', err);
            }
        }
        return res.status(200).json(falling_snow_coords)
    } catch (error) {
        return res.status(400).json({ error: `Something went wrong: ${error.message}` })
    }
}

// chatgpt
exports.fallingSnowVideo = async (req, res) => {
    try {
        await renderVideo(req.body, res);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Render failed" });
    }
};

exports.saveFallingSnowVideo = async (req, res) => {
    try {
        const outputPath = path.join('/videos', 'output.mp4');
        console.log('Saving video to:', outputPath);
        // Create a writable stream to that file
        const writeStream = fs.createWriteStream(outputPath);

        // Await the rendering process
        await saveRenderVideo(req.body, writeStream);
        // Respond with success
        res.status(200).json({ message: 'Video saved successfully', path: outputPath });
    } catch (err) {
        console.error('Error saving video:', err);
        res.status(500).json({ error: 'Failed to render and save video' });
    }
};

exports.showRenderPage = async (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '..', '..', 'client', 'UI', 'render_simulation.html'));
    } catch (err) {
        console.error("Error loading delete page:", err);
        res.status(500).send('Server error');
    }
};

async function saveSimulationData(id, simulationData) {
    try {
        await create3DSimulationBucket(id, simulationData);

        return true;
    } catch (err) {
        console.error('Error saving simulation data:', err);
        return false;
    }
};

exports.getSimulationPresignedUrl = async (req, res) => {
    try {
        const userID = req.params.id;
        const presignedUrl = await getPresigned3DSimulation(userID);
        console.log(presignedUrl,"for: ", userID)
        if (!presignedUrl) {
            return res.status(404).json({ error: 'Simulation data not found' });
        }

        res.status(200).json({ url: presignedUrl });
    } catch (err) {
        console.error('Error generating presigned URL:', err);
        res.status(500).json({ error: 'Failed to generate presigned URL' });
    }
};

