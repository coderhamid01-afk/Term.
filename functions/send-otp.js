const nodemailer = require("nodemailer");

// Accounts rotation list
const EMAIL_ACCOUNTS = [
  { user: 'h81103465@gmail.com', pass: 'znnhwzuitevojzya' },
  { user: 'muhammadhamidabdulqadir76@gmail.com', pass: 'xlsaifjadtlvroyq' },
  { user: 'coderhamid01@gmail.com', pass: 'onlfimidhwoemeax' },
  { user: 'khanokijaan@gmail.com', pass: 'ouxohqbikbnrueop' },
  { user: 'omeedtv8@gmail.com', pass: 'aymudghezvqppdby' }
];

exports.handler = async function(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Only POST" };

  try {
    const { email, purpose, otp } = JSON.parse(event.body);
    
    // Simple rotation
    const index = Math.floor(Math.random() * EMAIL_ACCOUNTS.length);
    const acc = EMAIL_ACCOUNTS[index];

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: acc.user, pass: acc.pass }
    });

    await transporter.sendMail({
      from: acc.user,
      to: email,
      subject: `Plenxo OTP: ${otp}`,
      text: `Your OTP is ${otp}`
    });

    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ status: "success", sent_via: acc.user }) 
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
