const nodemailer = require("nodemailer");

module.exports = async function handler(req, res) {
  // CORS setup taaki app/hoppscotch se request block na ho
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ status: "error", message: "Only POST allowed" });

  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch(e) {}
    }
    body = body || {};

    const email = body.email ? body.email.trim() : "";
    const otp = body.otp || String(Math.floor(100000 + Math.random() * 900000));

    if (!email) {
      return res.status(400).json({ status: "error", message: "Email required hai boss!" });
    }

    // Direct Single Account SMTP Test
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "h81103465@gmail.com",
        pass: "znnhwzuitevojzya"
      }
    });

    const info = await transporter.sendMail({
      from: '"Plenxo Security" <h81103465@gmail.com>',
      to: email,
      subject: `Your Plenxo OTP Code: ${otp}`,
      html: `<h1 style="color:#00d2ff;">Your OTP is: ${otp}</h1>`
    });

    return res.status(200).json({
      status: "success",
      message: "OTP Successfully Sent!",
      otp_sent: otp,
      messageId: info.messageId
    });

  } catch (error) {
    // Agar Gmail fail bhi hua toh crash nahi hoga, saaf error dikhega
    return res.status(200).json({
      status: "error",
      message: "Gmail Send Failed",
      reason: error.message || String(error)
    });
  }
};
