export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { email } = req.body;

  await fetch('https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI0IiwianRpIjoiMjk3OTIzZjVmOGUxMGYxYjI5ODMwYmZhZWUxMzI5YzJhNThiYjZhYzYxNjIxMjRjYmI0NjNlNTk4MTM2MGYzY2RmN2MwMTAyNGNhZGJlMGEiLCJpYXQiOjE3NzgwMTMwMTQuMjY5MTQ2LCJuYmYiOjE3NzgwMTMwMTQuMjY5MTQ5LCJleHAiOjQ5MzM2ODY2MTQuMjYyODc3LCJzdWIiOiIyMzQwMjU2Iiwic2NvcGVzIjpbXX0.W9xUgnJ3KryE273eWkA-UT8g9aPGpVOt7ckX0QvqCkPjS7Pf_k5lAmTSQTbdQHOr3TxcpIDmKbQAWvfluyRGgTWWDs1HfTxmXZdca0GfXpYgGY4Mlpf2T_DccJl-DIeLd_enl47v3_KqpBLlYHefaI2bKPzY82YFDwQftc1BD_JEaGkOamANxJ8VIh-1fAoeC-hCHu-ViCu_LBvR0M-slZor9JyRTUiZqdgX2bvF9Efo_3D8XnH0tbW4FANLVhwzK7ylZVi5xE8baCE1QD2_aXWSRd7c89fNfRqmtXmpP_5B7hHNigt5JyfZ_QJqWMJGef0pXspYt11F8jl3D1fBf4Jf_T4SHGf_KmAGtWHoNgZHSuwgGxOqthUYKdZCNabT22cQgi0eTb0F3CvnSc_9MHpS3rfBbqW9gAiGvwSEhLqqtNqJgWwTA6ZMRqtuYjcYzctZiL_iwbUPkijl4tssmukHNYezsqF4ZhkUMiVZVi6Kvjst0u-vRg5HFobCVTPeOWxshi7dblHjLsm6ewH3Ir3YDDiE3KiPCMc9JBl0buHE3yEnl-3vx3NQ36l0bBp5irLD2Xhf4zui_AEEO0pnjrxUp-15ieHcV5L8iszPXcYVjeFOkK8Kp93uIdCgKnnZYT9-ofOJbBQ506Y4MG0ewC6v-XCxi5wLteomHV3kOXA`
    },
    body: JSON.stringify({
      email,
      groups: ['186658298668255068']
    })
  });

  res.status(200).json({ success: true });
}
