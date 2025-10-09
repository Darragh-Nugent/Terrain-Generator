require('dotenv').config();
const express = require("express");
const cors = require("cors");
const cookieParser = require('cookie-parser');

const simulationRouter = require('./routes/simulationRoutes');

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());
app.use(cookieParser());

// Mount only the terrain routes
app.use('/simulation', simulationRouter);

app.listen(port, "0.0.0.0", () => {
  console.log(`Snow service listening on port ${port}`);
});
