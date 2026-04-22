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
    <div className="glass rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-white/5 bg-white/5 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-6">
            <button 
              onClick={() => setActiveTab('watchlist')}
              className={`text-sm font-bold pb-2 border-b-2 transition-all ${activeTab === 'watchlist' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              自选股
            </button>
            <button className="text-sm font-bold pb-2 border-b-2 border-transparent text-gray-600 cursor-not-allowed">
              今日涨停 <span className="text-red-500/80 ml-1">(51)</span>
            </button>
            <button className="text-sm font-bold pb-2 border-b-2 border-transparent text-gray-600 cursor-not-allowed">
              今日跌停 <span className="text-emerald-500/80 ml-1">(39)</span>
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="代码/名称"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addStock()}
              className="bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 transition-all w-32"
            />
            <button onClick={addStock} className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg transition-colors">
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="text-gray-500 border-b border-white/5 bg-white/2">
              <th className="px-4 py-3 font-medium">股票</th>
              <th className="px-4 py-3 font-medium">最新价</th>
              <th className="px-4 py-3 font-medium">涨跌幅</th>
              <th className="px-4 py-3 font-medium">成本价</th>
              <th className="px-4 py-3 font-medium">持仓量</th>
              <th className="px-4 py-3 font-medium">盈亏</th>
              <th className="px-4 py-3 font-medium">成交量</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
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
                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className={`font-bold ${isUp ? 'text-red-500' : 'text-emerald-500'}`}>{s.name}</span>
                        <span className="text-[10px] text-gray-500 uppercase">{s.code}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 font-mono font-bold ${isUp ? 'stock-up' : 'stock-down'}`}>
                      {s.price}
                    </td>
                    <td className={`px-4 py-3 font-mono ${isUp ? 'stock-up' : 'stock-down'}`}>
                      {isUp ? '+' : ''}{s.pct}%
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        placeholder="--"
                        value={pos.cost}
                        onChange={(e) => updatePosition(s.code, 'cost', e.target.value)}
                        className="bg-white/5 border border-white/10 rounded w-20 px-2 py-1 text-xs focus:border-blue-500 outline-none transition-all"
                      />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        placeholder="--"
                        value={pos.amount}
                        onChange={(e) => updatePosition(s.code, 'amount', e.target.value)}
                        className="bg-white/5 border border-white/10 rounded w-20 px-2 py-1 text-xs focus:border-blue-500 outline-none transition-all"
                      />
                    </td>
                    <td className={`px-4 py-3 font-mono`}>
                      {profit !== 0 ? (
                        <div className="flex flex-col">
                          <span className={profit >= 0 ? 'stock-up' : 'stock-down'}>{profit.toFixed(2)}</span>
                          <span className={`text-[10px] ${profit >= 0 ? 'stock-up' : 'stock-down'}`}>{profitPct.toFixed(2)}%</span>
                        </div>
                      ) : (
                        <span className="text-gray-600">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                      {(parseInt(s.volume) / 10000).toFixed(1)}万
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStock(s.code);
                        }}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-1.5 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
};
        {quotes.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            暂无自选股，请在上方输入代码添加
          </div>
        )}
      </div>
    </div>
  );
};
