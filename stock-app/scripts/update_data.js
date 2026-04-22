const axios = require('axios');
const iconv = require('iconv-lite');
const fs = require('fs');
const path = require('path');

const INDICES = [
  { name: '上证指数', code: 'sh000001' },
  { name: '深证成指', code: 'sz399001' },
  { name: '创业板指', code: 'sz399006' },
];

async function fetchMarketData() {
  console.log('开始抓取指数数据...');
  const codes = INDICES.map(i => i.code).join(',');
  const url = `http://hq.sinajs.cn/list=${codes}`;
  
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { 'Referer': 'https://finance.sina.com.cn/' }
    });

    const data = iconv.decode(Buffer.from(response.data), 'GBK');
    const lines = data.split('\n').filter(l => l.trim());
    
    const result = lines.map(line => {
      const match = line.match(/hq_str_(.+?)="(.+?)"/);
      if (!match) return null;
      const fields = match[2].split(',');
      const price = parseFloat(fields[3]);
      const prevClose = parseFloat(fields[2]);
      const change = price - prevClose;
      const pct = prevClose !== 0 ? (change / prevClose * 100) : 0;
      
      return {
        code: match[1],
        name: fields[0],
        price: price.toFixed(2),
        change: change.toFixed(2),
        pct: pct.toFixed(2),
        time: new Date().toISOString()
      };
    }).filter(Boolean);

    // 确保目录存在
    const dir = path.join(process.cwd(), 'public/data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // 写入静态 JSON 文件
    fs.writeFileSync(path.join(dir, 'market.json'), JSON.stringify(result, null, 2));
    console.log('数据更新成功！保存至 public/data/market.json');
  } catch (error) {
    console.error('抓取失败:', error.message);
    process.exit(1);
  }
}

fetchMarketData();
