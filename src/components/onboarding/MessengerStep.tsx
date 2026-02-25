// MessengerStep - 메신저 선택 단계
// 기본 보기 (3개) + 더 많은 메신저 보기 지원

import { useState } from 'react';
import type { MessengerConfig, Messenger } from '../../types/config';
import { BASIC_MESSENGERS, ADDITIONAL_MESSENGERS, ALL_MESSENGERS } from '../../data/messengers';
import { defaultMessengerConfig } from '../../types/config';
import { BrandIcon } from '../common/BrandIcon';

interface MessengerStepProps {
  initialConfig: MessengerConfig;
  onComplete: (config: MessengerConfig) => void;
  onBack: () => void;
}

export default function MessengerStep({ initialConfig, onComplete, onBack }: MessengerStepProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedMessenger, setSelectedMessenger] = useState<Messenger>(initialConfig.type);

  const displayMessengers = showAll ? ALL_MESSENGERS : BASIC_MESSENGERS;
  const messengerInfo = ALL_MESSENGERS.find(m => m.id === selectedMessenger);

  const handleSelect = (messenger: Messenger) => {
    setSelectedMessenger(messenger);
  };

  const handleNext = () => {
    if (!selectedMessenger) return;
    
    // 선택한 메신저로 config 업데이트
    onComplete({
      ...defaultMessengerConfig,
      type: selectedMessenger,
    });
  };

  return (
    <div className="min-h-screen flex flex-col p-8">
      {/* 뒤로가기 */}
      <button 
        onClick={onBack}
        className="text-forge-muted hover:text-forge-text mb-6 flex items-center gap-2 self-start"
      >
        ← 뒤로
      </button>

      <div className="max-w-xl mx-auto w-full">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-forge-surface flex items-center justify-center">
            <span className="text-3xl">💬</span>
          </div>
          <h2 className="text-2xl font-bold text-forge-text mb-2">메신저 선택</h2>
          <p className="text-forge-muted">
            AI와 대화할 메신저를 선택하세요
          </p>
        </div>

        {/* 메신저 선택 */}
        <div className="space-y-3 mb-6">
          {displayMessengers.map((m) => (
            <button
              key={m.id}
              onClick={() => handleSelect(m.id)}
              className={`
                w-full p-4 rounded-xl text-left transition-all relative
                ${selectedMessenger === m.id
                  ? 'bg-forge-copper/20 border-2 border-forge-copper'
                  : 'bg-forge-surface hover:bg-white/10 border-2 border-transparent'
                }
                ${m.recommended ? 'ring-2 ring-forge-amber/30' : ''}
              `}
            >
              {m.recommended && (
                <span className="absolute -top-2 right-4 px-2 py-0.5 bg-forge-amber text-forge-night text-xs font-medium rounded-full">
                  추천
                </span>
              )}

              {selectedMessenger === m.id && (
                <span className="absolute top-4 right-4 text-forge-copper">✓</span>
              )}

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 flex items-center justify-center">
                  <BrandIcon 
                    iconSlug={m.iconSlug}
                    iconColor={m.iconColor}
                    logo={m.logo}
                    icon={m.icon}
                    name={m.name}
                    size={32}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-forge-text">{m.name}</span>
                    <span className="text-xs text-forge-muted">
                      {'⭐'.repeat(m.difficulty)}{'☆'.repeat(3 - m.difficulty)}
                    </span>
                  </div>
                  <p className="text-sm text-forge-muted mb-2">{m.desc}</p>

                  {/* 장점 */}
                  <div className="flex flex-wrap gap-1 mb-1">
                    {m.pros.slice(0, 2).map((pro, i) => (
                      <span 
                        key={i} 
                        className="text-xs px-2 py-0.5 bg-forge-success/20 text-forge-success rounded"
                      >
                        ✓ {pro}
                      </span>
                    ))}
                  </div>

                  {/* 단점 */}
                  {m.cons.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {m.cons.slice(0, 1).map((con, i) => (
                        <span 
                          key={i} 
                          className="text-xs px-2 py-0.5 bg-forge-amber/10 text-forge-amber rounded"
                        >
                          {con}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 더 많은 메신저 보기 */}
        {!showAll && ADDITIONAL_MESSENGERS.length > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full py-2 text-sm text-forge-copper hover:text-forge-amber transition-colors mb-6"
          >
            더 많은 메신저 보기 ({ADDITIONAL_MESSENGERS.length}개) →
          </button>
        )}
        {showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="w-full py-2 text-sm text-forge-muted hover:text-forge-text transition-colors mb-6"
          >
            ← 기본 보기로
          </button>
        )}

        {/* 선택된 메신저 요약 */}
        {messengerInfo && (
          <div className="card p-4 mb-6 animate-fadeIn">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">{messengerInfo.icon}</span>
              <span className="font-medium text-forge-text">{messengerInfo.name} 선택됨</span>
            </div>
            <p className="text-sm text-forge-muted">
              다음 단계에서 {messengerInfo.needsToken ? '봇 토큰을 입력' : 'QR 코드를 스캔'}합니다.
            </p>
          </div>
        )}

        {/* 다음 버튼 */}
        <button
          onClick={handleNext}
          disabled={!selectedMessenger}
          className="
            w-full py-4 rounded-xl font-semibold text-white
            btn-primary disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {selectedMessenger ? '다음 →' : '메신저를 선택하세요'}
        </button>
      </div>
    </div>
  );
}
