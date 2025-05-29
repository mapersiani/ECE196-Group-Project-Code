require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const bodyParser = require("body-parser");
const app = express();

// ─── Session & body-parser setup ─────────────────────
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(bodyParser.urlencoded({ extended: false }));

// ─── Serve login assets ───────────────────────────────
app.get("/login", (req, res) =>
  res.sendFile(path.join(__dirname, "../www/login.html"))
);
app.use("/login.css", express.static(path.join(__dirname, "../www/login.css")));
app.use("/login.js", express.static(path.join(__dirname, "../www/login.js")));

// ─── Login handler ────────────────────────────────────
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    req.session.authenticated = true;
    return res.redirect("/");
  }
  res.redirect("/login?error=1");
});

// ─── Auth middleware ──────────────────────────────────
app.use((req, res, next) => {
  // allow these paths without auth
  const publicPaths = [
    "/login",
    "/login.css",
    "/login.js",
    "/manifest.json",
    "/sw.js",
  ];
  if (publicPaths.includes(req.path)) return next();

  if (req.session.authenticated) return next();
  res.redirect("/login");
});

// ─── Static & other routes ───────────────────────────
app.use(express.static(path.join(__dirname, "../www")));

// (your existing subscribe/MQTT bridge logic here…)

app.listen(3000, "0.0.0.0", () =>
  console.log("Server running at http://0.0.0.0:3000")
);
