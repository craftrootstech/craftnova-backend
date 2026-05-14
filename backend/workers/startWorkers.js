import dotenv from "dotenv";

dotenv.config();

import mongoose from "mongoose";

console.log(
  "Connecting workers to MongoDB..."
);

await mongoose.connect(

  process.env.MONGO_URI
);

console.log(
  "Workers MongoDB Connected"
);

import "./workflowWorker.js";

console.log(
  "CraftNova workers running..."
);