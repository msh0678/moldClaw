// PowerButton - 금환일식(Annular Eclipse) 스타일 전원 버튼
// 켜진 상태: 용광로 일렁거림 (빈 공간 없이)
// 시작 중: 테두리를 도는 밝은 빛
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
              border: '2px solid rgba(232, 107, 42, 0.8)',
              boxShadow: '0 0 20px rgba(232, 107, 42, 0.5)',
            }}
          />
          <div className="absolute inset-0 rounded-full animate-success-ripple-2"
            style={{
              border: '1px solid rgba(245, 166, 35, 0.6)',
              boxShadow: '0 0 15px rgba(245, 166, 35, 0.4)',
            }}
          />
        </>
      )}

      {/* ===== 시작 중: 금환일식 스타일 회전 빛 ===== */}
      {isStarting && (
        <div className="absolute inset-0 rounded-full">
          {/* 고정된 테두리 (버튼과 함께 유지) */}
          <div className="absolute inset-0 rounded-full border-2 border-forge-amber/40" />
          
          {/* 회전하는 밝은 빛 */}
          <div className="absolute inset-0 animate-eclipse-rotate">
            <svg viewBox="0 0 200 200" className="w-full h-full" style={{ filter: 'url(#eclipseGlow)' }}>
              <defs>
                {/* 금환일식 그라데이션 - 중앙 밝고 양쪽 어두움 */}
                <linearGradient id="eclipseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
                  <stop offset="15%" stopColor="rgba(255, 220, 150, 0.3)" />
                  <stop offset="35%" stopColor="rgba(255, 200, 100, 0.7)" />
                  <stop offset="50%" stopColor="rgba(255, 255, 255, 1)" />
                  <stop offset="65%" stopColor="rgba(255, 200, 100, 0.7)" />
                  <stop offset="85%" stopColor="rgba(255, 220, 150, 0.3)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
                </linearGradient>
                {/* 글로우 필터 */}
                <filter id="eclipseGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="2" result="blur1" />
                  <feGaussianBlur stdDeviation="4" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* 메인 arc - 약 60도 (더 밝고 선명하게) */}
              <circle
                cx="100"
                cy="100"
                r="86"
                fill="none"
                stroke="url(#eclipseGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="90 488"
              />
            </svg>
          </div>
          
          {/* 잔광 */}
          <div className="absolute inset-0 animate-eclipse-trail">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <defs>
                <linearGradient id="trailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255, 200, 100, 0)" />
                  <stop offset="50%" stopColor="rgba(255, 200, 100, 0.3)" />
                  <stop offset="100%" stopColor="rgba(255, 200, 100, 0)" />
                </linearGradient>
              </defs>
              <circle
                cx="100"
                cy="100"
                r="86"
                fill="none"
                stroke="url(#trailGrad)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="50 530"
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

      {/* ===== 켜진 상태: 용광로 일렁거림 (빈 공간 없이) ===== */}
      {isRunning && (
        <div className="absolute inset-0 rounded-full overflow-hidden">
          {/* 베이스 그라데이션 (빈 공간 방지) */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-2/3"
            style={{
              background: 'linear-gradient(to top, rgba(232, 107, 42, 0.5), rgba(232, 107, 42, 0.2) 60%, transparent)',
            }}
          />
          {/* 일렁거리는 레이어 1 */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-1/2 animate-forge-wave-1"
            style={{
              background: 'linear-gradient(to top, rgba(232, 107, 42, 0.6), transparent)',
              transformOrigin: 'bottom center',
            }}
          />
          {/* 일렁거리는 레이어 2 */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-1/3 animate-forge-wave-2"
            style={{
              background: 'linear-gradient(to top, rgba(245, 166, 35, 0.5), transparent)',
              transformOrigin: 'bottom center',
            }}
          />
          {/* 일렁거리는 레이어 3 (가장 밝음) */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-1/4 animate-forge-wave-3"
            style={{
              background: 'linear-gradient(to top, rgba(255, 200, 100, 0.4), transparent)',
              transformOrigin: 'bottom center',
            }}
          />
        </div>
      )}

      {/* ===== 고정 테두리 (항상 버튼 크기와 동일) ===== */}
      <div className={`
        absolute inset-0 rounded-full border-2 transition-all duration-500
        ${isRunning 
          ? 'border-forge-copper/70' 
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
              ? 'drop-shadow(0 0 20px rgba(232, 107, 42, 0.6))' 
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
        
        @keyframes forge-wave-1 {
          0%, 100% { 
            opacity: 0.7;
            transform: scaleY(1) scaleX(1);
          }
          25% { 
            opacity: 0.9;
            transform: scaleY(1.05) scaleX(0.98);
          }
          50% { 
            opacity: 0.8;
            transform: scaleY(0.95) scaleX(1.02);
          }
          75% { 
            opacity: 1;
            transform: scaleY(1.08) scaleX(0.97);
          }
        }
        
        @keyframes forge-wave-2 {
          0%, 100% { 
            opacity: 0.6;
            transform: scaleY(1) scaleX(1);
          }
          33% { 
            opacity: 0.8;
            transform: scaleY(1.1) scaleX(0.95);
          }
          66% { 
            opacity: 0.7;
            transform: scaleY(0.9) scaleX(1.05);
          }
        }
        
        @keyframes forge-wave-3 {
          0%, 100% { 
            opacity: 0.5;
            transform: scaleY(1);
          }
          50% { 
            opacity: 0.8;
            transform: scaleY(1.15);
          }
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
        
        .animate-forge-wave-1 {
          animation: forge-wave-1 2s ease-in-out infinite;
        }
        
        .animate-forge-wave-2 {
          animation: forge-wave-2 1.8s ease-in-out infinite;
          animation-delay: 0.3s;
        }
        
        .animate-forge-wave-3 {
          animation: forge-wave-3 1.5s ease-in-out infinite;
          animation-delay: 0.6s;
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
