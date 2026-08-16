const nodemailer = require("nodemailer");

const APP_NAME = "Plenxo";
const APP_LOGO_URL = "https://i.ibb.co/Xr2DhGdk/file-000000003c1c71f5a61c7d07678568cb.png";

const EMAIL_ACCOUNTS = [
  { user: 'h81103465@gmail.com', pass: 'znnhwzuitevojzya' },
  { user: 'muhammadhamidabdulqadir76@gmail.com', pass: 'xlsaifjadtlvroyq' },
  { user: 'coderhamid01@gmail.com', pass: 'onlfimidhwoemeax' },
  { user: 'khanokijaan@gmail.com', pass: 'ouxohqbikbnrueop' },
  { user: 'omeedtv8@gmail.com', pass: 'aymudghezvqppdby' }
];

const VALID_ACTIONS = new Set([
  "signup", "login", "forgot_password", "forgotpassword", "delete_account", "deleteaccount"
]);

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function getNextOtpCounter() {
  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) return null;

    const url = `${redisUrl.replace(/\/+$/, "")}/incr/plenxo_total_emails`;
    
    // Using globalThis.fetch to avoid Node runtime mismatch
    const fetchFn = typeof fetch !== "undefined" ? fetch : globalThis.fetch;
    if (!fetchFn) return null;

    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) return null;
    const data = await response.json();
    return Number(data.result) || null;
  } catch (err) {
    console.log("Redis bypassed:", err.message);
    return null;
  }
}

function buildEmailHtml(title, otpCode, themeColor) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background-color:#090a0f;font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:40px 20px;color:#fff;">
<div style="max-width:500px;margin:0 auto;background:#121622;border:1px solid #1f263d;border-radius:24px;padding:45px 35px;text-align:center;">
  <div style="margin-bottom:25px;">
    <img src="${APP_LOGO_URL}" alt="Plenxo" width="70" height="70" style="border-radius:18px;border:2px solid ${themeColor};object-fit:cover;background:#1a2035;display:inline-block;">
    <div style="font-size:26px;font-weight:900;color:${themeColor};letter-spacing:2px;margin-top:10px;text-transform:uppercase;">${APP_NAME}</div>
  </div>
  <h2 style="color:#fff;font-size:24px;margin:0 0 15px;font-weight:700;">${title}</h2>
  <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 30px;">Use the verification code below to process your request securely.</p>
  <div style="background:rgba(255,255,255,.05);border:2px solid ${themeColor};border-radius:16px;padding:20px;font-size:40px;font-weight:900;letter-spacing:12px;color:${themeColor};margin:25px 0;">${otpCode}</div>
  <p style="color:#64748b;font-size:13px;margin-top:20px;">Valid for <strong>10 minutes</strong>. Do not share this code.</p>
  <div style="font-size:11px;color:#475569;margin-top:40px;border-top:1px solid #1e293b;padding-top:25px;">&copy; 2026 ${APP_NAME}. All rights reserved.</div>
</div>
</body>
</html>`;
}

function getEmailContent(action, otp) {
  switch (action) {
    case "login":
      return { title: "2FA Security Verification", themeColor: "#8b5cf6", subject: `Security Alert: ${otp} is your 2FA Login Code` };
    case "forgot_password":
    case "forgotpassword":
      return { title: "Password Reset Request", themeColor: "#f59e0b", subject: `${APP_NAME} Password Reset Request - ${otp}` };
    case "delete_account":
    case "deleteaccount":
      return { title: "Account Deletion Warning", themeColor: "#ef4444", subject: `URGENT: ${APP_NAME} Account Deletion Request - ${otp}` };
    default:
      return { title: "Welcome to Plenxo!", themeColor: "#00d2ff", subject: `${otp} is your ${APP_NAME} Account Verification Code` };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Method Not Allowed" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch(e) {}
    }
    body = body || {};

    const email = typeof body.email === "string" ? body.email.trim() : "";
    const purpose = typeof body.purpose === "string" ? body.purpose.trim().toLowerCase() : "signup";
    const clientOtp = body.otp ?? body.otp_code ?? null;

    if (!isValidEmail(email)) {
      return res.status(400).json({ status: "error", message: "Valid email address is required" });
    }

    if (!VALID_ACTIONS.has(purpose)) {
      return res.status(400).json({ status: "error", message: "Invalid purpose." });
    }

    let finalOtp = (clientOtp && /^\d{6}$/.test(String(clientOtp).trim())) ? String(clientOtp).trim() : generateOTP();

    let totalEmailsSent = await getNextOtpCounter();

    const rotationNumber = Number.isFinite(totalEmailsSent) && totalEmailsSent > 0 ? totalEmailsSent : Date.now();
    const accountIndex = Math.floor((rotationNumber - 1) / 499) % EMAIL_ACCOUNTS.length;
    const selectedAccount = EMAIL_ACCOUNTS[accountIndex];

    const content = getEmailContent(purpose, finalOtp);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: selectedAccount.user,
        pass: selectedAccount.pass
      }
    });

    const info = await transporter.sendMail({
      from: `"${APP_NAME} Security" <${selectedAccount.user}>`,
      to: email,
      subject: content.subject,
      html: buildEmailHtml(content.title, finalOtp, content.themeColor),
      priority: "high"
    });

    return res.status(200).json({
      status: "success",
      message: "OTP sent successfully",
      details: {
        purpose,
        email_target: email,
        sent_via: selectedAccount.user,
        global_rotation_count: totalEmailsSent,
        message_id: info.messageId
      }
    });

  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error_detail: error instanceof Error ? error.message : String(error)
    });
  }
};
