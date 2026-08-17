const tls = require('tls');

// Upstash Redis Credentials
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "https://amused-escargot-112889.upstash.io";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "gQAAAAAAAbj5AAIgcDE1ZGJlZmEyNjJiYzA0M2RiOTJjZGU5NzY4ZjI4YzZhMQ";

// Tumhare Apne 5 Gmail Accounts + App Passwords
const EMAIL_ACCOUNTS = [
  { user: 'h81103465@gmail.com', pass: 'znnhwzuitevojzya' },
  { user: 'muhammadhamidabdulqadir76@gmail.com', pass: 'xlsaifjadtlvroyq' },
  { user: 'coderhamid01@gmail.com', pass: 'onlfimidhwoemeax' },
  { user: 'khanokijaan@gmail.com', pass: 'ouxohqbikbnrueop' },
  { user: 'omeedtv8@gmail.com', pass: 'aymudghezvqppdby' }
];

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

// Pure Native TLS Connection to Gmail SMTP (No External Libraries / No Nodemailer)
function sendSmtpEmail(account, to, otp, purpose) {
  return new Promise((resolve, reject) => {
    const client = tls.connect(465, 'smtp.gmail.com', { rejectUnauthorized: false }, () => {
      let step = 0;

      const authUser = Buffer.from(account.user).toString('base64');
      const authPass = Buffer.from(account.pass).toString('base64');

      const emailData = 
        `From: "Plenxo Security" <${account.user}>\r\n` +
        `To: ${to}\r\n` +
        `Subject: Your Plenxo OTP: ${otp}\r\n` +
        `Content-Type: text/html; charset=utf-8\r\n\r\n` +
        `<div style="padding:25px;background:#090a0f;color:#fff;border-radius:12px;text-align:center;font-family:sans-serif;">` +
        `<h2 style="color:#00d2ff;">Plenxo ${purpose.toUpperCase()} Verification</h2>` +
        `<p style="font-size:15px;">Your verification OTP code is:</p>` +
        `<h1 style="color:#00d2ff;letter-spacing:8px;font-size:36px;margin:20px 0;">${otp}</h1>` +
        `<p style="font-size:12px;color:#888;">Valid for 10 minutes. Do not share this code.</p>` +
        `</div>\r\n.`;

      client.on('data', (data) => {
        const response = data.toString();
        if (step === 0 && response.startsWith('220')) {
          client.write('EHLO gmail.com\r\n');
          step++;
        } else if (step === 1 && response.startsWith('250')) {
          client.write('AUTH LOGIN\r\n');
          step++;
        } else if (step === 2 && response.startsWith('334')) {
          client.write(authUser + '\r\n');
          step++;
        } else if (step === 3 && response.startsWith('334')) {
          client.write(authPass + '\r\n');
          step++;
        } else if (step === 4 && response.startsWith('235')) {
          client.write(`MAIL FROM:<${account.user}>\r\n`);
          step++;
        } else if (step === 5 && response.startsWith('250')) {
          client.write(`RCPT TO:<${to}>\r\n`);
          step++;
        } else if (step === 6 && response.startsWith('250')) {
          client.write('DATA\r\n');
          step++;
        } else if (step === 7 && response.startsWith('354')) {
          client.write(emailData + '\r\n');
          step++;
        } else if (step === 8 && response.startsWith('250')) {
          client.write('QUIT\r\n');
          resolve({ success: true, message: 'Mail sent via Gmail App Password' });
        }
      });
    });

    client.on('error', (err) => reject(err));
    client.setTimeout(10000, () => {
      client.destroy();
      reject(new Error('SMTP Connection Timeout'));
    });
  });
}

exports.handler = async function(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "Only POST allowed" };

  try {
    let body = {};
    if (event.body) {
      try { body = JSON.parse(event.body); } catch(e) {}
    }

    const email = body.email ? body.email.trim() : "";
    const purpose = body.purpose ? body.purpose.trim() : "login";
    const otp = body.otp || String(Math.floor(100000 + Math.random() * 900000));

    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ status: "error", message: "Email required hai!" }) };
    }

    const count = await getNextCounter();
    const accountIndex = Math.floor((count - 1) / 499) % EMAIL_ACCOUNTS.length;
    const selectedAccount = EMAIL_ACCOUNTS[accountIndex];

    const smtpRes = await sendSmtpEmail(selectedAccount, email, otp, purpose);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: "success",
        message: "OTP Sent Successfully!",
        details: {
          email: email,
          sent_via: selectedAccount.user,
          global_count: count,
          smtp_response: smtpRes
        }
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: "error",
        message: "Gmail SMTP Delivery Failed",
        reason: error.message || String(error)
      })
    };
  }
};
