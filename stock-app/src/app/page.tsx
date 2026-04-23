'use client';

import { useState } from 'react';
import { IndexHeader } from '@/components/IndexHeader';
import { MarketSentiment } from '@/components/MarketSentiment';
import { Watchlist } from '@/components/Watchlist';
import { StockChart } from '@/components/StockChart';
import { PositionCalculator } from '@/components/PositionCalculator';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LayoutDashboard, Calculator } from 'lucide-react';

export default function Home() {
  const [selectedStock, setSelectedStock] = useState<{ code: string; name: string } | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);

  return (
    <main className="min-h-screen p-3 md:p-4 bg-[#0a0b0d] text-gray-200">
      <div className="max-w-[1600px] mx-auto space-y-4">
        {/* Header section */}
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-xl shadow-lg shadow-blue-600/20">
              <LayoutDashboard size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tighter text-white">A股实时监控</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Calculator Button */}
            <button 
              onClick={() => setShowCalculator(true)}
              className="flex items-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 px-3 py-1.5 rounded-xl border border-blue-500/30 text-blue-500 transition-all active:scale-95 group"
            >
              <Calculator size={16} className="group-hover:rotate-12 transition-transform" />
              <span className="text-xs font-bold">仓位计算</span>
            </button>

            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
            </div>
          </div>
        </div>

        {/* Top Indices Dashboard */}
        <IndexHeader />

        {/* Market Sentiment (Thermometer) */}
        <MarketSentiment />

        {/* Full Width Watchlist Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <Watchlist onSelect={(stock: { code: string; name: string }) => setSelectedStock(stock)} />
        </motion.div>
      </div>

      {/* Calculator Modal */}
      <AnimatePresence>
        {showCalculator && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCalculator(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl"
            >
               {/* Modal Close Button */}
               <button 
                onClick={() => setShowCalculator(false)}
                className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors"
              >
                <X size={32} />
              </button>
              <PositionCalculator />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chart Modal (Popup) */}
      <AnimatePresence>
        {selectedStock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStock(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-[#1a1b1e] rounded-3xl shadow-2xl border border-white/10 overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedStock.name}</h3>
                  <p className="text-gray-500 font-mono text-sm uppercase tracking-widest">{selectedStock.code}</p>
                </div>
                <button 
                  onClick={() => setSelectedStock(null)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6">
                <StockChart symbol={selectedStock.code} name={selectedStock.name} />
              </div>
              
              <div className="px-6 py-4 bg-black/20 flex justify-end gap-3">
                 <button 
                  onClick={() => setSelectedStock(null)}
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-all"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Site Footer */}
      <footer className="py-10 text-center opacity-30">
        <p className="text-[10px] uppercase tracking-[0.3em]">
          Powered by Antigravity AI • Professional Trading View
        </p>
      </footer>
    </main>
  );
}
