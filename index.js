import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import morgan from "morgan";

import customerRoutes from "./routes/customer/customerRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import printAgentRoutes from "./routes/print-agent/printAgentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import printJobRoutes from "./routes/printjobRoutes.js";

const app = express();
const port = process.env.PORT || 5000;
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use("/api/customer", customerRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/print-agent", printAgentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/printjob", printJobRoutes);

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on ${port}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
