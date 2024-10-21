const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const PrintAgent = require("../models/print-agent-schema.js");
const verifyToken = require("../middleware/verifyToken.js");
const calculateCost = require("../utils/calculateCost.js");
const uploadToCloudinary = require("../utils/uploadCloudinary.js");
const {
  sendCustomerConfirmationEmail,
  sendPrintAgentNotificationEmail,
} = require("../utils/mailOrder.js");
const transporter = require("../utils/transporter.js");
const PrintJob = require("../models/print-job-schema.js");
const otpGenerator = require("otp-generator");
const Customer = require("../models/customer-schema.js");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/create-print-job",
  verifyToken("customer"),
  upload.single("file"),
  async (req, res) => {
    try {
      let { print_job_title, print_job_description, is_color } = req.body;

      is_color = is_color === "true";

      if (typeof is_color !== "boolean") {
        return res
          .status(400)
          .json({ message: "Please define if it is colored or not" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const customer = await Customer.findById(req.user.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      let stripeCustomerId = customer.stripe_customer_id;
      if (!stripeCustomerId) {
        const stripeCustomer = await stripe.customers.create({
          email: customer.email,
          name: customer.full_name,
        });
        stripeCustomerId = stripeCustomer.id;
        customer.stripe_customer_id = stripeCustomerId;
        await customer.save();
      }

      const result = await uploadToCloudinary(req.file.buffer);
      const file_path = result.secure_url;
      let pages = 1;

      if (result.format === "pdf") {
        const pdfInfo = await cloudinary.api.resource(result.public_id, {
          pages: true,
        });
        pages = pdfInfo.pages || 1;
      }

      const createdAt = new Date();
      const total_cost = calculateCost(pages, is_color, createdAt);

      const printJob = new PrintJob({
        customer_id: req.user.id,
        print_job_title,
        print_job_description,
        file_path,
        is_color,
        pages,
        total_cost,
        created_at: createdAt,
      });

      await printJob.save();

      res
        .status(201)
        .json({ message: "Print job created successfully", printJob });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: "Server error", err: err.message });
    }
  },
);

router.post(
  "/select-print-agent/:jobId",
  verifyToken("customer"),
  async (req, res) => {
    try {
      const { print_agent_id } = req.body;
      const printJob = await PrintJob.findById(req.params.jobId);

      if (!printJob) {
        return res.status(404).json({ message: "Print job not found" });
      }

      printJob.print_agent_id = print_agent_id;
      await printJob.save();

      res
        .status(200)
        .json({ message: "Print agent selected successfully", printJob });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: "Server error", err });
    }
  },
);

router.post("/initiate-payment", verifyToken("customer"), async (req, res) => {
  try {
    const { payment_method_id, job_id } = req.body;
    const printJob = await PrintJob.findById(job_id);
    const customer = await Customer.findById(req.user.id);

    if (!printJob) {
      return res.status(404).json({ message: "Print job not found" });
    }

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    let stripeCustomerId = customer.stripe_customer_id;
    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: customer.full_name,
      });
      stripeCustomerId = stripeCustomer.id;
      customer.stripe_customer_id = stripeCustomerId;
      await customer.save();
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(printJob.total_cost * 100),
      currency: "usd",
      customer: stripeCustomerId,
      payment_method: payment_method_id,
      return_url: "http://localhost:5173",
      setup_future_usage: "off_session",
      confirm: true,
      description: `Payment for Print Job: ${printJob.print_job_title}`,
      metadata: {
        print_job_id: printJob._id.toString(),
        customer_id: customer._id.toString(),
      },
    });

    if (paymentIntent.status === "succeeded") {
      // printJob.payment_status = "completed";

      const confirmationCode = otpGenerator.generate(6, {
        digits: true,
        upperCase: true,
        specialChars: false,
      });
      printJob.confirmation_code = confirmationCode;
      await printJob.save();

      const customerEmailPromise = sendCustomerConfirmationEmail(
        customer.email,
        customer.full_name,
        confirmationCode,
        printJob.print_job_title,
        transporter,
      );

      const printAgent = await PrintAgent.findById(printJob.print_agent_id);
      const printAgentEmailPromise = sendPrintAgentNotificationEmail(
        printAgent.email,
        printAgent.full_name,
        printJob.print_job_title,
        transporter,
      );

      await Promise.all([customerEmailPromise, printAgentEmailPromise]);

      res.status(200).json({
        message: "Payment successful and emails sent",
        confirmationCode,
        payment_intent: paymentIntent.id,
      });
    } else {
      res.status(400).json({
        message: "Payment not successful",
        status: paymentIntent.status,
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error", err: err.message });
  }
});

router.post(
  "/complete-print-job",
  verifyToken("printAgent"),
  async (req, res) => {
    try {
      const { confirmation_code } = req.body;

      const printJob = await PrintJob.findOne({ confirmation_code });

      if (!printJob) {
        return res.status(404).json({ message: "Print job not found" });
      }

      printJob.status = "completed";
      await printJob.save();

      res
        .status(200)
        .json({ message: "Print job completed successfully", printJob });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: "Server error", err });
    }
  },
);

module.exports = router;
