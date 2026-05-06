export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { name, email, subject, message } = req.body;

  const emailBody = `
New contact form submission from CopyKraft AI:

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
  `;

  // Send via Resend (free email API)
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'CopyKraft AI <onboarding@resend.dev>',
      to: 'copykraftai@gmail.com',
      subject: `[CopyKraft Contact] ${subject} - from ${name}`,
      text: emailBody
    })
  });

  if (response.ok) {
    res.status(200).json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to send' });
  }
}
