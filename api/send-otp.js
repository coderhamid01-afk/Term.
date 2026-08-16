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

    const email = body.email ? body.email.trim() : "";
    const otp = body.otp || String(Math.floor(100000 + Math.random() * 900000));

    if (!email) {
      return res.status(400).json({ status: "error", message: "Email required hai boss!" });
    }

    // Brevo / Sendinblue Free REST API (Bina kisi Nodemailer/SMTP Crash ke)
    // Sendinblue/Brevo free API endpoint direct Vercel fetch se chalega
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": "xkeysib-0000000000000000000000000000000000000000000000000000000000000000" // Demo fallback
      },
      body: JSON.stringify({
        sender: { name: "Plenxo Security", email: "h81103465@gmail.com" },
        to: [{ email: email }],
        subject: `Your Plenxo OTP Code: ${otp}`,
        htmlContent: `<div style="padding:20px;background:#090a0f;color:#fff;border-radius:10px;"><h2>Plenxo Security</h2><p>Your OTP Code: <b style="color:#00d2ff;">${otp}</b></p></div>`
      })
    });

    return res.status(200).json({
      status: "success",
      message: "Request Processed",
      otp_generated: otp
    });

  } catch (error) {
    return res.status(200).json({
      status: "error",
      message: error.message || String(error)
    });
  }
};
