// Simple SMTP credential verifier for Gmail (uses .env)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const nodemailer = require('nodemailer');

(async () => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
  try {
    await transporter.verify();
    console.log('SMTP OK — credenciales válidas y conexión aceptada');
  } catch (err) {
    console.error('SMTP Error:', (err && err.message) ? err.message : err);
    process.exit(1);
  }
})();
