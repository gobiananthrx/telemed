const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.EMAIL_SERVICE_PORT || 5001;

let backupTransporter;

async function initTransporter() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const isGmail = (process.env.SMTP_HOST || '').includes('gmail') || (process.env.SMTP_USER || '').includes('@gmail.com');
    if (isGmail) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log(`[Email Service] Configured Gmail SMTP for user: ${process.env.SMTP_USER}`);
    } else {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log(`[Email Service] Configured custom SMTP with host: ${process.env.SMTP_HOST}`);
    }
  }

  // Pre-initialize Ethereal backup transporter
  try {
    const testAccount = await nodemailer.createTestAccount();
    backupTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[Email Service] Ethereal fallback transporter active: ${testAccount.user}`);
    if (!transporter) {
      transporter = backupTransporter;
    }
  } catch (err) {
    console.warn('[Email Service] Failed to create Ethereal backup:', err.message);
  }
}

initTransporter();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'telemed-email-service', timestamp: new Date() });
});

app.post('/send-otp', async (req, res) => {
  const { email, otp, purpose = 'REGISTRATION', name = 'Patient' } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'email and otp are required' });
  }

  const isReset = purpose === 'PASSWORD_RESET';
  const subject = isReset 
    ? `Telemed — Your Password Reset Code: ${otp}` 
    : `Telemed — Your Verification Code: ${otp}`;

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
      .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.06); }
      .logo-bar { display: flex; align-items: center; margin-bottom: 24px; }
      .brand-icon { width: 36px; height: 36px; background-color: #0F766E; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; color: #ffffff; font-weight: bold; font-size: 18px; margin-right: 12px; }
      .brand-name { font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; vertical-align: middle; }
      .title { font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
      .desc { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
      .otp-box { background: #f0fdfa; border: 2px dashed #0F766E; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px; }
      .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0F766E; font-family: monospace; }
      .expiry-notice { font-size: 12px; color: #64748b; margin-top: 8px; }
      .footer { border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="logo-bar">
        <span class="brand-icon">✚</span>
        <span class="brand-name">Telemed</span>
      </div>
      <h1 class="title">${isReset ? 'Reset Your Password' : 'Verify Your Email'}</h1>
      <p class="desc">
        Hello <strong>${name}</strong>,<br>
        Please use the 6-digit verification code below to ${isReset ? 'reset your account password' : 'complete your Telemed patient registration'}.
      </p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="expiry-notice">⏱ This verification code expires in 10 minutes.</div>
      </div>
      <p class="desc" style="font-size: 13px;">
        If you did not request this verification code, please disregard this email or contact Telemed security immediately.
      </p>
      <div class="footer">
        © 2026 Telemed Healthcare Infrastructure. 256-bit encrypted clinical communications.
      </div>
    </div>
  </body>
  </html>
  `;

  console.log(`\n======================================================`);
  console.log(`[EMAIL DISPATCH] Purpose: ${purpose} | Recipient: ${email}`);
  console.log(`[OTP CODE]: >>> ${otp} <<<`);
  console.log(`======================================================\n`);

  let info;
  let usedBackup = false;
  const fromAddress = process.env.EMAIL_FROM || '"Telemed Health" <gobiananthrxalt@gmail.com>';

  try {
    info = await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: subject,
      html: htmlContent,
      text: `Hello ${name}, your Telemed verification code is: ${otp}. It expires in 10 minutes.`,
    });
  } catch (primaryErr) {
    console.warn(`[Email Service] Primary SMTP send failed (${primaryErr.message}). Attempting Ethereal backup...`);
    if (backupTransporter) {
      try {
        info = await backupTransporter.sendMail({
          from: '"Telemed Health" <no-reply@telemed.com>',
          to: email,
          subject: subject,
          html: htmlContent,
          text: `Hello ${name}, your Telemed verification code is: ${otp}. It expires in 10 minutes.`,
        });
        usedBackup = true;
      } catch (backupErr) {
        console.error('[Email Service] Backup send also failed:', backupErr);
      }
    }
  }

  if (info) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Email Dispatched Successfully] Preview URL: ${previewUrl}`);
    }
    return res.json({
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null,
      usedBackup,
    });
  }

  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({
      success: false,
      error: 'Failed to deliver email through primary SMTP provider.'
    });
  }

  return res.status(200).json({
    success: true,
    devFallback: true,
  });
});

app.post('/send-notification', async (req, res) => {
  const { email, title, message, name = 'Valued User' } = req.body;

  if (!email || !title || !message) {
    return res.status(400).json({ error: 'email, title, and message are required' });
  }

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
      .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; border: 1px solid #e2e8f0; }
      .brand-icon { width: 36px; height: 36px; background-color: #0F766E; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; color: #ffffff; font-weight: bold; font-size: 18px; margin-right: 12px; }
      .brand-name { font-size: 20px; font-weight: 800; color: #0f172a; }
      .title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 20px 0 12px; }
      .desc { font-size: 14px; line-height: 1.6; color: #475569; }
      .footer { border-top: 1px solid #f1f5f9; margin-top: 24px; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center; }
    </style>
  </head>
  <body>
    <div class="card">
      <div style="display:flex;align-items:center;">
        <span class="brand-icon">✚</span>
        <span class="brand-name">Telemed</span>
      </div>
      <h2 class="title">${title}</h2>
      <p class="desc">Hello <strong>${name}</strong>,</p>
      <p class="desc">${message}</p>
      <div class="footer">
        © 2026 Telemed Healthcare Platform.
      </div>
    </div>
  </body>
  </html>
  `;

  console.log(`[NOTIFICATION DISPATCH] Recipient: ${email} | Title: ${title}`);

  let info;
  let usedBackup = false;
  const fromAddress = process.env.EMAIL_FROM || '"Telemed Health" <gobiananthrxalt@gmail.com>';

  try {
    info = await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: `Telemed Alert: ${title}`,
      html: htmlContent,
      text: `${title}\n\nHello ${name},\n${message}`,
    });
  } catch (primaryErr) {
    console.warn(`[Email Service] Primary SMTP notification failed (${primaryErr.message}). Attempting Ethereal backup...`);
    if (backupTransporter) {
      try {
        info = await backupTransporter.sendMail({
          from: '"Telemed Health" <no-reply@telemed.com>',
          to: email,
          subject: `Telemed Alert: ${title}`,
          html: htmlContent,
          text: `${title}\n\nHello ${name},\n${message}`,
        });
        usedBackup = true;
      } catch (backupErr) {
        console.error('[Email Service] Backup notification send also failed:', backupErr);
      }
    }
  }

  if (info) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Notification Email Dispatched] Preview URL: ${previewUrl}`);
    }
    return res.json({
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null,
      usedBackup,
    });
  }

  return res.status(200).json({ success: true, devFallback: true });
});

app.listen(PORT, () => {
  console.log(`[Telemed Email Service] running on http://localhost:${PORT}`);
});
