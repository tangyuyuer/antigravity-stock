'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, TrendingUp, Users, Info, FileText, Calendar, Activity } from 'lucide-react';

interface STRiskData {
  code: string;
  name: string;
  audit_opinion: string;
  net_profit: string;
  performance_info: string;
  st_reason: string;
  st_date: string;
  shareholder_count: number;
  bankruptcy_info: string;
  updated_at: string;
}

interface STRiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: STRiskData | null;
  announcement: { title: string; url: string } | null;
}

export const STRiskModal: React.FC<STRiskModalProps> = ({ isOpen, onClose, data, announcement }) => {
  if (!data && !announcement) return null;

  // 根据审计意见判断风险等级颜色
  const getOpinionColor = (opinion: string) => {
    if (opinion.includes('无法表示意见') || opinion.includes('否定意见')) return 'text-red-500 bg-red-500/10 border-red-500/30';
    if (opinion.includes('保留意见')) return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
    if (opinion.includes('标准无保留')) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-[#111214] rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-red-600/10 to-transparent">
              <div className="flex items-center gap-4">
                <div className="bg-red-500/20 p-2.5 rounded-2xl border border-red-500/30">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">{data?.name || '风险透视'}</h2>
                  <p className="text-gray-500 font-mono text-xs uppercase tracking-[0.2em]">{data?.code}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-6">
              {/* 核心风险模块 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3 opacity-50">
                    <Info size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">审计意见类型</span>
                  </div>
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-black border ${getOpinionColor(data?.audit_opinion || '')}`}>
                    {data?.audit_opinion || '暂无数据'}
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3 opacity-50">
                    <TrendingUp size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">最新净利润</span>
                  </div>
                  <div className="text-xl font-black text-white font-sans">
                    {data?.net_profit || '--'}
                  </div>
                </div>
              </div>

              {/* ST 原因 & 时间 */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-orange-500/10 rounded-xl">
                    <Calendar size={18} className="text-orange-500" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">戴帽时间 (ST日期)</span>
                    <p className="text-white font-mono">{data?.st_date || '未知'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <FileText size={18} className="text-blue-500" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">被 ST 核心原因</span>
                    <p className="text-sm text-gray-300 leading-relaxed">{data?.st_reason || '请查阅详细公告'}</p>
                  </div>
                </div>
              </div>

              {/* 其它指标 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                   <Users size={18} className="text-purple-500" />
                   <div>
                     <span className="text-[9px] font-bold text-gray-500 block">最新股东人数</span>
                     <span className="text-sm font-bold text-white font-sans">{data?.shareholder_count?.toLocaleString() || 0}</span>
                   </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                   <Activity size={18} className="text-emerald-500" />
                   <div>
                     <span className="text-[9px] font-bold text-gray-500 block">破产重整状态</span>
                     <span className="text-sm font-bold text-white">{data?.bankruptcy_info?.includes('重整') ? '有重整动向' : '未查到重整'}</span>
                   </div>
                </div>
              </div>

              {/* 最新公告预览 */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] px-1">最新公告与重整详情</span>
                <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4">
                   <p className="text-gray-400 text-xs mb-3 leading-relaxed">
                     {data?.bankruptcy_info || '暂无详细重整描述'}
                   </p>
                   {announcement && (
                     <a 
                       href={announcement.url} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="flex items-center justify-between group bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-all"
                     >
                       <span className="text-xs font-bold text-white truncate max-w-[80%]">{announcement.title}</span>
                       <div className="text-blue-500 group-hover:translate-x-1 transition-transform">
                         <Info size={16} />
                       </div>
                     </a>
                   )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/[0.02] border-t border-white/5 text-center">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">
                数据最近同步: {data?.updated_at ? new Date(data.updated_at).toLocaleString() : '--'}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
