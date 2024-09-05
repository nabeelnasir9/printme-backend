import express from "express";
const router = express.Router();
import customerAuthRoutes from "./customer/CustomerAuthRoutes.js";
import printAgentAuthRoutes from "./print-agent/printAgentAuthRoutes.js";

router.use("/customer", customerAuthRoutes);
router.use("/print-agent", printAgentAuthRoutes);

export default router;
