const nodemailer = require("nodemailer");

// Upstash Credentials
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "https://amused-escargot-112889.upstash.io";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "gQAAAAAAAbj5AAIgcDE1ZGJlZmEyNjJiYzA0M2RiOTJjZGU5NzY4ZjI4YzZhMQ";

// 5 Gmail Accounts Rotation List
const EMAIL_ACCOUNTS = [
  { user: 'h81103465@gmail.com', pass: 'znnhwzuitevojzya' },
  { user: 'muhammadhamidabdulqadir76@gmail.com', pass: 'xlsaifjadtlvroyq' },
  { user: 'coderhamid01@gmail.com', pass: 'onlfimidhwoemeax' },
  { user: 'khanokijaan@gmail.com', pass: 'ouxohqbikbnrueop' },
  { user: 'omeedtv8@gmail.com', pass: 'aymudghezvqppdby' }
];

// Upstash Counter Incrementor
async function getNextCounter() {
  try {
    const cleanUrl = UPSTASH_URL.replace(/\/+$/, "");
    const res = await fetch(`${cleanUrl}/incr/plenxo_total_emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });

    if (!res.ok) return Date.now();
    const data = await res.json();
    return Number(data.result) || Date.now();
  } catch (err) {
    return Date.now();
  }
}

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
    const purpose = body.purpose ? body.purpose.trim() : "login";
    const otp = body.otp || String(Math.floor(100000 + Math.random() * 900000));

    if (!email) {
      return res.status(400).json({ status: "error", message: "Email required hai boss!" });
    }

    // 1. Get Upstash Counter
    const count = await getNextCounter();

    // 2. Account Rotation Index (Har 499 mails par switch)
    const accountIndex = Math.floor((count - 1) / 499) % EMAIL_ACCOUNTS.length;
    const selectedAccount = EMAIL_ACCOUNTS[accountIndex];

    // 3. Nodemailer with Serverless Timeout Adjustments (Port 587 + STARTTLS)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: selectedAccount.user,
        pass: selectedAccount.pass
      },
      connectionTimeout: 8000, // 8 sec timeout to prevent Vercel 500 invocation crash
      greetingTimeout: 5000,
      socketTimeout: 8000
    });

    const info = await transporter.sendMail({
      from: `"Plenxo Security" <${selectedAccount.user}>`,
      to: email,
      subject: `Your Plenxo OTP: ${otp}`,
      html: `<div style="padding:25px;background:#090a0f;color:#fff;border-radius:12px;text-align:center;font-family:sans-serif;">
              <h2 style="color:#00d2ff;">Plenxo ${purpose.toUpperCase()} Verification</h2>
              <p style="font-size:15px;">Your verification OTP code is:</p>
              <h1 style="color:#00d2ff;letter-spacing:8px;font-size:36px;margin:20px 0;">${otp}</h1>
              <p style="font-size:12px;color:#888;">Valid for 10 minutes. Do not share this code.</p>
             </div>`
    });

    return res.status(200).json({
      status: "success",
      message: "OTP Sent Successfully!",
      details: {
        email: email,
        sent_via: selectedAccount.user,
        global_count: count,
        messageId: info.messageId
      }
    });

  } catch (error) {
    // 500 error bypass catch block
    return res.status(200).json({
      status: "error",
      message: "Gmail Delivery Exception",
      reason: error.message || String(error)
    });
  }
};
