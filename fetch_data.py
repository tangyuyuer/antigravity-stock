#!/usr/bin/env python3
"""
fetch_data.py — 全量数据抓取（efinance + 新浪）
efinance: 个股实时（批量一次拉完）
新浪: 指数实时 + 涨停/跌停名单
"""
import subprocess, json, time, signal, re
from datetime import datetime

OUT = "/Users/zifanni/stock-website/data/website_data.json"

class Timeout(Exception): pass

def timeout_handler(signum, frame): raise Timeout()
signal.signal(signal.SIGALRM, timeout_handler)

def curl(url, referer=""):
    h = ["User-Agent: Mozilla/5.0"]
    if referer: h.append(f"Referer: {referer}")
    args = ["curl", "-s", "--max-time", "8"] + [item for x in h for item in ["-H", x]] + [url]
    try:
        r = subprocess.run(args, capture_output=True)
        return r.stdout.decode("utf-8", errors="replace")
    except: return ""

def tf(v):
    try: return float(v)
    except: return None

# 新浪API指数代码前缀映射
_SINA_SH_CODES = {"000001", "000688", "000905", "000300"}

def fetch_index_sina(code, name):
    """用新浪API获取单个指数（efinance有bug，把000001解析成平安银行）"""
    prefix = "sh" if code in _SINA_SH_CODES else "sz"
    url = f"http://hq.sinajs.cn/list={prefix}{code}"
    raw = curl(url, "https://finance.sina.com.cn/")
    if not raw:
        return None
    try:
        # 格式: var hq_str_xxx="名称,当前价,昨收,今开,最高,最低,...成交量,成交额,..."
        m = re.search(r'"([^"]+)"', raw)
        if not m: return None
        fields = m.group(1).split(',')
        price = float(fields[1]) if len(fields) > 1 else 0
        yesterday = float(fields[2]) if len(fields) > 2 else 0
        high = float(fields[4]) if len(fields) > 4 else 0
        low = float(fields[5]) if len(fields) > 5 else 0
        change = price - yesterday
        pct = (change / yesterday * 100) if yesterday else 0
        return {
            "name": name, "price": f"{price:.2f}",
            "pct": f"{pct:+.2f}", "high": f"{high:.2f}", "low": f"{low:.2f}",
        }
    except: return None

def fetch_all():
    import efinance.stock as ef

    # 用新浪API拉指数（efinance有bug，把000001解析成股票）
    idx_map = [
        ("000001", "sh000001", "上证指数"),
        ("399001", "sz399001", "深证成指"),
        ("399006", "sz399006", "创业板指"),
        ("000300", "sh000300", "沪深300"),
    ]
    indices = {}
    for code, gid, name in idx_map:
        signal.alarm(8)
        idx = None
        try:
            idx = fetch_index_sina(code, name)
        except Timeout:
            print(f"[sina index] {name} 超时")
        except Exception as e:
            print(f"[sina index] {name} {e}")
        finally:
            signal.alarm(0)
        if idx:
            indices[gid] = idx
        time.sleep(0.15)  # 避免请求过快

    # 批量拉自选股（efinance正常）
    try:
        signal.alarm(15)
        df_stk = ef.get_latest_quote(["300548","688037","603986"])
        signal.alarm(0)
    except Timeout:
        signal.alarm(0)
        print("[efinance stocks] 超时")
        df_stk = None
    except Exception as e:
        signal.alarm(0)
        print(f"[efinance stocks] {e}")
        df_stk = None

    my_stocks = []
    if df_stk is not None and not df_stk.empty:
        for _, r in df_stk.iterrows():
            mktcap = r.get("总市值") or 0
            my_stocks.append({
                "code": str(r.get("代码","")),
                "name": str(r.get("名称","")),
                "price": str(r.get("最新价","")),
                "pct": str(round(float(r.get("涨跌幅") or 0), 2)),
                "high": str(r.get("最高","")), "low": str(r.get("最低","")),
                "turnover": f"{r.get('换手率','--')}%",
                "pe": str(r.get("动态市盈率","--")),
                "mktcap": f"{round(mktcap/1e8,0):.0f}亿" if mktcap else "--",
            })

    # 涨停/跌停（新浪）
    lu = fetch_limit_up()
    ld = fetch_limit_down()

    return {
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "indices": indices,
        "limit_up": lu, "limit_down": ld,
        "my_stocks": my_stocks,
        "source": "efinance+sina",
    }

def fetch_limit_up():
    all_stocks = []
    for page in range(1, 8):
        raw = curl(f"https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page={page}&num=100&sort=changepercent&asc=0&node=hs_a", "https://finance.sina.com.cn/")
        try: stocks = json.loads(raw)
        except: break
        if not stocks: break
        lu = [s for s in stocks if tf(s.get("changepercent",0)) >= 9.9]
        all_stocks.extend(lu)
        if len(stocks) < 100: break
        time.sleep(0.1)
    return all_stocks[:120]

def fetch_limit_down():
    all_stocks = []
    for page in range(1, 5):
        raw = curl(f"https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page={page}&num=100&sort=changepercent&asc=1&node=hs_a", "https://finance.sina.com.cn/")
        try: stocks = json.loads(raw)
        except: break
        if not stocks: break
        ld = [s for s in stocks if tf(s.get("changepercent",0)) <= -9.9]
        all_stocks.extend(ld)
        if len(stocks) < 100: break
    return all_stocks[:30]

def sync_to_stock_website(data):
    """同步数据到 stock-website 并提交"""
    import shutil
    STOCK_DATA = "/Users/zifanni/stock-website/data/website_data.json"

    # 复制到 stock-website
    with open(STOCK_DATA, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Git 提交
    cmds = [
        ["git", "-C", "/Users/zifanni/stock-website", "add", "data/website_data.json"],
        ["git", "-C", "/Users/zifanni/stock-website", "commit", "-m", f"自动更新数据 {datetime.now().strftime('%H:%M:%S')}"],
        ["git", "-C", "/Users/zifanni/stock-website", "push", "origin", "main"],
    ]
    for cmd in cmds:
        try:
            subprocess.run(cmd, capture_output=True, timeout=10)
        except Exception as e:
            print(f"  Git操作失败: {e}")
            return False
    return True

def main():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] 开始抓取 (efinance+sina)...")
    data = fetch_all()
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] 完成！来源:{data.get('source')}")
    for v in data.get("indices",{}).values():
        print(f"  {v['name']}: {v['price']} ({v['pct']}%)")
    print(f"  涨停{len(data.get('limit_up',[]))}只 跌停{len(data.get('limit_down',[]))}只")
    for s in data.get("my_stocks",[]):
        print(f"  {s['name']}: {s['price']} ({s['pct']}%) PE:{s['pe']} 换手:{s['turnover']} 市值:{s['mktcap']}")

    # 同步到 stock-website 并推送到 Vercel
    print(f"[{datetime.now().strftime('%H:%M:%S')}] 同步到 stock-website...")
    if sync_to_stock_website(data):
        print(f"  ✓ 已推送，Vercel 将自动部署")
    else:
        print(f"  ✗ 推送失败，需手动处理")

if __name__ == "__main__":
    main()
