export const baseTemplate = (contentVar: string, logoUrl: string = "https://aetheriss.online/AElogo.png") => `
  <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #cbd5e1; max-width: 600px; margin: 0 auto; line-height: 1.6; background-color: #0f172a; padding: 24px; border-radius: 16px; border: 1px solid #1e293b;">
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="https://aetheriss.online" target="_blank" style="text-decoration: none; display: inline-block;">
        <img src="${logoUrl}" alt="Aetheris" style="height: 42px; width: auto; display: block; margin: 0 auto;" />
      </a>
    </div>
    <div style="background-color: #1e293b; padding: 32px; border-radius: 12px; border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
      ${contentVar}
    </div>
    <div style="margin-top: 32px; text-align: center; font-size: 13px; color: #64748b;">
      <p style="margin-bottom: 8px;"><strong>Security Notice:</strong> Never share your passwords or OTPs with anyone. Our support team will never ask for your password.</p>
      <p style="margin-bottom: 8px;">If you have any questions or did not authorize this action, please contact our support team immediately.</p>
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} Aetheris. All rights reserved.</p>
    </div>
  </div>
`;

export const getWelcomeTemplate = (username: string, logoUrl?: string) => {
  return baseTemplate(`
    <h3 style="margin-top: 0; color: #ffffff; font-size: 22px; line-height: 1.4;">Hello ${username},</h3>
    <p style="color: #cbd5e1; font-size: 16px; margin-top: 16px; margin-bottom: 16px; line-height: 1.6;">Welcome to Aetheris! We're thrilled to have you on board.</p>
    <p style="color: #cbd5e1; font-size: 16px; margin-bottom: 16px; line-height: 1.6;">As a special welcome, you've unlocked a <strong>$100 Signup Reward</strong> bonus, which has been credited directly to your account balance.</p>
    <div style="background-color: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
      <p style="color: #fbbf24; font-size: 14px; margin: 0; line-height: 1.5;"><strong>Important Notice:</strong> The $100 Signup Reward is <strong>withdrawable only</strong>.</p>
    </div>
    <p style="color: #cbd5e1; font-size: 16px; margin-bottom: 16px; line-height: 1.6;">Here’s what you can do next:</p>
    <ul style="color: #cbd5e1; font-size: 16px; margin-bottom: 24px; line-height: 1.6; padding-left: 20px;">
      <li style="margin-bottom: 8px;">Explore our advanced AI trading engines and engine levels</li>
      <li style="margin-bottom: 8px;">Fund your trading balance to activate an AI engine level</li>
      <li style="margin-bottom: 8px;">Invite friends using your referral link for extra bonuses</li>
    </ul>
    <p style="color: #cbd5e1; font-size: 16px; margin-bottom: 32px; line-height: 1.6;">Thank you for trusting Aetheris.</p>
    <div style="margin-top: 32px; text-align: center; margin-bottom: 16px;">
      <a href="https://aetheriss.online/dashboard" style="background-color: #3b82f6; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.35);">Access Dashboard</a>
    </div>
    <p style="color: #94a3b8; font-size: 16px; margin-top: 32px; border-top: 1px solid #334155; padding-top: 24px; margin-bottom: 0;">— Aetheris Team</p>
  `, logoUrl);
};

export const getWelcomeVerificationTemplate = (username: string, verificationLink: string, logoUrl?: string) => {
  return baseTemplate(`
    <h3 style="margin-top: 0; color: #ffffff; font-size: 22px; line-height: 1.4;">Hello ${username},</h3>
    <p style="color: #cbd5e1; font-size: 16px; margin-top: 16px; margin-bottom: 24px; line-height: 1.6;">To finalize your secure account setup and unlock full platform features, please verify your email address by clicking the button below:</p>
    <div style="margin-top: 32px; text-align: center; margin-bottom: 32px;">
      <a href="${verificationLink}" style="background-color: #3b82f6; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.35);">Verify Email Now</a>
    </div>
    <p style="color: #cbd5e1; font-size: 14px; margin-bottom: 24px; line-height: 1.6;"><strong>Important:</strong> This secure verification link will expire in 30 minutes. If the button above does not work, copy and paste the following link directly into your browser:</p>
    <p style="color: #60a5fa; font-size: 13px; word-break: break-all; margin-bottom: 32px;">${verificationLink}</p>
    <p style="color: #94a3b8; font-size: 16px; margin-top: 32px; border-top: 1px solid #334155; padding-top: 24px; margin-bottom: 0;">— Aetheris Team</p>
  `, logoUrl);
};

export const getOtpTemplate = (username: string, code: string, actionText: string, logoUrl?: string) => {
  return baseTemplate(`
    <h3 style="margin-top: 0; color: #ffffff; font-size: 22px;">Hello ${username},</h3>
    <p style="color: #cbd5e1; font-size: 16px;">You recently requested a security code to ${actionText.toLowerCase()}.</p>
    <div style="margin: 32px 0; text-align: center;">
      <div style="background-color: #0f172a; border: 1px dashed #475569; padding: 20px; border-radius: 8px; display: inline-block;">
        <span style="font-family: monospace; font-size: 36px; font-weight: 700; letter-spacing: 6px; color: #3b82f6;">${code}</span>
      </div>
    </div>
    <p style="color: #94a3b8; font-size: 14px;">This code will expire in 10 minutes. If you did not request this, please secure your account and contact support immediately.</p>
  `, logoUrl);
};

export const getTransactionTemplate = ({
  username,
  transactionType,
  amount,
  paymentMethod,
  referenceId,
  transactionId,
  accountStatus,
  actionText,
  actionLink,
  isFailed = false,
  notes,
  logoUrl
}: any) => {
  const statusColor = isFailed ? '#ef4444' : '#10b981';
  let detailsHtml = '';
  
  if (referenceId) detailsHtml += `<div style="margin-bottom: 16px;"><span style="color: #94a3b8; display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Reference ID</span><span style="color: #ffffff; font-family: monospace; font-size: 14px;">${referenceId}</span></div>`;
  if (transactionType) detailsHtml += `<div style="margin-bottom: 16px;"><span style="color: #94a3b8; display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Type</span><span style="color: #ffffff; font-weight: 500; font-size: 15px;">${transactionType}</span></div>`;
  if (accountStatus) detailsHtml += `<div style="margin-bottom: 16px;"><span style="color: #94a3b8; display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Status</span><span style="color: ${statusColor}; font-weight: 700; font-size: 15px;">${accountStatus}</span></div>`;
  if (amount) detailsHtml += `<div style="margin-bottom: 16px;"><span style="color: #94a3b8; display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Amount</span><span style="color: #ffffff; font-weight: 700; font-size: 18px;">${amount}</span></div>`;
  if (paymentMethod) detailsHtml += `<div style="margin-bottom: 16px;"><span style="color: #94a3b8; display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Method</span><span style="color: #ffffff; font-weight: 500; font-size: 15px;">${paymentMethod}</span></div>`;
  if (transactionId) detailsHtml += `<div style="margin-bottom: 16px;"><span style="color: #94a3b8; display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Blockchain / TX ID</span><span style="color: #ffffff; font-family: monospace; font-size: 13px; word-break: break-all;">${transactionId}</span></div>`;
  if (notes) detailsHtml += `<div style="margin-bottom: 16px; grid-column: span 2;"><span style="color: #94a3b8; display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Notes</span><span style="color: #cbd5e1; font-weight: 400; font-size: 14px;">${notes}</span></div>`;

  let actionHtml = '';
  if (actionText && actionLink) {
    actionHtml = `<div style="margin-top: 32px; text-align: center;"><a href="${actionLink}" style="background-color: #3b82f6; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.35);">${actionText}</a></div>`;
  }

  return baseTemplate(`
    <h3 style="margin-top: 0; color: #ffffff; font-size: 22px;">Hello ${username},</h3>
    <p style="color: #cbd5e1; font-size: 16px;">This is a formal notification regarding your recent transaction on Aetheris.</p>
    
    <div style="background: #0f172a; padding: 24px; border-radius: 12px; margin: 32px 0; border: 1px solid #1e293b;">
      <h4 style="margin-top: 0; margin-bottom: 24px; color: #ffffff; font-size: 18px; border-bottom: 1px solid #1e293b; padding-bottom: 16px;">Transaction Details</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        ${detailsHtml}
      </div>
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #1e293b;">
        <span style="color: #94a3b8; font-size: 13px;"><strong>Date & Time:</strong> ${new Date().toUTCString()}</span>
      </div>
    </div>

    ${isFailed ? `<p style="color: #ef4444; font-size: 15px; margin-bottom: 24px;">If you believe this is an error, please contact support or try your transaction again with a different payment method.</p>` : ''}
    ${actionHtml}
    
    <p style="color: #94a3b8; font-size: 16px; margin-top: 32px; border-top: 1px solid #334155; padding-top: 24px; margin-bottom: 0;">— Aetheris Team</p>
  `, logoUrl);
};

export const getSecurityAlertTemplate = ({
  username,
  actionText,
  deviceInfo,
  browserInfo,
  ipLocation,
  logoUrl
}: any) => {
  return baseTemplate(`
    <h3 style="margin-top: 0; color: #ffffff; font-size: 22px;">Hello ${username},</h3>
    <p style="color: #cbd5e1; font-size: 16px;">A security event was just recorded on your Aetheris account:</p>
    <p style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 24px 0;">${actionText}</p>
    
    <div style="background: #0f172a; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #1e293b;">
      <h4 style="margin-top: 0; margin-bottom: 16px; color: #94a3b8; font-size: 14px; text-transform: uppercase;">Session Details</h4>
      ${deviceInfo ? `<div style="margin-bottom: 12px; color: #cbd5e1; font-size: 14px;"><strong>Device:</strong> ${deviceInfo}</div>` : ''}
      ${browserInfo ? `<div style="margin-bottom: 12px; color: #cbd5e1; font-size: 14px;"><strong>Browser:</strong> ${browserInfo}</div>` : ''}
      ${ipLocation ? `<div style="margin-bottom: 12px; color: #cbd5e1; font-size: 14px;"><strong>IP/Location:</strong> ${ipLocation}</div>` : ''}
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #1e293b;">
        <span style="color: #94a3b8; font-size: 13px;"><strong>Time:</strong> ${new Date().toUTCString()}</span>
      </div>
    </div>

    <p style="color: #cbd5e1; font-size: 15px; margin-top: 24px;">If this was you, you can safely ignore this email.</p>
    <div style="background-color: #450a0a; border: 1px solid #7f1d1d; padding: 16px; border-radius: 8px; margin-top: 24px;">
      <p style="color: #fca5a5; font-size: 15px; margin: 0;"><strong>If you did not authorize this action:</strong> Please change your password immediately and contact our support team to secure your account.</p>
    </div>
    <p style="color: #94a3b8; font-size: 16px; margin-top: 32px; border-top: 1px solid #334155; padding-top: 24px; margin-bottom: 0;">— Aetheris Security</p>
  `, logoUrl);
};

export const getPlanPausedTemplate = (username: string, planName: string, neededAmount: number, userBalance: number, dashboardLink: string, logoUrl?: string) => {
  return baseTemplate(`
    <h3 style="margin-top: 0; color: #ffffff; font-size: 22px; line-height: 1.4;">Hello ${username},</h3>
    <p style="color: #cbd5e1; font-size: 16px; margin-top: 16px; margin-bottom: 16px; line-height: 1.6;">We are writing to inform you that your trading plan <strong>${planName}</strong> has been auto-paused due to insufficient allocated balance.</p>
    
    <div style="background-color: #450a0a; border: 1px solid #7f1d1d; padding: 24px; border-radius: 12px; margin: 24px 0;">
      <h4 style="margin-top: 0; color: #fca5a5; font-size: 16px; font-weight: 700; margin-bottom: 12px;">Deduction Failed & Engine Paused</h4>
      <p style="color: #f87171; font-size: 15px; margin: 0 0 12px 0; line-height: 1.5;">Our automatic billing engine could not process the scheduled interval payment of <strong>$${neededAmount.toFixed(2)}</strong>.</p>
      <p style="color: #c084fc; font-size: 14px; font-weight: 600; margin: 0; background: #3b0764; display: inline-block; padding: 6px 12px; border-radius: 6px; border: 1px solid #581c87;">Reason: Insufficient Allocated Balance (Wallet: $${userBalance.toFixed(2)})</p>
    </div>
    
    <p style="color: #cbd5e1; font-size: 15px; margin-bottom: 24px; line-height: 1.6;">To resume your automated trading cycles, please distribute capital to your Aetheris wallet and proceed to reactivate your plan.</p>
    
    <div style="margin-top: 32px; text-align: center; margin-bottom: 16px;">
      <a href="${dashboardLink}" style="background-color: #3b82f6; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.35);">Access Dashboard</a>
    </div>
    <p style="color: #94a3b8; font-size: 16px; margin-top: 32px; border-top: 1px solid #334155; padding-top: 24px; margin-bottom: 0;">— Aetheris Team</p>
  `, logoUrl);
};

export const getSupportReplyTemplate = (username: string, ticketSubject: string, replyMessage: string, logoUrl?: string) => {
  return baseTemplate(`
    <h3 style="margin-top: 0; color: #ffffff; font-size: 22px; line-height: 1.4;">Hello ${username},</h3>
    <p style="color: #cbd5e1; font-size: 16px; margin-top: 16px; margin-bottom: 16px; line-height: 1.6;">Our support team has replied to your ticket: <strong>${ticketSubject}</strong></p>
    
    <div style="background-color: #0f172a; padding: 24px; border-radius: 12px; border: 1px solid #1e293b; margin: 24px 0; color: #f8fafc; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${replyMessage}</div>
    
    <p style="color: #cbd5e1; font-size: 15px; margin-bottom: 24px; line-height: 1.6;">If you have further questions or need additional assistance, you can reply directly to this email or update your ticket in the dashboard.</p>
    <p style="color: #94a3b8; font-size: 16px; margin-top: 32px; border-top: 1px solid #334155; padding-top: 24px; margin-bottom: 0;">— Aetheris Support Team</p>
  `, logoUrl);
};
