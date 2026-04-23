'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, Percent, Wallet, Tag } from 'lucide-react';

export const PositionCalculator: React.FC = () => {
  const [totalCapital, setTotalCapital] = useState<string>('100000');
  const [positionPercent, setPositionPercent] = useState<string>('25');
  const [buyPrice, setBuyPrice] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [result, setResult] = useState<{ 
    shares: number; 
    hands: number; 
    totalCost: number;
    isCeil: boolean;
    otherShares: number;
    otherHands: number;
    otherCost: number;
    otherPct: number;
  } | null>(null);

  // Load from localStorage
  useEffect(() => {
    const savedTotal = localStorage.getItem('calc_total_capital');
    const savedPercent = localStorage.getItem('calc_position_percent');
    if (savedTotal) setTotalCapital(savedTotal);
    if (savedPercent) setPositionPercent(savedPercent);
    setIsLoaded(true);
  }, []);

  // Save to localStorage - only after initial load to avoid overwriting with defaults
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('calc_total_capital', totalCapital);
      localStorage.setItem('calc_position_percent', positionPercent);
    }
  }, [totalCapital, positionPercent, isLoaded]);

  useEffect(() => {
    const total = parseFloat(totalCapital);
    const percent = parseFloat(positionPercent);
    const price = parseFloat(buyPrice);

    if (total > 0 && percent > 0 && price > 0) {
      const budget = total * (percent / 100);
      const exactShares = budget / price;
      
      const handsFloor = Math.floor(exactShares / 100);
      const handsCeil = Math.ceil(exactShares / 100);
      
      const sharesFloor = handsFloor * 100;
      const sharesCeil = handsCeil * 100;
      
      const costFloor = sharesFloor * price;
      const costCeil = sharesCeil * price;
      
      const pctFloor = (costFloor / total) * 100;
      const pctCeil = (costCeil / total) * 100;
      
      const diffFloor = Math.abs(pctFloor - percent);
      const diffCeil = Math.abs(pctCeil - percent);
      
      // Determine which is closer to target percent
      const isCeilBetter = handsFloor === 0 ? true : diffCeil < diffFloor;

      setResult({
        shares: isCeilBetter ? sharesCeil : sharesFloor,
        hands: isCeilBetter ? handsCeil : handsFloor,
        totalCost: isCeilBetter ? costCeil : costFloor,
        isCeil: isCeilBetter,
        otherShares: isCeilBetter ? sharesFloor : sharesCeil,
        otherHands: isCeilBetter ? handsFloor : handsCeil,
        otherCost: isCeilBetter ? costFloor : costCeil,
        otherPct: isCeilBetter ? pctFloor : pctCeil
      });
    } else {
      setResult(null);
    }
  }, [totalCapital, positionPercent, buyPrice]);

  return (
    <div className="glass rounded-2xl p-6 shadow-2xl border border-white/5 bg-gradient-to-br from-white/5 to-transparent">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-emerald-500/20 p-2 rounded-lg">
          <Calculator size={20} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">仓位计算器</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Input: Total Capital */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Wallet size={12} /> 总本金 (元)
          </label>
          <input
            type="number"
            value={totalCapital}
            onChange={(e) => setTotalCapital(e.target.value)}
            placeholder="输入可用资金"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-lg font-sans font-bold text-white focus:border-blue-500 outline-none transition-all"
          />
        </div>

        {/* Input: Position Percentage */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Percent size={12} /> 预设仓位 (%)
          </label>
          <input
            type="number"
            value={positionPercent}
            onChange={(e) => setPositionPercent(e.target.value)}
            placeholder="例如 25"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-lg font-sans font-bold text-white focus:border-blue-500 outline-none transition-all"
          />
        </div>

        {/* Input: Buy Price */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Tag size={12} /> 买入单价 (元)
          </label>
          <input
            type="number"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            placeholder="输入股票价格"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-lg font-sans font-bold text-white focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Result Display */}
      <div className="mt-8 flex flex-col gap-4">
        {/* Recommended Result */}
        <div className="p-6 bg-blue-600/10 rounded-2xl border border-blue-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest shadow-lg">
            推荐方案 (最接近预设)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col items-center md:items-start justify-center">
              <span className="text-blue-400 text-xs font-bold uppercase mb-1 tracking-wider">建议买入股数</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-white font-sans drop-shadow-sm">
                  {result ? result.shares.toLocaleString() : '0'}
                </span>
                <span className="text-gray-400 font-bold text-sm">股</span>
              </div>
              <span className="text-blue-500/60 text-sm mt-1 font-bold">
                ({result ? result.hands : 0} 手) {result?.isCeil ? '• 向上取整' : '• 向下取整'}
              </span>
            </div>

            <div className="flex flex-col items-center md:items-end justify-center md:border-l border-white/5">
              <span className="text-gray-500 text-xs font-bold uppercase mb-1 tracking-wider">预计成交额 / 实际仓位</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-200 font-sans">
                  {result ? result.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                </span>
                <span className="text-gray-500 font-bold text-sm">元</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-1.5 w-24 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500" 
                    style={{ width: `${result ? (result.totalCost / parseFloat(totalCapital) * 100) : 0}%` }}
                  />
                </div>
                <span className="text-blue-500 font-black text-sm">
                  {(result ? (result.totalCost / parseFloat(totalCapital) * 100).toFixed(2) : 0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Alternative Result */}
        {result && result.otherShares > 0 && result.otherShares !== result.shares && (
          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 flex justify-between items-center opacity-60 hover:opacity-100 transition-all">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">备选方案 ({result.isCeil ? '少买' : '多买'})</span>
              <span className="text-lg font-bold text-gray-300">{result.otherShares.toLocaleString()} 股 ({result.otherHands} 手)</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">实际仓位</span>
              <div className="text-lg font-bold text-gray-400">{result.otherPct.toFixed(2)}%</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
