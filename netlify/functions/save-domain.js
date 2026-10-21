const INTERCOM_API = 'https://api.intercom.io';

async function setIntercomAttribute(email) {
  const token = process.env.INTERCOM_TOKEN;
  if (!token || !email) {
    console.log('[intercom] missing token or email');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Intercom-Version': '2.10',
  };

  // Step 1: search for existing contact by email
  const searchRes = await fetch(`${INTERCOM_API}/contacts/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: { field: 'email', operator: '=', value: email },
    }),
  });
  const searchData = await searchRes.json();
  console.log('[search] status:', searchRes.status, 'total:', searchData?.total_count);

  if (searchData?.total_count > 0) {
    const contact = searchData.data[0];
    console.log('[contact] id:', contact.id, 'role:', contact.role);

    // Step 2: try PUT (Intercom v2 update endpoint)
    const putRes = await fetch(`${INTERCOM_API}/contacts/${contact.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ custom_attributes: { outlook_manifest: true } }),
    });
    const putBody = await putRes.text();
    console.log('[put] status:', putRes.status, 'body:', putBody.substring(0, 600));

    if (putRes.ok) {
      console.log('[put] success - attribute updated');
      return;
    }

    // Step 3: try PATCH
    const patchRes = await fetch(`${INTERCOM_API}/contacts/${contact.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ custom_attributes: { outlook_manifest: true } }),
    });
    const patchBody = await patchRes.text();
    console.log('[patch] status:', patchRes.status, 'body:', patchBody.substring(0, 600));

    if (patchRes.ok) {
      console.log('[patch] success - attribute updated');
      return;
    }

    // Step 4: try PUT without Intercom-Version header
    const headersNoVersion = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    const putRes2 = await fetch(`${INTERCOM_API}/contacts/${contact.id}`, {
      method: 'PUT',
      headers: headersNoVersion,
      body: JSON.stringify({ custom_attributes: { outlook_manifest: true } }),
    });
    const putBody2 = await putRes2.text();
    console.log('[put-no-version] status:', putRes2.status, 'body:', putBody2.substring(0, 600));

    if (putRes2.ok) {
      console.log('[put-no-version] success');
      return;
    }

    console.log('[intercom] all update attempts failed - creating/updating lead as fallback');
  }

  // Fallback: create a lead with manifest_ok: true
  const leadRes = await fetch(`${INTERCOM_API}/contacts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ role: 'lead', email, custom_attributes: { outlook_manifest: true } }),
  });
  const leadData = await leadRes.json();
  console.log('[lead-fallback] status:', leadRes.status, 'id:', leadData?.id, 'errors:', JSON.stringify(leadData?.errors));
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let email;
  try {
    ({ email } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  console.log('[save-domain] email:', email);

  if (email) {
    try {
      await setIntercomAttribute(email.toLowerCase().trim());
    } catch (e) {
      console.log('[error]', e.message, e.stack);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
