const axios = require('axios');
const iconv = require('iconv-lite');

async function test() {
  const symbol = 'sh000001';
  const scale = '240';
  const datalen = '10';

  try {
    const klineUrl = `http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${symbol}&scale=${scale}&ma=no&datalen=${datalen}`;
    const quoteUrl = `http://hq.sinajs.cn/list=${symbol}`;

    const [klineRes, quoteRes] = await Promise.all([
      axios.get(klineUrl, {
        headers: { 'Referer': 'https://finance.sina.com.cn/', 'User-Agent': 'Mozilla/5.0' },
        timeout: 5000,
      }),
      axios.get(quoteUrl, {
        responseType: 'arraybuffer',
        headers: { 'Referer': 'https://finance.sina.com.cn/', 'User-Agent': 'Mozilla/5.0' },
        timeout: 5000,
      })
    ]);

    const klineData = klineRes.data;
    let result = klineData.map((item) => ({
      time: item.day.includes(' ') ? item.day.split(' ')[0] : item.day,
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseFloat(item.volume),
    }));

    const quoteStr = iconv.decode(Buffer.from(quoteRes.data), 'GBK');
    const match = quoteStr.match(/hq_str_(.+?)="(.+?)"/);
    if (match) {
      const fields = match[2].split(',');
      console.log('Quote fields length:', fields.length);
      console.log('Field 30 (Date):', fields[30]);
      console.log('Field 1 (Open):', fields[1]);

      if (fields.length >= 32) {
        const todayDate = fields[30];
        const open = parseFloat(fields[1]);
        const high = parseFloat(fields[4]);
        const low = parseFloat(fields[5]);
        const price = parseFloat(fields[3]);
        const volume = parseFloat(fields[8]);

        if (open > 0) {
          const lastEntry = result[result.length - 1];
          const quoteEntry = {
            time: todayDate,
            open: open,
            high: high,
            low: low,
            close: price === 0 ? open : price,
            volume: volume,
          };

          if (lastEntry && lastEntry.time === todayDate) {
            console.log('Updating today bar');
            result[result.length - 1] = quoteEntry;
          } else if (!lastEntry || lastEntry.time < todayDate) {
            console.log('Appending today bar');
            result.push(quoteEntry);
          }
        }
      }
    }

    console.log('Final 2 entries:', result.slice(-2));
  } catch (e) {
    console.error(e);
  }
}

test();
