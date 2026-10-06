const dotenv = require('dotenv');

dotenv.config({ path: "./.env"});

const app = require("./app");
const connectDB = require('./config/database');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1)
});
