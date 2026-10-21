const crypto = require('crypto');

function sign(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function timeWindow() {
  return Math.floor(Date.now() / 1000 / 120); // 2-minute windows
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let email;
  try {
    ({ email } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid_json' }) };
  }

  if (!email || !email.includes('@')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid_email' }) };
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error' }) };
  }

  const otp = String(crypto.randomInt(100000, 999999));
  const token = sign(resendKey, `${email.toLowerCase()}:${otp}:${timeWindow()}`);

  console.log('[send-otp] sending to:', email, '| key present:', !!resendKey);

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'SingleCase <onboarding@resend.dev>',
      to: [email],
      subject: 'Your SingleCase access code',
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <img src="https://singlecase.cz/wp-content/uploads/2023/01/singlecase-logo.png" alt="SingleCase" height="32" style="margin-bottom:24px;" />
          <p style="font-size:15px;color:#111827;margin-bottom:8px;">Your access code is:</p>
          <p style="font-size:36px;font-weight:700;letter-spacing:8px;color:#00204a;margin:16px 0;">${otp}</p>
          <p style="font-size:13px;color:#6b7280;">This code expires in 2 minutes. If you did not request this, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  const resendBody = await resendRes.text();
  console.log('[send-otp] resend status:', resendRes.status, 'body:', resendBody);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  };
};
