const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "admindb",
});

connection.connect((err) => {
  if (err) throw err;
  console.log("Connected to MySQL");
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Not an image! Please upload an image.", 400), false);
    }
  },
});

function isAuthenticated(req, res, next) {
  if (req.session.loggedin) {
    return next();
  } else {
    res.redirect("/login");
  }
}

app.get("/login", (req, res) => {
  res.render("login", { message: "" });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username && password) {
    connection.query(
      "SELECT * FROM admins WHERE username = ?",
      [username],
      (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
          const user = results[0];
          bcrypt.compare(password, user.password, (err, match) => {
            if (err) throw err;
            if (match) {
              req.session.loggedin = true;
              req.session.username = username;
              res.redirect("/crud");
            } else {
              res.render("login", {
                message: "Incorrect Username and/or Password!",
              });
            }
          });
        } else {
          res.render("login", {
            message: "Incorrect Username and/or Password!",
          });
        }
      }
    );
  } else {
    res.render("login", { message: "Please enter Username and Password!" });
  }
});

app.get("/crud", isAuthenticated, (req, res) => {
  connection.query("SELECT * FROM products", (err, results) => {
    if (err) throw err;
    res.render("crud", { products: results });
  });
});

app.get("/add", isAuthenticated, (req, res) => {
  res.render("add");
});

app.get("/edit/:id", isAuthenticated, (req, res) => {
  const { id } = req.params;
  connection.query(
    "SELECT * FROM products WHERE id = ?",
    [id],
    (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
        res.render("edit", { product: results[0] });
      } else {
        res.redirect("/crud");
      }
    }
  );
});

app.post("/add", isAuthenticated, upload.single("image"), (req, res) => {
  const { name, price } = req.body;
  const image = req.file.filename;
  connection.query(
    "INSERT INTO products (name, price, image) VALUES (?, ?, ?)",
    [name, price, image],
    (err) => {
      if (err) throw err;
      res.redirect("/crud");
    }
  );
});

app.post("/edit/:id", isAuthenticated, upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;
  const image = req.file ? req.file.filename : null;
  let sql = "UPDATE products SET name = ?, price = ?";
  const params = [name, price];
  if (image) {
    sql += ", image = ?";
    params.push(image);
  }
  sql += " WHERE id = ?";
  params.push(id);

  connection.query(sql, params, (err) => {
    if (err) throw err;
    res.redirect("/crud");
  });
});

app.post("/delete/:id", isAuthenticated, (req, res) => {
  const { id } = req.params;
  connection.query("DELETE FROM products WHERE id = ?", [id], (err) => {
    if (err) throw err;
    res.redirect("/crud");
  });
});

app.get("/", (req, res) => {
  connection.query("SELECT * FROM products", (err, results) => {
    if (err) throw err;
    res.render("index", { products: results });
  });
});

app.get("/login", (req, res) => {
  res.render("login", { message: "" });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
