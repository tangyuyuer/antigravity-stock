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

interface WatchlistProps {
  onSelect: (stock: { code: string; name: string }) => void;
}

export const Watchlist: React.FC<WatchlistProps> = ({ onSelect }) => {
  const [codes, setCodes] = useState<string[]>([]);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState('watchlist');

  useEffect(() => {
    const savedCodes = localStorage.getItem('watchlist');
    const savedPositions = localStorage.getItem('positions');
    if (savedCodes) setCodes(JSON.parse(savedCodes));
    else setCodes(['sh600000', 'sz000001']);
    
    if (savedPositions) setPositions(JSON.parse(savedPositions));
  }, []);

  useEffect(() => {
    localStorage.setItem('watchlist', JSON.stringify(codes));
    localStorage.setItem('positions', JSON.stringify(positions));
    fetchQuotes();
  }, [codes, positions]);

  const fetchQuotes = async () => {
    if (codes.length === 0) {
      setQuotes([]);
      return;
    }
    try {
      const res = await fetch(`/api/stock/quote?codes=${codes.join(',')}`);
      const json = await res.json();
      setQuotes(json);
    } catch (e) {
      console.error('Failed to fetch quotes', e);
    }
  };

  useEffect(() => {
    const timer = setInterval(fetchQuotes, 5000); // 每 5 秒刷新一次
    return () => clearInterval(timer);
  }, [codes]);

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

  return (
    <div className="glass rounded-2xl overflow-hidden shadow-2xl border border-white/5">
      <div className="p-6 border-b border-white/5 bg-white/2 flex justify-between items-center">
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
            <tr className="text-gray-500 border-b border-white/5 bg-white/[0.02] uppercase tracking-wider text-[11px] font-bold">
              <th className="px-6 py-4">股票名称</th>
              <th className="px-6 py-4">当前价格</th>
              <th className="px-6 py-4">当日涨幅</th>
              <th className="px-6 py-4">持仓/成本</th>
              <th className="px-6 py-4">实时盈亏</th>
              <th className="px-6 py-4">成交额</th>
              <th className="px-6 py-4 text-right">管理</th>
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
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className={`text-lg font-black tracking-tight ${isUp ? 'text-red-500' : 'text-emerald-500'}`}>{s.name}</span>
                        <span className="text-xs text-gray-500 font-sans tracking-tight uppercase">{s.code}</span>
                      </div>
                    </td>
                    <td className={`px-6 py-5 text-xl font-sans font-black ${isUp ? 'stock-up' : 'stock-down'}`}>
                      {s.price}
                    </td>
                    <td className={`px-6 py-5 text-lg font-sans font-bold ${isUp ? 'stock-up' : 'stock-down'}`}>
                      {isUp ? '+' : ''}{s.pct}%
                    </td>
                    <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-2">
                        <input
                          type="number"
                          placeholder="成本价"
                          value={pos.cost}
                          onChange={(e) => updatePosition(s.code, 'cost', e.target.value)}
                          className="bg-black/40 border border-white/10 rounded-lg w-28 px-3 py-1.5 text-sm font-sans focus:border-blue-500 outline-none transition-all"
                        />
                        <input
                          type="number"
                          placeholder="持仓量"
                          value={pos.amount}
                          onChange={(e) => updatePosition(s.code, 'amount', e.target.value)}
                          className="bg-black/40 border border-white/10 rounded-lg w-28 px-3 py-1.5 text-sm font-sans focus:border-blue-500 outline-none transition-all"
                        />
                      </div>
                    </td>
                    <td className={`px-6 py-5`}>
                      {profit !== 0 ? (
                        <div className="flex flex-col">
                          <span className={`text-xl font-black font-sans ${profit >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {profit >= 0 ? '+' : ''}{profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <span className={`text-sm font-bold font-sans ${profit >= 0 ? 'text-red-500/80' : 'text-emerald-500/80'}`}>
                            {profit >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-700 font-bold">未持仓</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-gray-400 font-sans font-bold text-sm">
                      {(parseInt(s.volume) / 100).toFixed(1)}万
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStock(s.code);
                        }}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2.5 rounded-xl transition-all active:scale-90"
                      >
                        <Trash2 size={18} />
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
  );
};
