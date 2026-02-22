// PowerButton - 금환일식(Annular Eclipse) 스타일 전원 버튼
// 켜진 상태: 용광로 일렁거림 (빈 공간 없이, opacity 기반)
// 시작 중: 밝은 테두리 회전 빛
// 성공 시: 테두리 빛이 페이지로 퍼져나감

import { useState, useEffect } from 'react';
import type { GatewayStatus } from '../../types/config';

interface PowerButtonProps {
  status: GatewayStatus;
  onClick: () => void;
  loading: boolean;
}

export default function PowerButton({ status, onClick, loading }: PowerButtonProps) {
  const isRunning = status === 'running';
  const isStarting = status === 'starting' || (loading && status !== 'running');
  
  // 성공 애니메이션 상태
  const [showSuccessRipple, setShowSuccessRipple] = useState(false);
  const [prevStatus, setPrevStatus] = useState<GatewayStatus>(status);

  // 상태가 starting → running으로 바뀌면 성공 애니메이션
  useEffect(() => {
    if (prevStatus === 'starting' && status === 'running') {
      setShowSuccessRipple(true);
      setTimeout(() => setShowSuccessRipple(false), 1000);
    }
    setPrevStatus(status);
  }, [status, prevStatus]);

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`
        relative w-44 h-44 rounded-full transition-all duration-500
        flex items-center justify-center
        ${loading ? 'cursor-wait' : 'cursor-pointer hover:scale-[1.03]'}
      `}
    >
      {/* ===== 성공 시 퍼져나가는 빛 ===== */}
      {showSuccessRipple && (
        <>
          <div className="absolute inset-0 rounded-full animate-success-ripple-1"
            style={{
              border: '3px solid rgba(232, 107, 42, 0.9)',
              boxShadow: '0 0 30px rgba(232, 107, 42, 0.6), 0 0 60px rgba(232, 107, 42, 0.3)',
            }}
          />
          <div className="absolute inset-0 rounded-full animate-success-ripple-2"
            style={{
              border: '2px solid rgba(245, 166, 35, 0.7)',
              boxShadow: '0 0 20px rgba(245, 166, 35, 0.5)',
            }}
          />
        </>
      )}

      {/* ===== 시작 중: 금환일식 스타일 회전 빛 (더 밝게) ===== */}
      {isStarting && (
        <div className="absolute inset-0 rounded-full">
          {/* 고정된 테두리 */}
          <div className="absolute inset-0 rounded-full border-2 border-forge-amber/50" />
          
          {/* 외곽 글로우 */}
          <div 
            className="absolute -inset-2 rounded-full animate-pulse-glow"
            style={{
              boxShadow: '0 0 40px 10px rgba(245, 166, 35, 0.3), 0 0 80px 20px rgba(245, 166, 35, 0.15)',
            }}
          />
          
          {/* 회전하는 밝은 빛 (더 두껍고 밝게) */}
          <div className="absolute inset-0 animate-eclipse-rotate">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <defs>
                {/* 더 밝은 그라데이션 */}
                <linearGradient id="eclipseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
                  <stop offset="10%" stopColor="rgba(255, 220, 150, 0.4)" />
                  <stop offset="30%" stopColor="rgba(255, 200, 100, 0.8)" />
                  <stop offset="50%" stopColor="rgba(255, 255, 255, 1)" />
                  <stop offset="70%" stopColor="rgba(255, 200, 100, 0.8)" />
                  <stop offset="90%" stopColor="rgba(255, 220, 150, 0.4)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
                </linearGradient>
                {/* 강화된 글로우 필터 */}
                <filter id="eclipseGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="3" result="blur1" />
                  <feGaussianBlur stdDeviation="6" result="blur2" />
                  <feGaussianBlur stdDeviation="10" result="blur3" />
                  <feMerge>
                    <feMergeNode in="blur3" />
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* 메인 arc - 더 두껍게 (strokeWidth 6) */}
              <circle
                cx="100"
                cy="100"
                r="86"
                fill="none"
                stroke="url(#eclipseGrad)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="90 488"
                filter="url(#eclipseGlow)"
              />
            </svg>
          </div>
          
          {/* 잔광 */}
          <div className="absolute inset-0 animate-eclipse-trail">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <defs>
                <linearGradient id="trailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255, 200, 100, 0)" />
                  <stop offset="50%" stopColor="rgba(255, 200, 100, 0.5)" />
                  <stop offset="100%" stopColor="rgba(255, 200, 100, 0)" />
                </linearGradient>
              </defs>
              <circle
                cx="100"
                cy="100"
                r="86"
                fill="none"
                stroke="url(#trailGrad)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="60 520"
              />
            </svg>
          </div>
        </div>
      )}

      {/* ===== 버튼 본체 ===== */}
      <div className={`
        absolute inset-0 rounded-full transition-all duration-500
        ${isRunning 
          ? 'bg-gradient-to-t from-[#1a0f0a] via-forge-dark to-forge-dark' 
          : 'bg-forge-dark'}
      `} />

      {/* ===== 켜진 상태: 용광로 일렁거림 (opacity 기반, 빈 공간 없음) ===== */}
      {isRunning && (
        <div className="absolute inset-0 rounded-full overflow-hidden">
          {/* 베이스 레이어 (항상 표시, 빈 공간 방지) */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-3/4"
            style={{
              background: 'linear-gradient(to top, rgba(232, 107, 42, 0.6) 0%, rgba(232, 107, 42, 0.3) 50%, transparent 100%)',
            }}
          />
          
          {/* 일렁거리는 레이어 1 - opacity 기반 */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-2/3 animate-forge-flicker-1"
            style={{
              background: 'radial-gradient(ellipse at 50% 100%, rgba(232, 107, 42, 0.8) 0%, rgba(232, 107, 42, 0.4) 40%, transparent 70%)',
            }}
          />
          
          {/* 일렁거리는 레이어 2 - 다른 타이밍 */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-1/2 animate-forge-flicker-2"
            style={{
              background: 'radial-gradient(ellipse at 50% 100%, rgba(245, 166, 35, 0.7) 0%, rgba(245, 166, 35, 0.3) 50%, transparent 80%)',
            }}
          />
          
          {/* 밝은 하이라이트 레이어 */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-1/3 animate-forge-flicker-3"
            style={{
              background: 'radial-gradient(ellipse at 50% 100%, rgba(255, 220, 150, 0.6) 0%, transparent 60%)',
            }}
          />
          
          {/* 불꽃 파티클 효과 */}
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-1/2 h-1/4">
            <div className="absolute w-2 h-2 bg-orange-400/60 rounded-full animate-spark-1" style={{ left: '20%' }} />
            <div className="absolute w-1.5 h-1.5 bg-yellow-400/50 rounded-full animate-spark-2" style={{ left: '50%' }} />
            <div className="absolute w-1 h-1 bg-orange-300/40 rounded-full animate-spark-3" style={{ left: '80%' }} />
          </div>
        </div>
      )}

      {/* ===== 고정 테두리 (항상 버튼 크기와 동일) ===== */}
      <div className={`
        absolute inset-0 rounded-full border-2 transition-all duration-500
        ${isRunning 
          ? 'border-forge-copper/80' 
          : isStarting 
            ? 'border-transparent' 
            : 'border-white/20'}
      `} />

      {/* ===== 아이콘 / 로고 ===== */}
      <div className="relative z-10 flex flex-col items-center">
        <img 
          src="/app-icon.png" 
          alt="moldClaw" 
          className={`
            w-20 h-20 object-contain transition-all duration-500
            ${isRunning ? 'opacity-100' : 'opacity-60'}
          `}
          style={{
            filter: isRunning 
              ? 'drop-shadow(0 0 25px rgba(232, 107, 42, 0.7))' 
              : 'none',
          }}
        />
        
        {/* 상태 텍스트 */}
        <span className={`
          mt-2 text-xs font-medium transition-colors duration-500
          ${isRunning 
            ? 'text-forge-copper' 
            : isStarting 
              ? 'text-forge-amber' 
              : 'text-forge-muted'}
        `}>
          {isStarting ? '시작 중...' : isRunning ? 'ON' : 'OFF'}
        </span>
      </div>

      {/* ===== 애니메이션 정의 ===== */}
      <style>{`
        @keyframes eclipse-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        
        /* 용광로 일렁거림 - opacity 기반 (빈 공간 없음) */
        @keyframes forge-flicker-1 {
          0%, 100% { opacity: 0.7; filter: brightness(1); }
          25% { opacity: 0.9; filter: brightness(1.1); }
          50% { opacity: 0.75; filter: brightness(0.95); }
          75% { opacity: 0.95; filter: brightness(1.15); }
        }
        
        @keyframes forge-flicker-2 {
          0%, 100% { opacity: 0.6; filter: brightness(1); }
          33% { opacity: 0.85; filter: brightness(1.2); }
          66% { opacity: 0.7; filter: brightness(1.05); }
        }
        
        @keyframes forge-flicker-3 {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.9; }
        }
        
        /* 불꽃 파티클 */
        @keyframes spark-rise-1 {
          0% { transform: translateY(0) scale(1); opacity: 0.6; }
          100% { transform: translateY(-30px) scale(0.3); opacity: 0; }
        }
        
        @keyframes spark-rise-2 {
          0% { transform: translateY(0) scale(1); opacity: 0.5; }
          100% { transform: translateY(-25px) scale(0.2); opacity: 0; }
        }
        
        @keyframes spark-rise-3 {
          0% { transform: translateY(0) scale(1); opacity: 0.4; }
          100% { transform: translateY(-20px) scale(0.1); opacity: 0; }
        }
        
        @keyframes success-ripple {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        
        .animate-eclipse-rotate {
          animation: eclipse-rotate 1.8s linear infinite;
        }
        
        .animate-eclipse-trail {
          animation: eclipse-rotate 1.8s linear infinite;
          animation-delay: -0.2s;
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 1.5s ease-in-out infinite;
        }
        
        .animate-forge-flicker-1 {
          animation: forge-flicker-1 1.8s ease-in-out infinite;
        }
        
        .animate-forge-flicker-2 {
          animation: forge-flicker-2 1.5s ease-in-out infinite;
          animation-delay: 0.3s;
        }
        
        .animate-forge-flicker-3 {
          animation: forge-flicker-3 1.2s ease-in-out infinite;
          animation-delay: 0.6s;
        }
        
        .animate-spark-1 {
          animation: spark-rise-1 1.5s ease-out infinite;
        }
        
        .animate-spark-2 {
          animation: spark-rise-2 1.8s ease-out infinite;
          animation-delay: 0.5s;
        }
        
        .animate-spark-3 {
          animation: spark-rise-3 2s ease-out infinite;
          animation-delay: 1s;
        }
        
        .animate-success-ripple-1 {
          animation: success-ripple 1s ease-out forwards;
        }
        
        .animate-success-ripple-2 {
          animation: success-ripple 1s ease-out forwards;
          animation-delay: 0.15s;
        }
      `}</style>
    </button>
  );
}
