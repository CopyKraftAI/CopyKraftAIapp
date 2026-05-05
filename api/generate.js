export default async function handler(req, res) {
  try {
    let prompt = '';
    
    if (req.body && req.body.prompt) {
      prompt = req.body.prompt;
    } else if (typeof req.body === 'string') {
      prompt = JSON.parse(req.body).prompt;
    }

    console.log('Key:', !!process.env.ANTHROPIC_KEY);
    console.log('Prompt length:', prompt.length);

    if (!prompt) {
      return res.status(400).json({ error: 'No prompt' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data).slice(0, 100));
    const text = data?.content?.[0]?.text || '';
    res.status(200).json({ text });

  } catch(e) {
    console.error('Caught error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
