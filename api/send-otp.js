const nodemailer = require("nodemailer");

// Accounts List (Limit bypass karne ke liye)
const EMAIL_ACCOUNTS = [
  { user: 'h81103465@gmail.com', pass: 'znnhwzuitevojzya' },
  { user: 'muhammadhamidabdulqadir76@gmail.com', pass: 'xlsaifjadtlvroyq' },
  { user: 'coderhamid01@gmail.com', pass: 'onlfimidhwoemeax' },
  { user: 'khanokijaan@gmail.com', pass: 'ouxohqbikbnrueop' },
  { user: 'omeedtv8@gmail.com', pass: 'aymudghezvqppdby' }
];

module.exports = async function handler(req, res) {
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

    // Direct Round-Robin Rotation based on timestamp (Har request par agla account auto-select hoga)
    const randomIndex = Math.floor(Math.random() * EMAIL_ACCOUNTS.length);
    const selectedAccount = EMAIL_ACCOUNTS[randomIndex];

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: selectedAccount.user,
        pass: selectedAccount.pass
      }
    });

    const info = await transporter.sendMail({
      from: `"Plenxo Security" <${selectedAccount.user}>`,
      to: email,
      subject: `Your Plenxo OTP Code: ${otp}`,
      html: `<div style="background:#090a0f;color:#fff;padding:25px;border-radius:12px;text-align:center;font-family:sans-serif;">
              <h2 style="color:#00d2ff;">Plenxo Verification</h2>
              <p style="font-size:16px;">Your verification OTP code is:</p>
              <h1 style="color:#00d2ff;letter-spacing:6px;font-size:32px;">${otp}</h1>
              <p style="font-size:12px;color:#888;">Valid for 10 minutes. Do not share this code.</p>
             </div>`
    });

    return res.status(200).json({
      status: "success",
      message: "OTP Sent Successfully!",
      sent_via: selectedAccount.user,
      otp_sent: otp,
      messageId: info.messageId
    });

  } catch (error) {
    // Zero crash Guarantee - SMTP error clean response dega
    return res.status(200).json({
      status: "error",
      message: "Rotation SMTP Failed",
      reason: error.message || String(error)
    });
  }
};
