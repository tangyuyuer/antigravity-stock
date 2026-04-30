'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, GripVertical } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

interface StockQuote {
  code: string;
  name: string;
  price: string;
  change: string;
  pct: string;
  volume: string;
  prevClose: string;
  turnover?: string;
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

  useEffect(() => {
    const fetchCloudData = async () => {
      try {
        const { data: watchData } = await supabase.from('watchlist').select('symbol');
        if (watchData && watchData.length > 0) {
          setCodes(watchData.map(d => d.symbol));
        } else {
          setCodes(['sh600000', 'sz000001']);
        }

        const { data: posData } = await supabase.from('positions').select('*');
        if (posData) {
          const newPositions: Record<string, Position> = {};
          posData.forEach(row => {
            newPositions[row.symbol] = {
              code: row.symbol,
              cost: row.buyPrice ? row.buyPrice.toString() : '',
              amount: row.quantity ? row.quantity.toString() : ''
            };
          });
          setPositions(newPositions);
        }
      } catch (e) {
        console.error('Error fetching cloud data', e);
        setCodes(['sh600000', 'sz000001']);
      }
    };
    
    fetchCloudData();

    const savedReadAnn = localStorage.getItem('read_announcements');
    if (savedReadAnn) setReadAnnouncements(JSON.parse(savedReadAnn));
  }, []);

  useEffect(() => {
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
      const res = await fetch(`/api/stock/quote?codes=${codes.join(',')}&t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) {
          // Sort results based on the order in 'codes'
          const sorted = [...json].sort((a, b) => codes.indexOf(a.code) - codes.indexOf(b.code));
          setQuotes(sorted);
        }
      }
    } catch (e) {
      console.error('Failed to fetch quotes', e);
    }
  };

  const fetchAnnouncements = async () => {
    if (codes.length === 0) return;
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

  useEffect(() => {
    const timer = setInterval(fetchAnnouncements, 1000 * 60 * 30);
    return () => clearInterval(timer);
  }, [codes]);

  const markAnnAsRead = (annId: string) => {
    if (!readAnnouncements.includes(annId)) {
      setReadAnnouncements([...readAnnouncements, annId]);
    }
  };

  const updatePosition = async (code: string, field: 'cost' | 'amount', value: string) => {
    setPositions(prev => {
      const current = prev[code] || { code, cost: '', amount: '' };
      const next = { ...current, [field]: value };
      return { ...prev, [code]: next };
    });

    const quote = quotes.find(q => q.code === code);
    const name = quote?.name || '';
    const type = code.startsWith('sh') ? 'sh' : (code.startsWith('sz') ? 'sz' : 'us');

    const currentPos = positions[code] || { cost: '', amount: '' };
    const finalCost = field === 'cost' ? value : currentPos.cost;
    const finalAmount = field === 'amount' ? value : currentPos.amount;

    try {
      await supabase.from('positions').delete().match({ symbol: code });
      if (finalCost || finalAmount) {
         await supabase.from('positions').insert({
           symbol: code,
           name: name,
           buyPrice: finalCost ? parseFloat(finalCost) : null,
           quantity: finalAmount ? parseInt(finalAmount, 10) : null,
           type: type
         });
      }
    } catch(e) {
      console.error('Error syncing position', e);
    }
  };

  const addStock = async () => {
    if (!inputValue) return;
    let code = inputValue.toLowerCase();
    if (!code.startsWith('sh') && !code.startsWith('sz')) {
      code = (code.startsWith('6') ? 'sh' : 'sz') + code;
    }
    if (!codes.includes(code)) {
      setCodes(prev => [...prev, code]);
      try {
         await supabase.from('watchlist').insert({ symbol: code });
      } catch(e) {
         console.error('Error adding to watchlist', e);
      }
    }
    setInputValue('');
  };

  const removeStock = async (code: string) => {
    setCodes(prev => prev.filter(c => c !== code));
    setPositions(prev => {
      const newPositions = { ...prev };
      delete newPositions[code];
      return newPositions;
    });

    try {
      await supabase.from('watchlist').delete().match({ symbol: code });
      await supabase.from('positions').delete().match({ symbol: code });
    } catch(e) {
      console.error('Error removing stock', e);
    }
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

  const todayProfit = quotes.reduce((acc, s) => {
    const pos = positions[s.code];
    if (pos && pos.amount && s.prevClose) {
      return acc + (parseFloat(s.price) - parseFloat(s.prevClose)) * parseFloat(pos.amount);
    }
    return acc;
  }, 0);


  const handleReorder = (newCodes: string[]) => {
    setCodes(newCodes);
  };

  return (
    <div className="space-y-4">
      {/* Total Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Today's P/L Card */}
        <div className="glass p-4 rounded-2xl border border-white/5 bg-gradient-to-br from-emerald-600/10 to-transparent">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">当日实时盈亏 (元)</span>
            <div className={`p-1 rounded-lg ${todayProfit >= 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
               {todayProfit >= 0 ? <TrendingUp size={14} className="text-red-500" /> : <TrendingDown size={14} className="text-emerald-500" />}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black font-sans ${todayProfit >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {todayProfit >= 0 ? '+' : ''}{todayProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/5 bg-gradient-to-br from-blue-600/10 to-transparent">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">持仓累计盈亏 (元)</span>
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

        {/* Watchlist Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-gray-500 border-b border-white/5 bg-white/[0.02] uppercase tracking-wider text-[10px] font-bold items-center">
          <div className="col-span-1"></div> {/* Drag handle placeholder */}
          <div className="col-span-2">股票名称</div>
          <div className="col-span-1">当前价格</div>
          <div className="col-span-1">当日涨幅</div>
          <div className="col-span-2">持仓/成本</div>
          <div className="col-span-2">实时盈亏 (当日/累计)</div>
          <div className="col-span-2">最新公告</div>
          <div className="col-span-1 text-right">管理</div>
        </div>

        <Reorder.Group axis="y" values={codes} onReorder={handleReorder} className="divide-y divide-white/[0.02]">
          {codes.map((code) => {
            const s = quotes.find(q => q.code === code);
            if (!s) return null;

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
              <Reorder.Item
                key={s.code}
                value={s.code}
                className="hover:bg-white/[0.03] transition-colors cursor-pointer group px-6 py-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
                onClick={() => onSelect({ code: s.code, name: s.name })}
              >
                <div className="col-span-1 flex items-center gap-2">
                  <div className="text-gray-700 group-hover:text-gray-500 cursor-grab active:cursor-grabbing">
                    <GripVertical size={18} />
                  </div>
                </div>

                <div className="col-span-2 flex flex-col">
                  <span className={`text-base font-black tracking-tight ${isUp ? 'text-red-500' : 'text-emerald-500'}`}>{s.name}</span>
                  <span className="text-[10px] text-gray-500 font-sans tracking-tight uppercase">{s.code}</span>
                </div>

                <div className={`col-span-1 text-lg font-sans font-black ${isUp ? 'stock-up' : 'stock-down'}`}>
                  {s.price}
                </div>

                <div className={`col-span-1 text-base font-sans font-bold ${isUp ? 'stock-up' : 'stock-down'}`}>
                  {isUp ? '+' : ''}{s.pct}%
                </div>

                <div className="col-span-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col gap-1">
                    <input
                      type="number"
                      placeholder="成本价"
                      value={pos.cost}
                      onChange={(e) => updatePosition(s.code, 'cost', e.target.value)}
                      className="bg-black/20 border border-white/10 rounded px-2 py-0.5 text-[10px] w-20 font-sans focus:border-blue-500/50 outline-none transition-all"
                    />
                    <input
                      type="number"
                      placeholder="持仓量"
                      value={pos.amount}
                      onChange={(e) => updatePosition(s.code, 'amount', e.target.value)}
                      className="bg-black/20 border border-white/10 rounded px-2 py-0.5 text-[10px] w-20 font-sans focus:border-blue-500/50 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  {profit !== 0 ? (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 font-bold">当日</span>
                        <span className={`text-sm font-bold font-sans ${parseFloat(s.change) >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {(parseFloat(s.price) - parseFloat(s.prevClose)) * amount >= 0 ? '+' : ''}
                          {((parseFloat(s.price) - parseFloat(s.prevClose)) * amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 font-bold">累计</span>
                        <span className={`text-base font-black font-sans ${profit >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {profit >= 0 ? '+' : ''}{profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className={`text-[10px] font-bold font-sans ${profit >= 0 ? 'text-red-500/80' : 'text-emerald-500/80'}`}>
                          ({profit >= 0 ? '+' : ''}{profitPct.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-700 font-bold text-[10px] uppercase">未持仓</span>
                  )}
                </div>

                <div className="col-span-2">
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
                </div>

                <div className="col-span-1 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStock(s.code);
                    }}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-1.5 rounded-lg transition-all active:scale-90"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>

        {codes.length === 0 && (
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

