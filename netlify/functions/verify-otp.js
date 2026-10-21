const crypto = require('crypto');

function sign(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let email, otp, token;
  try {
    ({ email, otp, token } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid_json' }) };
  }

  if (!email || !otp || !token) {
    return { statusCode: 400, body: JSON.stringify({ error: 'missing_fields' }) };
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error' }) };
  }

  const e = email.toLowerCase().trim();
  const w = Math.floor(Date.now() / 1000 / 120);

  // Check current and previous window to handle boundary edge case
  const valid =
    sign(resendKey, `${e}:${otp}:${w}`) === token ||
    sign(resendKey, `${e}:${otp}:${w - 1}`) === token;

  if (!valid) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};
