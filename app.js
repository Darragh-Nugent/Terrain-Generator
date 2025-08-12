const express = require("express");
const path = require("path");
const cors = require("cors");

const terrainRoutes = require("./routes/terrainRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

//const errorHandler = require("./middleware/errorHandler");

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

app.use("/terrain", terrainRoutes);
app.use("/user", userRoutes);
app.use("/auth", authRoutes);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.resolve()
  app.use(express.static(path.join(__dirname, 'client', 'dist')))
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'))
  })
}


//app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});