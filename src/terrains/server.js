require('dotenv').config();
const express = require("express");
const cors = require("cors");
const cookieParser = require('cookie-parser');

const terrainRoutes = require("./routes/terrainRoutes");
const styleRoutes = require("./routes/styleRoutes");

const app = express();
const port = process.env.PORT || 3002;

app.use(express.json());
app.use(cors());
app.use(cookieParser());

// Mount only the terrain routes
app.use("/terrain", terrainRoutes);
app.use("/style", styleRoutes);

app.get('/', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Terrain service listening on port ${port}`);
});
