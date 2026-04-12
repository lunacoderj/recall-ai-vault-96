const nodemailer = require('nodemailer');
const logger = require('../config/logger');

/**
 * Create a reusable transporter.
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: false, // true for 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send an email verification link.
 * @param {string} to - Recipient email
 * @param {string} name - User's name
 * @param {string} token - Verification token
 */
const sendVerificationEmail = async (to, name, token) => {
  const transporter = createTransporter();

  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"RecallAI" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Verify your RecallAI account',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f1a; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #a78bfa; margin: 0; font-size: 28px;">🧠 RecallAI</h1>
          <p style="color: #94a3b8; margin-top: 8px;">Your AI-powered knowledge vault</p>
        </div>
        
        <h2 style="color: #f1f5f9; font-size: 20px;">Welcome, ${name}!</h2>
        <p style="color: #cbd5e1; line-height: 1.7;">
          Thank you for signing up. Please verify your email address by clicking the button below:
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" 
             style="background: linear-gradient(135deg, #7c3aed, #a78bfa); color: white; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
            Verify Email
          </a>
        </div>
        
        <p style="color: #94a3b8; font-size: 13px;">
          Or copy and paste this link in your browser:<br/>
          <a href="${verifyUrl}" style="color: #818cf8; word-break: break-all;">${verifyUrl}</a>
        </p>
        
        <hr style="border-color: #1e293b; margin: 32px 0;" />
        <p style="color: #64748b; font-size: 12px; text-align: center;">
          If you didn't sign up for RecallAI, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${to}`);
  } catch (error) {
    logger.error(`Failed to send verification email to ${to}:`, error);
    throw new Error('Failed to send verification email');
  }
};

module.exports = { sendVerificationEmail };
