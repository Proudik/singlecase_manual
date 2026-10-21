const ENVIRONMENTS = [
  {
    pattern: /\.singlecase\.app$/,
    manifest: 'https://outlook.singlecase.com/manifest.xml',
  },
  {
    pattern: /\.singlecase\.ch$/,
    manifest: 'https://outlook-add-in-zurich-prod.s3.eu-central-1.amazonaws.com/manifest.xml',
  },
  {
    pattern: /^sc\.havelpartners\.cz$/,
    manifest: 'https://outlook-add-in-hp-prod.s3.eu-central-1.amazonaws.com/manifest.xml',
  },
  {
    pattern: /^sc\.prk\.cz$/,
    manifest: 'https://outlook-add-in-prk-prod.s3.eu-central-1.amazonaws.com/manifest.xml',
  },
  {
    pattern: /^sc\.rowan\.legal$/,
    manifest: 'https://outlook-add-in-rowan-prod.s3.eu-central-1.amazonaws.com/manifest.xml',
  },
  {
    pattern: /^singlecase\.cms-rrh\.com$/,
    manifest: null,
  },
  {
    pattern: /^singlecase\.r-p\.sk$/,
    manifest: null,
  },
  {
    pattern: /^sc\.valfor\.app$/,
    manifest: null,
  },
  {
    pattern: /\.singlecase-trial\.app$/,
    manifest: null,
  },
  {
    pattern: /\.singlecase-tc\.app$/,
    manifest: 'https://outlook-add-in-stg.s3.eu-central-1.amazonaws.com/manifest.xml',
  },
];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let domain;
  try {
    ({ domain } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid_json' }) };
  }

  if (!domain || typeof domain !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'missing_domain' }) };
  }

  const clean = domain.trim().toLowerCase();
  const match = ENVIRONMENTS.find(e => e.pattern.test(clean));

  if (!match) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'unknown' }),
    };
  }

  if (!match.manifest) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'unavailable' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ manifest: match.manifest }),
  };
};
