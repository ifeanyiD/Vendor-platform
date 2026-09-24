const nodemailer = require('nodemailer');

const createTransporter = () => {
  // Support multiple providers via env config
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  // Fallback: Gmail with app password
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASS
    }
  });
};

const FROM = `"Storely" <${process.env.EMAIL_FROM || process.env.EMAIL_USER }>`;

// ── Templates ──────────────────────────────────────────────────────────────

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { font-family: 'DM Sans', Arial, sans-serif; background:#f5f5f0; margin:0; padding:0; }
    .wrapper { max-width:560px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .header { background:#0f3d2e; padding:32px; text-align:center; }
    .header-logo { color:#f5a623; font-size:28px; font-weight:800; letter-spacing:-0.5px; }
    .header-logo span { color:#fff; }
    .body { padding:36px 40px; }
    h2 { color:#0f3d2e; margin:0 0 16px; font-size:22px; }
    p { color:#555; line-height:1.7; margin:0 0 16px; font-size:15px; }
    .btn { display:inline-block; background:#0f3d2e; color:#fff !important; padding:14px 32px; border-radius:50px; text-decoration:none; font-weight:600; font-size:15px; margin:8px 0 24px; }
    .highlight { background:#e8f5ee; border-left:4px solid #2d8653; padding:14px 18px; border-radius:8px; margin:20px 0; }
    .footer { background:#f5f5f0; padding:20px 40px; text-align:center; font-size:12px; color:#999; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">S<span>torely</span></div>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      © ${new Date().getFullYear()} Storely · Built for Nigerian vendors 🇳🇬<br/>
      <a href="${process.env.CLIENT_URL}" style="color:#2d8653">Visit Storely</a>
    </div>
  </div>
</body>
</html>
`;

// ── Email senders ───────────────────────────────────────────────────────────

const sendWelcomeEmail = async ({ email, storeName, storeSlug }) => {
  const storeUrl = `${process.env.CLIENT_URL}/store/${storeSlug}`;
  const html = baseTemplate(`
    <h2>Welcome to Storely-NG, ${storeName}! 🎉</h2>
    <p>Your store is live and ready. Here's your unique store link — share it everywhere!</p>
    <div class="highlight">
      <strong>Your Store Link:</strong><br/>
      <a href="${storeUrl}" style="color:#2d8653">${storeUrl}</a>
    </div>
    <p>Here's what to do next:</p>
    <p>1. Add your first products to your dashboard<br/>
       2. Upload your store logo and banner<br/>
       3. Share your link on WhatsApp, Instagram, and more</p>
    <a href="${process.env.CLIENT_URL}/dashboard" class="btn">Go to Dashboard →</a>
    <p style="font-size:13px;color:#999">You have a 30-day free trial. No credit card required.</p>
  `);

  return send({ to: email, subject: `Your Storely-NG store "${storeName}" is live! 🚀`, html });
};

const sendPasswordResetEmail = async ({ email, storeName, resetUrl }) => {
  const html = baseTemplate(`
    <h2>Reset your password</h2>
    <p>Hi ${storeName},</p>
    <p>We received a request to reset your Vendora password. Click the button below to set a new one.</p>
    <a href="${resetUrl}" class="btn">Reset Password →</a>
    <p style="font-size:13px;color:#999">This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
    <div class="highlight" style="font-size:13px">
      If the button doesn't work, copy this link:<br/>
      <a href="${resetUrl}" style="color:#2d8653;word-break:break-all">${resetUrl}</a>
    </div>
  `);

  return send({ to: email, subject: 'Reset your Vendora password', html });
};

const sendOrderNotificationEmail = async ({ vendorEmail, storeName, order }) => {
  const html = baseTemplate(`
    <h2>New Order! 🛍️</h2>
    <p>You have a new WhatsApp order on <strong>${storeName}</strong>.</p>
    <div class="highlight">
      <strong>${order.productName}</strong><br/>
      Price: ₦${Number(order.productPrice).toLocaleString('en-NG')}<br/>
      Status: ${order.status.toUpperCase()}
    </div>
    <p>Check your WhatsApp to confirm the order with the customer.</p>
    <a href="${process.env.CLIENT_URL}/dashboard" class="btn">View Dashboard →</a>
  `);

  return send({ to: vendorEmail, subject: `New order: ${order.productName}`, html });
};

const sendSubscriptionEmail = async ({ email, storeName, plan, expiresAt }) => {
  const html = baseTemplate(`
    <h2>Subscription Updated ✅</h2>
    <p>Hi ${storeName},</p>
    <p>Your Vendora subscription has been updated successfully.</p>
    <div class="highlight">
      <strong>Plan:</strong> ${plan.toUpperCase()}<br/>
      <strong>Valid until:</strong> ${new Date(expiresAt).toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' })}
    </div>
    <a href="${process.env.CLIENT_URL}/dashboard" class="btn">Go to Dashboard →</a>
  `);

  return send({ to: email, subject: `Your Vendora ${plan} plan is active!`, html });
};

// ── Core send ───────────────────────────────────────────────────────────────

const send = async ({ to, subject, html, text }) => {
  // In test/dev without email config, just log
  if (!process.env.EMAIL_USER && !process.env.SMTP_HOST) {
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
    return { messageId: 'dev-mode' };
  }
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({ from: FROM, to, subject, html, text });
    return info;
  } catch (err) {
    console.error('[EMAIL ERROR]', err.message);
    // Don't throw — email failures shouldn't break the main flow
    return null;
  }
};

const sendLowStockAlert = async ({ vendorEmail, storeName, products }) => {
  const rows = products.map(p =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${p.name}</td><td style="padding:8px;border-bottom:1px solid #eee;color:#e53e3e;font-weight:600">${p.stockQuantity} left</td></tr>`
  ).join('');
  const html = baseTemplate(`
    <h2>⚠️ Low Stock Alert</h2>
    <p>Hi ${storeName}, the following products are running low on stock:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead><tr style="background:#f5f5f0"><th style="padding:8px;text-align:left">Product</th><th style="padding:8px;text-align:left">Stock</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <a href="${process.env.CLIENT_URL}/dashboard" class="btn">Update Stock →</a>
  `);
  return send({ to: vendorEmail, subject: `Low stock alert for ${storeName}`, html });
};

const sendReferralBonusEmail = async ({ email, storeName, referredStore, bonusDays }) => {
  const html = baseTemplate(`
    <h2>🎁 You earned a referral bonus!</h2>
    <p>Hi ${storeName},</p>
    <p><strong>${referredStore}</strong> just joined Vendora using your referral code.</p>
    <div class="highlight"><strong>Your reward:</strong> ${bonusDays} free days added to your subscription!</div>
    <a href="${process.env.CLIENT_URL}/dashboard" class="btn">View Dashboard →</a>
  `);
  return send({ to: email, subject: `You earned ${bonusDays} free days!`, html });
};

const sendVerificationEmail = async ({ email, storeName, verifyUrl }) => {
  const html = baseTemplate(`
    <h2>Verify your email address</h2>
    <p>Hi ${storeName}, thanks for joining Vendora!</p>
    <p>Click the button below to verify your email address and activate your store. This link expires in <strong>24 hours</strong>.</p>
    <a href="${verifyUrl}" class="btn">Verify Email Address →</a>
    <p style="font-size:13px;color:#999">Or copy this link: <a href="${verifyUrl}" style="color:#2d8653;word-break:break-all">${verifyUrl}</a></p>
    <p style="font-size:13px;color:#999">If you didn't create a Vendora account, you can safely ignore this email.</p>
  `);
  return send({ to: email, subject: 'Verify your Vendora account', html });
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOrderNotificationEmail,
  sendSubscriptionEmail,
  sendLowStockAlert,
  sendReferralBonusEmail,
  sendVerificationEmail
};
