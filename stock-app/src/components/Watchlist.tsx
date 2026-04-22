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
}

interface WatchlistProps {
  onSelect: (stock: { code: string; name: string }) => void;
}

export const Watchlist: React.FC<WatchlistProps> = ({ onSelect }) => {
  const [codes, setCodes] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('watchlist');
    if (saved) {
      setCodes(JSON.parse(saved));
    } else {
      setCodes(['sh600000', 'sz000001']); // Default stocks
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('watchlist', JSON.stringify(codes));
    fetchQuotes();
  }, [codes]);

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
    const timer = setInterval(fetchQuotes, 5000);
    return () => clearInterval(timer);
  }, [codes]);

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
  };

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
        <h2 className="text-xl font-bold">我的自选</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="股票代码 (如 000001)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addStock()}
            className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-all w-48"
          />
          <button
            onClick={addStock}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-500 text-sm border-b border-white/5">
              <th className="px-6 py-4 font-medium">名称/代码</th>
              <th className="px-6 py-4 font-medium">最新价</th>
              <th className="px-6 py-4 font-medium">涨跌额</th>
              <th className="px-6 py-4 font-medium">涨跌幅</th>
              <th className="px-6 py-4 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {quotes.map((s) => {
                const isUp = parseFloat(s.pct) >= 0;
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
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-200">{s.name}</span>
                        <span className="text-xs text-gray-500 uppercase">{s.code}</span>
                      </div>
                    </td>
                    <td className={`px-6 py-4 font-mono font-bold ${isUp ? 'stock-up' : 'stock-down'}`}>
                      {s.price}
                    </td>
                    <td className={`px-6 py-4 font-mono ${isUp ? 'stock-up' : 'stock-down'}`}>
                      <div className="flex items-center gap-1">
                        {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {s.change}
                      </div>
                    </td>
                    <td className={`px-6 py-4 font-mono ${isUp ? 'stock-up' : 'stock-down'}`}>
                      {s.pct}%
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStock(s.code);
                        }}
                        className="text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
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
          <div className="p-12 text-center text-gray-500">
            暂无自选股，请在上方输入代码添加
          </div>
        )}
      </div>
    </div>
  );
};
