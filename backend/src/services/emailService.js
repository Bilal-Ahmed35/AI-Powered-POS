const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configure SMTP transporter (will use environment variables, fallback to mock logs if not configured)
const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: port == 465,
      auth: { user, pass }
    });
  }
  return null;
};

// Send email using Resend REST API if API Key is configured
const sendViaResend = async (to, subject, text, html) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return false;
  }

  try {
    const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const response = await axios.post('https://api.resend.com/emails', {
      from,
      to: [to],
      subject,
      text,
      html
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`[Email Service] Resend API success. Sent email to ${to}. ID: ${response.data.id}`);
    return true;
  } catch (err) {
    console.error(`[Email Service] Resend API failed for ${to}:`, err.response?.data || err.message);
    return false;
  }
};

// Log email locally to a text file for quick offline review and validation
const logEmailLocally = (to, subject, textContent, htmlContent) => {
  try {
    const logPath = path.join(__dirname, '../../email_logs.txt');
    const logDivider = '\n' + '='.repeat(80) + '\n';
    const logEntry = `${logDivider}DATE/TIME: ${new Date().toLocaleString()}
TO: ${to}
SUBJECT: ${subject}
TEXT CONTENT:
${textContent}
HTML CONTENT PREVIEW:
${htmlContent}
${logDivider}`;

    fs.appendFileSync(logPath, logEntry, 'utf8');
    console.log(`[Email Service] Offline fallback: Email written to ${logPath}`);
  } catch (err) {
    console.error('[Email Service] Failed to write local email log:', err);
  }
};

const getPaymentMethodLabel = (method) => {
  if (method === 'COD') return 'Pay Cash';
  return method || 'None';
};

const sendOrderPlacementEmail = async (order) => {
  const userEmail = order.user?.email || 'customer@pos.com';
  const userName = order.user?.name || 'Customer';
  const subject = `Order Confirmed - SwipeBite POS #${order.id}`;

  const dateStr = new Date(order.createdAt).toLocaleString();
  let itemsBreakdownText = '';
  let itemsBreakdownHtml = '';

  order.orderItems.forEach((item) => {
    const itemName = item.menuItem?.name || 'Item';
    const subtotal = (item.price * item.quantity).toFixed(2);
    itemsBreakdownText += `- ${itemName} x ${item.quantity} @ $${item.price.toFixed(2)} = $${subtotal}\n`;
    itemsBreakdownHtml += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left;">${itemName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${subtotal}</td>
      </tr>
    `;
  });

  let etaMinutes = 'N/A';
  let kitchenLoad = 'N/A';
  let explanation = 'No details available.';
  try {
    const { calculateETA } = require('./etaService');
    const itemsPayload = order.orderItems.map(item => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity
    }));
    const etaData = await calculateETA(itemsPayload);
    etaMinutes = `${etaData.estimatedTime} minutes`;
    kitchenLoad = etaData.kitchenLoad;
    explanation = etaData.explanation || '';
  } catch (err) {
    console.error('Failed to calculate ETA for email:', err);
  }

  const textContent = `Hi ${userName},

Thank you for your order! Your order has been placed successfully.

Order ID: #000${order.id}
Date & Time: ${dateStr}
Estimated Prep Time: ${etaMinutes} (Kitchen Load: ${kitchenLoad})
Details: ${explanation}

Bill Breakdown:
${itemsBreakdownText}
Total Amount: $${order.total.toFixed(2)}
Payment Status: ${order.paymentStatus}

We are preparing your order! You can track its live status in your dashboard.

Sincerely,
SwipeBite Canteen Team`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="background-color: #6366f1; padding: 20px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 24px; font-weight: bold;">Order Confirmed!</h2>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Thank you for ordering with SwipeBite</p>
      </div>
      <div style="padding: 25px;">
        <p style="font-size: 16px; margin-top: 0;">Hi <strong>${userName}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.5; color: #555;">Your order has been placed successfully. Below is your detailed receipt:</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #f0f0f0;">
          <table style="width: 100%; font-size: 13px;">
            <tr>
              <td style="color: #666; padding-bottom: 5px;"><strong>Order ID:</strong></td>
              <td style="text-align: right; padding-bottom: 5px;">#000${order.id}</td>
            </tr>
            <tr>
              <td style="color: #666; padding-bottom: 5px;"><strong>Date & Time:</strong></td>
              <td style="text-align: right; padding-bottom: 5px;">${dateStr}</td>
            </tr>
            <tr>
              <td style="color: #666; padding-bottom: 5px;"><strong>Estimated Prep Time:</strong></td>
              <td style="text-align: right; padding-bottom: 5px; color: #6366f1; font-weight: bold;">${etaMinutes}</td>
            </tr>
            <tr>
              <td style="color: #666; padding-bottom: 5px;"><strong>Kitchen Load:</strong></td>
              <td style="text-align: right; padding-bottom: 5px;">${kitchenLoad}</td>
            </tr>
            <tr>
              <td style="color: #666; padding-bottom: 5px;"><strong>Status Details:</strong></td>
              <td style="text-align: right; padding-bottom: 5px; font-style: italic; color: #666;">${explanation}</td>
            </tr>
            <tr>
              <td style="color: #666; padding-bottom: 5px;"><strong>Payment Method:</strong></td>
              <td style="text-align: right; padding-bottom: 5px; font-weight: bold;">${getPaymentMethodLabel(order.paymentMethod)}</td>
            </tr>
            <tr>
              <td style="color: #666;"><strong>Payment Status:</strong></td>
              <td style="text-align: right; font-weight: bold;">${order.paymentStatus}</td>
            </tr>
          </table>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: left;">Item</th>
              <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: center;">Qty</th>
              <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: right;">Price</th>
              <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsBreakdownHtml}
          </tbody>
        </table>

        <div style="text-align: right; font-size: 15px; margin-bottom: 25px;">
          <strong>Total Amount:</strong> <span style="font-size: 18px; color: #6366f1; font-weight: bold; margin-left: 10px;">$${order.total.toFixed(2)}</span>
        </div>

        <p style="font-size: 14px; line-height: 1.5; color: #555;">Payment method used: <strong>${order.paymentMethod || 'None'}</strong>. We have started processing your order, and it will be sent to the kitchen for preparation.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
        <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">This is an automated receipt from SwipeBite Canteen POS System.</p>
      </div>
    </div>
  `;

  // Try sending via Resend first
  const sentViaResend = await sendViaResend(userEmail, subject, textContent, htmlContent);
  if (sentViaResend) return;

  const transporter = createTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"SwipeBite POS Canteen" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject,
        text: textContent,
        html: htmlContent
      });
      console.log(`[Email Service] Order confirmation email sent successfully to ${userEmail}`);
    } catch (err) {
      console.error(`[Email Service] Failed to send order placement SMTP email: ${err.message}`);
      logEmailLocally(userEmail, subject, textContent, htmlContent);
    }
  } else {
    logEmailLocally(userEmail, subject, textContent, htmlContent);
  }
};

const sendOrderCompletionEmail = async (order) => {
  const userEmail = order.user?.email || 'customer@pos.com';
  const userName = order.user?.name || 'Customer';
  const subject = `Order Completed & Handed Over - SwipeBite POS #${order.id}`;

  const dateStr = new Date(order.createdAt).toLocaleString();
  let itemsBreakdownText = '';
  let itemsBreakdownHtml = '';

  order.orderItems.forEach((item) => {
    const itemName = item.menuItem?.name || 'Item';
    const subtotal = (item.price * item.quantity).toFixed(2);
    itemsBreakdownText += `- ${itemName} x ${item.quantity} @ $${item.price.toFixed(2)} = $${subtotal}\n`;
    itemsBreakdownHtml += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left;">${itemName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${subtotal}</td>
      </tr>
    `;
  });

  const textContent = `Hi ${userName},

Your order has been completed and handed over to you!

Order ID: #000${order.id}
Date & Time: ${dateStr}
Payment Status: ${order.paymentStatus}

Bill Breakdown:
${itemsBreakdownText}
Total Amount: $${order.total.toFixed(2)}

Thank you for dining with SwipeBite!

Sincerely,
SwipeBite Canteen Team`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="background-color: #6b7280; padding: 20px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 24px; font-weight: bold;">Order Completed</h2>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Thank you for dining with SwipeBite</p>
      </div>
      <div style="padding: 25px;">
        <p style="font-size: 16px; margin-top: 0;">Hi <strong>${userName}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.5; color: #555;">Your order has been completed and successfully handed over to you at the counter. Here are the details:</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #f0f0f0;">
          <table style="width: 100%; font-size: 13px;">
            <tr>
              <td style="color: #666; padding-bottom: 5px;"><strong>Order ID:</strong></td>
              <td style="text-align: right; padding-bottom: 5px;">#000${order.id}</td>
            </tr>
            <tr>
              <td style="color: #666; padding-bottom: 5px;"><strong>Date & Time:</strong></td>
              <td style="text-align: right; padding-bottom: 5px;">${dateStr}</td>
            </tr>
            <tr>
              <td style="color: #666; padding-bottom: 5px;"><strong>Payment Method:</strong></td>
              <td style="text-align: right; padding-bottom: 5px; font-weight: bold;">${getPaymentMethodLabel(order.paymentMethod)}</td>
            </tr>
            <tr>
              <td style="color: #666;"><strong>Payment Status:</strong></td>
              <td style="text-align: right; font-weight: bold;">${order.paymentStatus}</td>
            </tr>
          </table>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: left;">Item</th>
              <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: center;">Qty</th>
              <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: right;">Price</th>
              <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsBreakdownHtml}
          </tbody>
        </table>

        <div style="text-align: right; font-size: 15px; margin-bottom: 25px;">
          <strong>Total Amount Paid:</strong> <span style="font-size: 18px; color: #1f2937; font-weight: bold; margin-left: 10px;">$${order.total.toFixed(2)}</span>
        </div>

        <p style="font-size: 14px; line-height: 1.5; color: #555; text-align: center;">We hope to serve you again soon!</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
        <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">This is an automated receipt from SwipeBite Canteen POS System.</p>
      </div>
    </div>
  `;

  // Try sending via Resend first
  const sentViaResend = await sendViaResend(userEmail, subject, textContent, htmlContent);
  if (sentViaResend) return;

  const transporter = createTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"SwipeBite POS Canteen" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject,
        text: textContent,
        html: htmlContent
      });
      console.log(`[Email Service] Order completion email sent successfully to ${userEmail}`);
    } catch (err) {
      console.error(`[Email Service] Failed to send order completion SMTP email: ${err.message}`);
      logEmailLocally(userEmail, subject, textContent, htmlContent);
    }
  } else {
    logEmailLocally(userEmail, subject, textContent, htmlContent);
  }
};

const sendOrderReadyEmail = async (order) => {
  const userEmail = order.user?.email || 'customer@pos.com';
  const userName = order.user?.name || 'Customer';
  const subject = `Order Ready for Pickup! - SwipeBite POS #${order.id}`;

  const dateStr = new Date(order.createdAt).toLocaleString();
  let itemsBreakdownText = '';
  let itemsBreakdownHtml = '';

  order.orderItems.forEach((item) => {
    const itemName = item.menuItem?.name || 'Item';
    const subtotal = (item.price * item.quantity).toFixed(2);
    itemsBreakdownText += `- ${itemName} x ${item.quantity} @ $${item.price.toFixed(2)} = $${subtotal}\n`;
    itemsBreakdownHtml += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left;">${itemName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${subtotal}</td>
      </tr>
    `;
  });

  const textContent = `Hi ${userName},

Your order has been successfully prepared and is ready for pickup!

Order ID: #000${order.id}
Date & Time: ${dateStr}
ETA Update: Ready for Pickup
Payment Status: ${order.paymentStatus}

Bill Breakdown:
${itemsBreakdownText}
Total Amount: $${order.total.toFixed(2)}

Please collect your order from the pickup counter. We hope you enjoy your meal!

Sincerely,
SwipeBite Canteen Team`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="background-color: #10b981; padding: 20px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 24px; font-weight: bold;">Order Ready!</h2>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Your meal is ready for collection</p>
      </div>
      <div style="padding: 25px;">
        <p style="font-size: 16px; margin-top: 0;">Hi <strong>${userName}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.5; color: #555;">Great news! Your order is ready for pickup at the counter. Here are the details:</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #f0f0f0;">
          <table style="width: 100%; font-size: 13px;">
            <tr>
              <td style="color: #666; padding-bottom: 5px;"><strong>Order ID:</strong></td>
              <td style="text-align: right; padding-bottom: 5px;">#000${order.id}</td>
            </tr>
            <tr>
              <td style="color: #666; padding-bottom: 5px;"><strong>Date & Time:</strong></td>
              <td style="text-align: right; padding-bottom: 5px;">${dateStr}</td>
            </tr>
            <tr>
              <td style="color: #666; padding-bottom: 5px;"><strong>ETA Update:</strong></td>
              <td style="text-align: right; padding-bottom: 5px; color: #10b981; font-weight: bold;">Ready for Pickup</td>
            </tr>
            <tr>
              <td style="color: #666; padding-bottom: 5px;"><strong>Payment Method:</strong></td>
              <td style="text-align: right; padding-bottom: 5px; font-weight: bold;">${getPaymentMethodLabel(order.paymentMethod)}</td>
            </tr>
            <tr>
              <td style="color: #666;"><strong>Payment Status:</strong></td>
              <td style="text-align: right; font-weight: bold;">${order.paymentStatus}</td>
            </tr>
          </table>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: left;">Item</th>
              <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: center;">Qty</th>
              <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: right;">Price</th>
              <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsBreakdownHtml}
          </tbody>
        </table>

        <div style="text-align: right; font-size: 15px; margin-bottom: 25px;">
          <strong>Total Amount:</strong> <span style="font-size: 18px; color: #10b981; font-weight: bold; margin-left: 10px;">$${order.total.toFixed(2)}</span>
        </div>

        <p style="font-size: 14px; line-height: 1.5; color: #555; text-align: center; padding: 10px; background-color: #ecfdf5; border-radius: 8px; color: #065f46; font-weight: bold;">
          Enjoy your meal! 🍔🍕☕
        </p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
        <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">This is an automated receipt from SwipeBite Canteen POS System.</p>
      </div>
    </div>
  `;

  // Try sending via Resend first
  const sentViaResend = await sendViaResend(userEmail, subject, textContent, htmlContent);
  if (sentViaResend) return;

  const transporter = createTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"SwipeBite POS Canteen" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject,
        text: textContent,
        html: htmlContent
      });
      console.log(`[Email Service] Order ready email sent successfully to ${userEmail}`);
    } catch (err) {
      console.error(`[Email Service] Failed to send order ready SMTP email: ${err.message}`);
      logEmailLocally(userEmail, subject, textContent, htmlContent);
    }
  } else {
    logEmailLocally(userEmail, subject, textContent, htmlContent);
  }
};

const sendOTPEmail = async (email, name, otp) => {
  const subject = `SwipeBite Verification Code: ${otp}`;
  const textContent = `Hi ${name || 'Customer'},\n\nYour OTP for verification is: ${otp}\n\nThis code expires in 5 minutes.\n\nBest regards,\nSwipeBite Team`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="background-color: #6366f1; padding: 20px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 24px; font-weight: bold;">Verification Code</h2>
      </div>
      <div style="padding: 25px; text-align: center;">
        <p style="font-size: 16px; text-align: left;">Hi <strong>${name || 'Customer'}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.5; color: #555; text-align: left;">Please use the following One-Time Password (OTP) to verify your email. This code is valid for 5 minutes:</p>
        <div style="display: inline-block; margin: 25px auto; padding: 15px 30px; background-color: #f3f4f6; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4f46e5; border: 1px dashed #6366f1;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #888; text-align: center; margin-top: 20px;">If you did not request this verification, please ignore this email.</p>
      </div>
    </div>
  `;

  // Try sending via Resend first
  const sentViaResend = await sendViaResend(email, subject, textContent, htmlContent);
  if (sentViaResend) return;

  const transporter = createTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"SwipeBite POS Canteen" <${process.env.SMTP_USER}>`,
        to: email,
        subject,
        text: textContent,
        html: htmlContent
      });
      console.log(`[Email Service] Verification OTP sent successfully to ${email}`);
    } catch (err) {
      console.error(`[Email Service] Failed to send OTP SMTP email: ${err.message}`);
      logEmailLocally(email, subject, textContent, htmlContent);
    }
  } else {
    logEmailLocally(email, subject, textContent, htmlContent);
  }
};

module.exports = {
  sendOrderPlacementEmail,
  sendOrderCompletionEmail,
  sendOrderReadyEmail,
  sendOTPEmail
};
