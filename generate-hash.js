const bcrypt = require("bcryptjs");

const password = "123"; // Ganti dengan password yang Anda inginkan
bcrypt.hash(password, 10, (err, hash) => {
  if (err) throw err;
  console.log("Hashed password:", hash);
});
