// PowerButton - 용광로 효과 전원 버튼
// Primary 색상 빛이 아래부터 일렁거림 (켜진 상태)
// 일식 스타일 테두리 빛 (시작 중) - 바깥쪽으로만 잔광

import type { GatewayStatus } from '../../types/config';

interface PowerButtonProps {
  status: GatewayStatus;
  onClick: () => void;
  loading: boolean;
}

export default function PowerButton({ status, onClick, loading }: PowerButtonProps) {
  const isRunning = status === 'running';
  const isStarting = status === 'starting' || (loading && status !== 'running');

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
      {/* ===== 일식 효과 (시작 중) - 바깥쪽 잔광만 ===== */}
      {isStarting && (
        <>
          {/* 바깥쪽 글로우 레이어 (버튼보다 큼) */}
          <div className="absolute -inset-4 rounded-full pointer-events-none">
            {/* 메인 코로나 빛 - Solar Eclipse 스타일 (짧고, 앞뒤 얇음) */}
            <div className="absolute inset-0 animate-corona-spin">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <defs>
                  {/* 메인 코로나 그라데이션 - 중앙 밝고 양쪽 얇게 */}
                  <linearGradient id="coronaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(245, 166, 35, 0)" />
                    <stop offset="20%" stopColor="rgba(245, 166, 35, 0.2)" />
                    <stop offset="50%" stopColor="rgba(255, 220, 150, 1)" />
                    <stop offset="80%" stopColor="rgba(245, 166, 35, 0.2)" />
                    <stop offset="100%" stopColor="rgba(245, 166, 35, 0)" />
                  </linearGradient>
                  {/* 글로우 필터 */}
                  <filter id="coronaGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* 메인 arc - 약 50도 길이 (짧게) */}
                <circle
                  cx="100"
                  cy="100"
                  r="92"
                  fill="none"
                  stroke="url(#coronaGrad)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="85 495"
                  filter="url(#coronaGlow)"
                />
              </svg>
            </div>

            {/* 잔광 1 - 바로 뒤따라오는 희미한 빛 */}
            <div className="absolute inset-0 animate-corona-trail1">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <defs>
                  <linearGradient id="trailGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(245, 166, 35, 0)" />
                    <stop offset="50%" stopColor="rgba(245, 166, 35, 0.3)" />
                    <stop offset="100%" stopColor="rgba(245, 166, 35, 0)" />
                  </linearGradient>
                </defs>
                <circle
                  cx="100"
                  cy="100"
                  r="92"
                  fill="none"
                  stroke="url(#trailGrad1)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="60 520"
                />
              </svg>
            </div>

            {/* 잔광 2 - 더 희미한 꼬리 */}
            <div className="absolute inset-0 animate-corona-trail2">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <defs>
                  <linearGradient id="trailGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(245, 166, 35, 0)" />
                    <stop offset="50%" stopColor="rgba(245, 166, 35, 0.15)" />
                    <stop offset="100%" stopColor="rgba(245, 166, 35, 0)" />
                  </linearGradient>
                </defs>
                <circle
                  cx="100"
                  cy="100"
                  r="92"
                  fill="none"
                  stroke="url(#trailGrad2)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray="40 540"
                />
              </svg>
            </div>

            {/* 외곽 희미한 글로우 */}
            <div className="absolute inset-2 rounded-full animate-pulse-slow"
              style={{
                boxShadow: '0 0 30px 5px rgba(245, 166, 35, 0.15), 0 0 60px 10px rgba(245, 166, 35, 0.08)',
              }}
            />
          </div>
        </>
      )}

      {/* ===== 버튼 본체 ===== */}
      {/* 배경 */}
      <div className={`
        absolute inset-0 rounded-full transition-all duration-500
        ${isRunning 
          ? 'bg-gradient-to-t from-forge-copper via-forge-dark to-forge-dark' 
          : 'bg-forge-dark'}
      `} />

      {/* 용광로 효과 (켜진 상태) */}
      {isRunning && (
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div 
            className="absolute bottom-0 left-0 right-0 h-1/2 animate-forge-glow"
            style={{
              background: 'linear-gradient(to top, rgba(232, 107, 42, 0.6), transparent)',
            }}
          />
          <div 
            className="absolute bottom-0 left-0 right-0 h-1/3 animate-forge-pulse"
            style={{
              background: 'linear-gradient(to top, rgba(232, 107, 42, 0.4), transparent)',
            }}
          />
        </div>
      )}

      {/* 테두리 - 항상 표시 */}
      <div className={`
        absolute inset-0 rounded-full border-2 transition-all duration-500
        ${isRunning 
          ? 'border-forge-copper/60' 
          : isStarting 
            ? 'border-forge-amber/40' 
            : 'border-white/20'}
      `} />

      {/* 아이콘 / 로고 */}
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
              ? 'drop-shadow(0 0 20px rgba(232, 107, 42, 0.5))' 
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

      {/* 스타일 정의 */}
      <style>{`
        @keyframes forge-glow {
          0%, 100% {
            opacity: 0.6;
            transform: translateY(0);
          }
          50% {
            opacity: 0.8;
            transform: translateY(-5px);
          }
        }
        
        @keyframes forge-pulse {
          0%, 100% {
            opacity: 0.4;
            transform: scaleY(1);
          }
          50% {
            opacity: 0.6;
            transform: scaleY(1.1);
          }
        }
        
        @keyframes corona-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        
        .animate-corona-spin {
          animation: corona-spin 2s linear infinite;
        }
        
        .animate-corona-trail1 {
          animation: corona-spin 2s linear infinite;
          animation-delay: -0.15s;
        }
        
        .animate-corona-trail2 {
          animation: corona-spin 2s linear infinite;
          animation-delay: -0.35s;
        }
        
        .animate-forge-glow {
          animation: forge-glow 2s ease-in-out infinite;
        }
        
        .animate-forge-pulse {
          animation: forge-pulse 1.5s ease-in-out infinite;
          animation-delay: 0.5s;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </button>
  );
}
