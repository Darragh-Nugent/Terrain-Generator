require('dotenv').config();
const express = require("express");
const cors = require("cors");
const cookieParser = require('cookie-parser');

const userRoutes = require("./routes/userRoutes");
const authRouter = require("./routes/authRoutes");
const healthCheckRouter = require('./routes/healthcheckRoutes');

const app = express();
const port = process.env.PORT || 3003;

app.use(express.json());
app.use(cors());
app.use(cookieParser());

// Mount only the terrain routes
app.use("/user", userRoutes);
app.use("/auth",authRouter);
app.use('/healthcheck',healthCheckRouter)

app.listen(port, "0.0.0.0", () => {
  console.log(`Data service listening on port ${port}`);
});
