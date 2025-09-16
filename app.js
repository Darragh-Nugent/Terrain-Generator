require('dotenv').config();

const express = require("express");
const path = require("path");
const cors = require("cors");


const cookieParser = require('cookie-parser');

const terrainRoutes = require("./src/routes/terrainRoutes");
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const styleRoutes = require("./src/routes/styleRoutes");

const simulationRouter = require('./src/routes/simulationRoutes');
const indexRouter = require('./src/routes/indexRoutes');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());
app.use(cookieParser());


app.use(express.static(path.join(__dirname, "client")));

app.use("/terrain", terrainRoutes);
app.use("/user", userRoutes);
app.use("/auth", authRoutes);
app.use("/style", styleRoutes);

app.use('/simulation', simulationRouter);
app.use('/', indexRouter)

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});