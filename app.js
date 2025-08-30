const express = require("express");
const path = require("path");
const cors = require("cors");

const terrainRoutes = require("./routes/terrainRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const styleRoutes = require("./routes/styleRoutes");

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, "client")));

app.use("/terrain", terrainRoutes);
app.use("/user", userRoutes);
app.use("/auth", authRoutes);
app.use("/style", styleRoutes);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});