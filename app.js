const express = require("express");
const terrainRoutes = require("./routes/terrainRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

//const errorHandler = require("./middleware/errorHandler");

const app = express();
const port = 3000;

app.use(express.json());

app.use("/terrain", terrainRoutes);
app.use("/user", userRoutes);
app.use("/auth", authRoutes);


//app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});