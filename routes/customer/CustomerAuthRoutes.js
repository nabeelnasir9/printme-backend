import Customer from "../../models/customer-schema.js";
import { Router } from "express";
import customerMailOptions from "../../utils/mailCustomer.js";
import bcrypt from "bcryptjs";
import transporter from "../../utils/transporter.js";
import jsonwebtoken from "jsonwebtoken";
import otpGenerator from "otp-generator";
const router = Router();

router.post("/signup", async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    let customer = await Customer.findOne({ email });
    if (customer) {
      return res.status(400).json({ message: "User already exists" });
    }

    const otp = otpGenerator.generate({
      digits: true,
      alphabets: true,
      upperCase: true,
      specialChars: false,
    });
    const otp_expiry = new Date(Date.now() + 300000);

    customer = new Customer({
      email,
      password,
      full_name,
      otp,
      otp_expiry,
    });

    await customer.save();

    transporter.sendMail(
      customerMailOptions(email, otp, full_name),
      (error) => {
        if (error) {
          return res.status(500).json({ message: "Error sending email" });
        }
        res.status(200).json({ message: "OTP sent to your email" });
      },
    );
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error", err });
  }
});

// POST /api/auth/customer/verify-otp (customer)
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const customer = await Customer.findOne({ email });

    if (!customer) {
      return res.status(400).json({ message: "User not found" });
    }

    const current = new Date();
    if (current > customer.otp_expiry) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (customer.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    customer.verified_email = true;
    customer.otp = null;
    customer.otp_expiry = null;
    await customer.save();
    const payload = {
      user: {
        id: customer.id,
        role: "customer",
      },
    };
    jsonwebtoken.sign(
      payload,
      process.env.JWT_SECRET,
      //INFO: revert it back after dev to 5h
      { expiresIn: "10 days" },
      (err, token) => {
        if (err) throw err;
        res.json({ message: "OTP verified successfully", token });
      },
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error", err });
  }
});

// POST /api/auth/customer/login (customer)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(400).json({ message: "User not found" });
    }
    if (!customer.verified_email) {
      return res.status(400).json({ message: "Email not verified" });
    }
    if (!customer.password) {
      return res.status(400).json({ message: "Password not set" });
    }
    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }
    const payload = {
      user: {
        id: customer.id,
        role: "customer",
      },
    };
    jsonwebtoken.sign(
      payload,
      process.env.JWT_SECRET,
      //INFO: revert it back after dev to 5h
      { expiresIn: "10 days" },
      (err, token) => {
        if (err) throw err;
        res
          .status(200)
          .json({ message: "Logged in successfully", token, customer });
      },
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error", err });
  }
});

export default router;
