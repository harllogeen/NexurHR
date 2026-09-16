require('dotenv').config();
const nodemailer = require('nodemailer');

// Configure the transporter
// Uses environment variables for real SMTP, or falls back to Ethereal for testing
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'joshua.kulas@ethereal.email', 
        pass: process.env.SMTP_PASS || 'X1F7y8z9w0v1u2t3s4'
    }
});

console.log('Email Service Configured:');
console.log('Host:', process.env.SMTP_HOST || 'Default (Ethereal)');
console.log('Port:', process.env.SMTP_PORT || 'Default (587)');
console.log('User:', process.env.SMTP_USER ? process.env.SMTP_USER : 'Default (Ethereal)');

// Professional HTML Template for Interview Invitation
const getInterviewEmailTemplate = (candidateName, role, date, time) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #ffffff; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; margin-bottom: 20px; }
        .details-box { background-color: #f8fafc; border-left: 4px solid #4F46E5; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .detail-row { margin-bottom: 10px; }
        .detail-label { font-weight: 600; color: #64748b; width: 100px; display: inline-block; }
        .detail-value { color: #1e293b; font-weight: 500; }
        .cta-button { display: inline-block; background-color: #4F46E5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; text-align: center; }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Interview Invitation</h1>
        </div>
        <div class="content">
            <p class="greeting">Dear <strong>${candidateName}</strong>,</p>
            <p>We are impressed with your application and would like to invite you for an interview for the <strong>${role}</strong> position at our company.</p>
            
            <div class="details-box">
                <div class="detail-row">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">${date}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Time:</span>
                    <span class="detail-value">${time}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Mode:</span>
                    <span class="detail-value">Video Conference</span>
                </div>
            </div>

            <p>Please click the button below to confirm your attendance and view the meeting details.</p>
            
            <div style="text-align: center;">
                <a href="#" class="cta-button" style="color: #ffffff;">Confirm Attendance</a>
            </div>
            
            <p style="margin-top: 30px;">If this time does not work for you, please reply to this email to reschedule.</p>
        </div>
        <div class="footer">
            <p>&copy; 2025 HR Management System. All rights reserved.</p>
            <p>This is an automated message. Please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>
    `;
};

const sendInterviewEmail = async (to, candidateName, role, interviewDate) => {
    try {
        const dateObj = new Date(interviewDate);
        const date = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const time = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const info = await transporter.sendMail({
            from: '"HR Team" <hr@company.com>',
            to: to,
            subject: `Interview Invitation: ${role} at HR Company`,
            html: getInterviewEmailTemplate(candidateName, role, date, time)
        });

        console.log("Message sent: %s", info.messageId);
        // Preview only available when sending through an Ethereal account
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log("Preview URL: %s", previewUrl);
        return { info, previewUrl };
    } catch (error) {
        console.error("Error sending email:", error);
        return null; // Don't throw, just log so we don't break the flow
    }
};

module.exports = { sendInterviewEmail };
