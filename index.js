const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Plenxo Server Running!");
});

app.post("/api/send-otp", async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    const finalOtp = otp || String(Math.floor(100000 + Math.random() * 900000));

    if (!email) return res.status(400).json({ status: "error", message: "Email required" });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "h81103465@gmail.com",
        pass: "znnhwzuitevojzya"
      }
    });

    await transporter.sendMail({
      from: '"Plenxo Security" <h81103465@gmail.com>',
      to: email,
      subject: `Your Plenxo Code: ${finalOtp}`,
      html: `<h2>OTP: ${finalOtp}</h2>`
    });

    return res.status(200).json({ status: "success", otp: finalOtp });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

app.listen(process.env.PORT || 3000);
