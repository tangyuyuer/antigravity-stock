'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, Percent, Wallet, Tag } from 'lucide-react';

export const PositionCalculator: React.FC = () => {
  const [totalCapital, setTotalCapital] = useState<string>('100000');
  const [positionPercent, setPositionPercent] = useState<string>('25');
  const [buyPrice, setBuyPrice] = useState<string>('');
  const [result, setResult] = useState<{ shares: number; hands: number; totalCost: number } | null>(null);

  useEffect(() => {
    const total = parseFloat(totalCapital);
    const percent = parseFloat(positionPercent);
    const price = parseFloat(buyPrice);

    if (total > 0 && percent > 0 && price > 0) {
      const budget = total * (percent / 100);
      const exactShares = budget / price;
      // A-shares must be multiples of 100 (1 hand)
      const hands = Math.floor(exactShares / 100);
      const finalShares = hands * 100;
      const finalCost = finalShares * price;

      setResult({
        shares: finalShares,
        hands: hands,
        totalCost: finalCost
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
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-lg font-mono text-white focus:border-blue-500 outline-none transition-all"
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
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-lg font-mono text-white focus:border-blue-500 outline-none transition-all"
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
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-lg font-mono text-white focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Result Display */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white/2 rounded-2xl border border-white/5">
        <div className="flex flex-col items-center justify-center p-4">
          <span className="text-gray-500 text-xs font-bold uppercase mb-1">建议买入</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-blue-500">
              {result ? result.shares.toLocaleString() : '0'}
            </span>
            <span className="text-gray-400 font-bold text-sm">股</span>
          </div>
          <span className="text-gray-600 text-xs mt-1">({result ? result.hands : 0} 手)</span>
        </div>

        <div className="flex flex-col items-center justify-center p-4 border-l border-white/5">
          <span className="text-gray-500 text-xs font-bold uppercase mb-1">实际成交额</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-200">
              {result ? result.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
            </span>
            <span className="text-gray-500 font-bold text-sm">元</span>
          </div>
          <span className="text-gray-600 text-xs mt-1">占总仓位 {(result ? (result.totalCost / parseFloat(totalCapital) * 100).toFixed(2) : 0)}%</span>
        </div>
      </div>
    </div>
  );
};
