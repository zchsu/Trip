const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // 允許所有來源
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const site_no = req.query.site_no;
  if (!site_no) {
    return res.status(400).json({ error: '缺少 site_no' });
  }
  try {
    const response = await axios.get(`https://owlocker.com/api/locker/${site_no}`, { timeout: 10000 });
    res.status(200).json(response.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};