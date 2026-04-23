'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

interface StockQuote {
  code: string;
  name: string;
  price: string;
  change: string;
  pct: string;
  volume: string;
  turnover?: string; // We'll add this from API
}

interface Position {
  code: string;
  cost: string;
  amount: string;
}

interface StockAnnouncement {
  id: string;
  title: string;
  date: string;
  url: string;
}

interface WatchlistProps {
  onSelect: (stock: { code: string; name: string }) => void;
}

export const Watchlist: React.FC<WatchlistProps> = ({ onSelect }) => {
  const [codes, setCodes] = useState<string[]>([]);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [announcements, setAnnouncements] = useState<Record<string, StockAnnouncement>>({});
  const [readAnnouncements, setReadAnnouncements] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState('watchlist');

  useEffect(() => {
    const savedCodes = localStorage.getItem('watchlist');
    const savedPositions = localStorage.getItem('positions');
    const savedReadAnn = localStorage.getItem('read_announcements');
    
    if (savedCodes) setCodes(JSON.parse(savedCodes));
    else setCodes(['sh600000', 'sz000001']);
    
    if (savedPositions) setPositions(JSON.parse(savedPositions));
    if (savedReadAnn) setReadAnnouncements(JSON.parse(savedReadAnn));
  }, []);

  useEffect(() => {
    localStorage.setItem('watchlist', JSON.stringify(codes));
    localStorage.setItem('positions', JSON.stringify(positions));
    localStorage.setItem('read_announcements', JSON.stringify(readAnnouncements));
    fetchQuotes();
    fetchAnnouncements();
  }, [codes, positions, readAnnouncements]);

  const fetchQuotes = async () => {
    if (codes.length === 0) {
      setQuotes([]);
      return;
    }
    try {
      const res = await fetch(`/api/stock/quote?codes=${codes.join(',')}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) {
          setQuotes(json);
        } else {
          console.error('API returned non-array data:', json);
        }
      } else {
        console.error('API Error:', res.status, res.statusText);
      }
    } catch (e) {
      console.error('Failed to fetch quotes', e);
    }
  };

  const fetchAnnouncements = async () => {
    if (codes.length === 0) return;
    
    // Fetch announcements for each code
    // To avoid too many requests, we could do them in parallel or sequence
    // Here we fetch one by one but they are cached on the server
    for (const code of codes) {
      try {
        const res = await fetch(`/api/stock/announcements?code=${code}`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setAnnouncements(prev => ({ ...prev, [code]: data }));
          }
        }
      } catch (e) {
        console.error(`Failed to fetch announcements for ${code}`, e);
      }
    }
  };

  useEffect(() => {
    const timer = setInterval(fetchQuotes, 5000); 
    return () => clearInterval(timer);
  }, [codes]);

  // Fetch announcements less frequently (every 30 mins)
  useEffect(() => {
    const timer = setInterval(fetchAnnouncements, 1000 * 60 * 30);
    return () => clearInterval(timer);
  }, [codes]);

  const markAnnAsRead = (annId: string) => {
    if (!readAnnouncements.includes(annId)) {
      setReadAnnouncements([...readAnnouncements, annId]);
    }
  };

  const updatePosition = (code: string, field: 'cost' | 'amount', value: string) => {
    setPositions(prev => ({
      ...prev,
      [code]: {
        ...(prev[code] || { code, cost: '', amount: '' }),
        [field]: value
      }
    }));
  };

  const addStock = () => {
    if (!inputValue) return;
    let code = inputValue.toLowerCase();
    if (!code.startsWith('sh') && !code.startsWith('sz')) {
      code = (code.startsWith('6') ? 'sh' : 'sz') + code;
    }
    if (!codes.includes(code)) {
      setCodes([...codes, code]);
    }
    setInputValue('');
  };

  const removeStock = (code: string) => {
    setCodes(codes.filter(c => c !== code));
    const newPositions = { ...positions };
    delete newPositions[code];
    setPositions(newPositions);
  };

  const totalProfit = quotes.reduce((acc, s) => {
    const pos = positions[s.code];
    if (pos && pos.cost && pos.amount) {
      return acc + (parseFloat(s.price) - parseFloat(pos.cost)) * parseFloat(pos.amount);
    }
    return acc;
  }, 0);

  const totalCost = quotes.reduce((acc, s) => {
    const pos = positions[s.code];
    if (pos && pos.cost && pos.amount) {
      return acc + parseFloat(pos.cost) * parseFloat(pos.amount);
    }
    return acc;
  }, 0);

  const totalProfitPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Total Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="glass p-4 rounded-2xl border border-white/5 bg-gradient-to-br from-blue-600/10 to-transparent">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">持仓实时总盈亏 (元)</span>
            <div className={`p-1 rounded-lg ${totalProfit >= 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
               {totalProfit >= 0 ? <TrendingUp size={14} className="text-red-500" /> : <TrendingDown size={14} className="text-emerald-500" />}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black font-sans ${totalProfit >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {totalProfit >= 0 ? '+' : ''}{totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className={`text-sm font-bold font-sans ${totalProfit >= 0 ? 'text-red-500/60' : 'text-emerald-500/60'}`}>
              {totalProfit >= 0 ? '+' : ''}{totalProfitPct.toFixed(2)}%
            </span>
          </div>
        </div>
        
        <div className="glass p-4 rounded-2xl border border-white/5 bg-gradient-to-br from-white/5 to-transparent flex items-center justify-between">
           <div>
             <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest block mb-0.5">自选监控统计</span>
             <div className="text-lg font-bold text-gray-200">
               {quotes.length} <span className="text-xs text-gray-500 font-normal">只监控标的</span>
             </div>
           </div>
           <div className="text-right">
             <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest block mb-0.5">监控总市值</span>
             <div className="text-lg font-bold text-white font-sans">
               {quotes.reduce((acc, s) => acc + parseFloat(s.price) * (parseFloat(positions[s.code]?.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
             </div>
           </div>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden shadow-2xl border border-white/5">
      <div className="px-5 py-3 border-b border-white/5 bg-white/2 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
          自选监控
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="输入代码"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addStock()}
            className="bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-all w-40"
          />
          <button onClick={addStock} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-all active:scale-95">
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-500 border-b border-white/5 bg-white/[0.02] uppercase tracking-wider text-[10px] font-bold">
              <th className="px-5 py-3">股票名称</th>
              <th className="px-5 py-3">当前价格</th>
              <th className="px-5 py-3">当日涨幅</th>
              <th className="px-5 py-3">持仓/成本</th>
              <th className="px-5 py-3">实时盈亏</th>
              <th className="px-5 py-3">最新公告</th>
              <th className="px-5 py-3 text-right">管理</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            <AnimatePresence>
              {quotes.map((s) => {
                const isUp = parseFloat(s.pct) >= 0;
                const pos = positions[s.code] || { cost: '', amount: '' };
                const currentPrice = parseFloat(s.price);
                const costPrice = parseFloat(pos.cost);
                const amount = parseFloat(pos.amount);
                
                let profit = 0;
                let profitPct = 0;
                if (!isNaN(costPrice) && !isNaN(amount) && costPrice > 0) {
                  profit = (currentPrice - costPrice) * amount;
                  profitPct = ((currentPrice - costPrice) / costPrice) * 100;
                }

                return (
                  <motion.tr
                    key={s.code}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => onSelect({ code: s.code, name: s.name })}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-2">
                      <div className="flex flex-col">
                        <span className={`text-base font-black tracking-tight ${isUp ? 'text-red-500' : 'text-emerald-500'}`}>{s.name}</span>
                        <span className="text-[10px] text-gray-500 font-sans tracking-tight uppercase">{s.code}</span>
                      </div>
                    </td>
                    <td className={`px-5 py-2 text-lg font-sans font-black ${isUp ? 'stock-up' : 'stock-down'}`}>
                      {s.price}
                    </td>
                    <td className={`px-5 py-2 text-base font-sans font-bold ${isUp ? 'stock-up' : 'stock-down'}`}>
                      {isUp ? '+' : ''}{s.pct}%
                    </td>
                    <td className="px-5 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-1">
                        <input
                          type="number"
                          placeholder="成本价"
                          value={pos.cost}
                          onChange={(e) => updatePosition(s.code, 'cost', e.target.value)}
                          className="bg-black/40 border border-white/10 rounded-lg w-24 px-2 py-1 text-xs font-sans focus:border-blue-500 outline-none transition-all"
                        />
                        <input
                          type="number"
                          placeholder="持仓量"
                          value={pos.amount}
                          onChange={(e) => updatePosition(s.code, 'amount', e.target.value)}
                          className="bg-black/40 border border-white/10 rounded-lg w-24 px-2 py-1 text-xs font-sans focus:border-blue-500 outline-none transition-all"
                        />
                      </div>
                    </td>
                    <td className={`px-5 py-2`}>
                      {profit !== 0 ? (
                        <div className="flex flex-col">
                          <span className={`text-lg font-black font-sans ${profit >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {profit >= 0 ? '+' : ''}{profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <span className={`text-xs font-bold font-sans ${profit >= 0 ? 'text-red-500/80' : 'text-emerald-500/80'}`}>
                            {profit >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-700 font-bold text-xs uppercase">未持仓</span>
                      )}
                    </td>
                    <td className="px-5 py-2">
                       {announcements[s.code] ? (
                         <a 
                           href={announcements[s.code].url} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           onClick={(e) => {
                             e.stopPropagation();
                             markAnnAsRead(announcements[s.code].id);
                           }}
                           className={`text-[11px] max-w-[150px] block truncate transition-colors ${readAnnouncements.includes(announcements[s.code].id) ? 'text-gray-600' : 'text-red-500 hover:text-red-400 font-bold'}`}
                           title={announcements[s.code].title}
                         >
                           {announcements[s.code].title}
                         </a>
                       ) : (
                         <span className="text-[9px] text-gray-700 font-bold uppercase">无公告</span>
                       )}
                    </td>
                    <td className="px-5 py-2 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStock(s.code);
                        }}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-1.5 rounded-lg transition-all active:scale-90"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
        {quotes.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-gray-600">
              <Plus size={32} />
            </div>
            <p className="text-gray-500 font-medium">暂无自选监控，请输入代码添加</p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};
