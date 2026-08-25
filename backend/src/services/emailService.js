const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const QRCode = require('qrcode');

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: port == 465,
      auth: { user, pass },
    });
  }
  return null;
};

const sendViaResend = async (to, subject, text, html) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === '') return false;

  try {
    const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const response = await axios.post(
      'https://api.resend.com/emails',
      { from, to: [to], subject, text, html },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );
    console.log(`[Email Service] Resend API success. Sent to ${to}. ID: ${response.data.id}`);
    return true;
  } catch (err) {
    console.error(`[Email Service] Resend API failed for ${to}:`, err.response?.data || err.message);
    return false;
  }
};

const logEmailLocally = (to, subject, textContent, htmlContent) => {
  try {
    const logPath = path.join(__dirname, '../../email_logs.txt');
    const logDivider = '\n' + '='.repeat(80) + '\n';
    const logEntry = `${logDivider}DATE/TIME: ${new Date().toLocaleString()}
TO: ${to}
SUBJECT: ${subject}
TEXT CONTENT:
${textContent}
HTML PREVIEW:
${htmlContent}
${logDivider}`;

    fs.appendFileSync(logPath, logEntry, 'utf8');
    console.log(`[Email Service] Offline fallback: Email written to ${logPath}`);
  } catch (err) {
    console.error('[Email Service] Failed to write local email log:', err);
  }
};

const sendMailGeneric = async (to, subject, textContent, htmlContent) => {
  const sentViaResend = await sendViaResend(to, subject, textContent, htmlContent);
  if (sentViaResend) return;

  const transporter = createTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"SwipeBite POS Canteen" <${process.env.SMTP_USER || 'no-reply@swipebite.com'}>`,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[Email Service] SMTP email sent successfully to ${to}`);
    } catch (err) {
      console.error(`[Email Service] SMTP send failed: ${err.message}`);
      logEmailLocally(to, subject, textContent, htmlContent);
    }
  } else {
    logEmailLocally(to, subject, textContent, htmlContent);
  }
};

const buildItemsHtml = (orderItems = []) => {
  let text = '';
  let html = '';

  orderItems.forEach((item) => {
    const name = item.nameSnapshot || item.menuItem?.name || 'Item';
    const price = item.priceSnapshot ?? item.price ?? 0;
    const subtotal = item.subtotal ?? (price * item.quantity);
    text += `- ${name} x ${item.quantity} @ Rs. ${price.toFixed(2)} = Rs. ${subtotal.toFixed(2)}\n`;
    html += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left;">${name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">Rs. ${price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">Rs. ${subtotal.toFixed(2)}</td>
      </tr>
    `;
  });

  return { text, html };
};

/**
 * 1. Send Order Placement Email with Dynamic Tracking QR code and AI ETA
 */
const sendOrderPlacementEmail = async (order) => {
  const userEmail = order.customerEmail || order.user?.email || 'customer@pos.com';
  const userName = order.user?.name || 'Customer';
  const orderNum = order.orderNumber || `#000${order.id}`;
  const subject = `Order Confirmed: ${orderNum} - SwipeBite POS`;
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const trackingUrl = `${baseUrl.replace(/\/$/, '')}/customer/track/${order.trackingToken || order.id}`;

  let trackingQrDataUrl = '';
  try {
    trackingQrDataUrl = await QRCode.toDataURL(trackingUrl, {
      margin: 1,
      width: 180,
      color: { dark: '#4f46e5', light: '#ffffff' },
    });
  } catch (e) {
    console.warn('QR generation for email failed:', e.message);
  }

  const { text: itemsText, html: itemsHtml } = buildItemsHtml(order.orderItems);
  const etaMins = order.etaPrediction?.adjustedEta ? `${Math.round(order.etaPrediction.adjustedEta)} mins` : '10-15 mins';

  const textContent = `Hi ${userName},

Thank you for your order!
Order Number: ${orderNum}
Table: ${order.tableNumber || 'Takeaway'}
Estimated Ready Time: ~${etaMins}
Payment Method: ${order.paymentMethod || 'COD'}
Payment Status: ${order.paymentStatus}

Order Breakdown:
${itemsText}
Total Amount: Rs. ${order.total.toFixed(2)}

Track your live order status here:
${trackingUrl}

SwipeBite Team`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 22px;">Order Confirmed!</h2>
        <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">SwipeBite Smart POS</p>
      </div>
      <div style="padding: 24px;">
        <p>Hi <strong>${userName}</strong>,</p>
        <p>Your order has been placed successfully. Here is your receipt:</p>

        <div style="background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <table style="width: 100%; font-size: 13px;">
            <tr><td><strong>Order Number:</strong></td><td style="text-align: right; font-weight: bold; color: #4f46e5;">${orderNum}</td></tr>
            <tr><td><strong>Table / Service:</strong></td><td style="text-align: right;">${order.tableNumber || 'Takeaway'}</td></tr>
            <tr><td><strong>AI Estimated Prep Time:</strong></td><td style="text-align: right; font-weight: bold; color: #10b981;">~${etaMins}</td></tr>
            <tr><td><strong>Payment:</strong></td><td style="text-align: right;">${order.paymentMethod || 'COD'} (${order.paymentStatus})</td></tr>
          </table>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 8px; text-align: left;">Item</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Price</th>
              <th style="padding: 8px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <div style="text-align: right; font-size: 16px; margin-bottom: 24px;">
          <strong>Total Amount:</strong> <span style="font-size: 18px; color: #4f46e5; font-weight: bold; margin-left: 10px;">Rs. ${order.total.toFixed(2)}</span>
        </div>

        ${trackingQrDataUrl ? `
        <div style="text-align: center; padding: 16px; background: #faf5ff; border: 1px dashed #c084fc; border-radius: 12px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; color: #7e22ce;">Scan or Click below to Track Live Order Status</p>
          <img src="${trackingQrDataUrl}" alt="Order QR" style="width: 130px; height: 130px; display: inline-block;" />
          <div style="margin-top: 12px;">
            <a href="${trackingUrl}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: bold; display: inline-block;">Open Live Tracker</a>
          </div>
        </div>
        ` : ''}

        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">Automated notification from SwipeBite Canteen System.</p>
      </div>
    </div>
  `;

  await sendMailGeneric(userEmail, subject, textContent, htmlContent);
};

/**
 * 2. Payment Confirmed Notification
 */
const sendPaymentConfirmedEmail = async (order) => {
  const userEmail = order.customerEmail || order.user?.email || 'customer@pos.com';
  const orderNum = order.orderNumber || `#000${order.id}`;
  const subject = `Payment Confirmed: ${orderNum} - SwipeBite POS`;
  const textContent = `Your payment of Rs. ${order.total.toFixed(2)} for ${orderNum} has been verified and marked as PAID. Order is now queued for kitchen preparation.`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <h3 style="color: #10b981;">Payment Verified & Confirmed</h3>
      <p>Your payment of <strong>Rs. ${order.total.toFixed(2)}</strong> via <strong>${order.paymentMethod || 'Online'}</strong> (TxID: ${order.paymentTxId || 'Verified'}) has been approved.</p>
      <p>Our kitchen team is now preparing your delicious meal!</p>
    </div>
  `;
  await sendMailGeneric(userEmail, subject, textContent, htmlContent);
};

/**
 * 3. Order Ready for Pickup
 */
const sendOrderReadyEmail = async (order) => {
  const userEmail = order.customerEmail || order.user?.email || 'customer@pos.com';
  const orderNum = order.orderNumber || `#000${order.id}`;
  const subject = `Meal Ready for Pickup: ${orderNum} - SwipeBite`;
  const textContent = `Your order ${orderNum} is ready! Please collect your food from the pickup counter.`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 500px; border: 1px solid #e5e7eb; border-radius: 12px; text-align: center;">
      <h2 style="color: #10b981; margin-top: 0;">Your Order is Ready! 🛎️</h2>
      <p style="font-size: 14px;">Order <strong>${orderNum}</strong> has been freshly prepared and is waiting at the counter.</p>
      <p style="font-size: 16px; font-weight: bold; color: #4f46e5;">Placement: ${order.tableNumber || 'Takeaway'}</p>
      <p style="font-size: 13px; color: #6b7280;">Enjoy your meal!</p>
    </div>
  `;
  await sendMailGeneric(userEmail, subject, textContent, htmlContent);
};

/**
 * 4. Order Completed
 */
const sendOrderCompletionEmail = async (order) => {
  const userEmail = order.customerEmail || order.user?.email || 'customer@pos.com';
  const orderNum = order.orderNumber || `#000${order.id}`;
  const subject = `Order Completed: ${orderNum} - Thank you for dining with SwipeBite`;
  const textContent = `Thank you for visiting SwipeBite! Your order ${orderNum} has been completed.`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 500px; border: 1px solid #e5e7eb; border-radius: 12px; text-align: center;">
      <h3 style="color: #4f46e5;">Thank You! 🍽️</h3>
      <p>Order <strong>${orderNum}</strong> was handed over successfully.</p>
      <p>We hope to serve you again soon!</p>
    </div>
  `;
  await sendMailGeneric(userEmail, subject, textContent, htmlContent);
};

/**
 * 5. Order Cancellation / Refund
 */
const sendOrderCancellationEmail = async (order, reason = 'CANCELLED') => {
  const userEmail = order.customerEmail || order.user?.email || 'customer@pos.com';
  const orderNum = order.orderNumber || `#000${order.id}`;
  const subject = `Order ${reason}: ${orderNum} - SwipeBite POS`;
  const textContent = `Your order ${orderNum} has been marked as ${reason}. Total amount: Rs. ${order.total.toFixed(2)}.`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 500px; border: 1px solid #fecdd3; background: #fff1f2; border-radius: 12px;">
      <h3 style="color: #e11d48; margin-top: 0;">Order ${reason}</h3>
      <p>Order <strong>${orderNum}</strong> has been updated to <strong>${reason}</strong>.</p>
      <p>Amount: <strong>Rs. ${order.total.toFixed(2)}</strong></p>
      <p style="font-size: 12px; color: #881337;">If you have questions regarding payment or cancellation, please visit the counter.</p>
    </div>
  `;
  await sendMailGeneric(userEmail, subject, textContent, htmlContent);
};

/**
 * 6. Send OTP Email
 */
const sendOTPEmail = async (email, name, otp) => {
  const subject = `SwipeBite Verification Code: ${otp}`;
  const textContent = `Hi ${name || 'Customer'},\n\nYour OTP for verification is: ${otp}\n\nThis code expires in 5 minutes.\n\nBest regards,\nSwipeBite Team`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
      <div style="background: #4f46e5; padding: 20px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 20px;">Email Verification</h2>
      </div>
      <div style="padding: 24px; text-align: center;">
        <p style="text-align: left;">Hi <strong>${name || 'Customer'}</strong>,</p>
        <p style="text-align: left; font-size: 14px; color: #4b5563;">Use the following One-Time Password (OTP) to verify your account. Valid for 5 minutes:</p>
        <div style="margin: 20px auto; padding: 14px 28px; background: #f3f4f6; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4f46e5; display: inline-block;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 16px;">If you did not request this code, you can safely ignore this email.</p>
      </div>
    </div>
  `;

  await sendMailGeneric(email, subject, textContent, htmlContent);
};

module.exports = {
  sendOrderPlacementEmail,
  sendPaymentConfirmedEmail,
  sendOrderReadyEmail,
  sendOrderCompletionEmail,
  sendOrderCancellationEmail,
  sendOTPEmail,
};
