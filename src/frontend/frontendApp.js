require('dotenv').config();
const express = require("express");
const cors = require("cors");
const cookieParser = require('cookie-parser');
const { createProxyMiddleware } = require('http-proxy-middleware');

const indexRouter = require('./indexRoutes');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(cookieParser());

// Proxy API requests starting with /auth to backend API at port 3003
app.use('/auth', createProxyMiddleware({
  target: 'http://localhost:3003',  // your backend API URL
  changeOrigin: true,
}));

// Mount frontend routes
app.use('/', indexRouter);

app.listen(port, "0.0.0.0", () => {
  console.log(`Frontend service listening on port ${port}`);
});
