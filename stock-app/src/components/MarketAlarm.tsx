'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const MarketAlarm: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isShowingNotification, setIsShowingNotification] = useState(false);
  const lastTriggeredDate = useRef<string | null>(null);

  // Initialize from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('market-alarm-enabled');
    if (saved === 'true') {
      setIsEnabled(true);
    }
  }, []);

  // Update localStorage when state changes
  useEffect(() => {
    localStorage.setItem('market-alarm-enabled', String(isEnabled));
  }, [isEnabled]);

  useEffect(() => {
    if (!isEnabled) return;

    const checkTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const dateString = now.toDateString();

      // Check for 14:57 and ensure it only triggers once per day
      if (hours === 14 && minutes === 57 && lastTriggeredDate.current !== dateString) {
        triggerAlarm();
        lastTriggeredDate.current = dateString;
      }
    };

    const triggerAlarm = () => {
      // Play sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => {
        console.warn('Audio play blocked or failed. Browser policy may require user interaction.', e);
      });

      // Show visual notification
      setIsShowingNotification(true);
      setTimeout(() => setIsShowingNotification(false), 10000); // Hide after 10 seconds
    };

    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [isEnabled]);

  return (
    <>
      <button
        onClick={() => setIsEnabled(!isEnabled)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all active:scale-95 group relative ${
          isEnabled 
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
            : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/10'
        }`}
        title={isEnabled ? "收盘提醒已开启 (14:57)" : "点击开启收盘提醒 (14:57)"}
      >
        <div className="relative">
          {isEnabled ? (
            <Bell size={16} className="animate-[ring_2s_infinite]" />
          ) : (
            <BellOff size={16} />
          )}
          {isEnabled && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-ping" />
          )}
        </div>
        <span className="text-xs font-bold tracking-tight">
          {isEnabled ? '14:57 提醒' : '收盘提醒'}
        </span>
      </button>

      {/* Pop-up Notification */}
      <AnimatePresence>
        {isShowingNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-amber-500 text-black px-6 py-3 rounded-2xl shadow-2xl shadow-amber-500/20 flex items-center gap-3 font-bold"
          >
            <Bell size={20} className="animate-bounce" />
            <span>尾盘时间到！当前 14:57，请注意操作。</span>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes ring {
          0% { transform: rotate(0); }
          5% { transform: rotate(10deg); }
          10% { transform: rotate(-10deg); }
          15% { transform: rotate(10deg); }
          20% { transform: rotate(-10deg); }
          25% { transform: rotate(0); }
          100% { transform: rotate(0); }
        }
      `}</style>
    </>
  );
};
