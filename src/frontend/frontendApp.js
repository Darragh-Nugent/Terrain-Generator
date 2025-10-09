require('dotenv').config();
const express = require("express");
const cors = require("cors");
const cookieParser = require('cookie-parser');

const indexRouter = require('./indexRoutes');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(cookieParser());

// Mount only the terrain routes
app.use('/', indexRouter)

app.listen(port, "0.0.0.0", () => {
  console.log(`Frontend service listening on port ${port}`);
});
