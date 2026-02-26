// DashboardPlanetary - Planetary 형태 대시보드
// 가운데 전원 버튼 (용광로 효과)
// 주변 기능 버튼들 (행성처럼 배치)

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { GatewayStatus, AppView } from '../../types/config';
import PowerButton from './PowerButton';
import OrbitButton from './OrbitButton';
import DeleteModal from './DeleteModal';

interface DashboardPlanetaryProps {
  onNavigate: (view: AppView) => void;
  forceCheckOnMount?: boolean;  // 설정에서 변경 후 돌아왔을 때 true
  onReady?: () => void;         // 초기 체크 완료 시 호출
}

export default function DashboardPlanetary({ onNavigate, forceCheckOnMount, onReady }: DashboardPlanetaryProps) {
  // forceCheckOnMount가 true면 초기 상태를 'stopped'로 시작 (설정 변경 후 돌아왔을 때)
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>(forceCheckOnMount ? 'stopped' : 'checking');
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    // forceCheckOnMount가 true면 즉시 체크 시작 (백그라운드)
    checkStatus().then(() => {
      // 초기 체크 완료 알림
      onReady?.();
    });
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const status = await invoke<string>('get_gateway_status');
      setGatewayStatus(status === 'running' ? 'running' : 'stopped');
    } catch {
      setGatewayStatus('error');
    }
  };

  const handlePowerClick = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (gatewayStatus === 'running') {
        setGatewayStatus('checking');
        await invoke('stop_gateway');
      } else {
        setGatewayStatus('starting');
        await invoke<string>('install_and_start_service');
      }
      await checkStatus();
    } catch (err) {
      console.error('Gateway 제어 실패:', err);
      setGatewayStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const openWebInterface = async () => {
    try {
      const url = await invoke<string>('get_dashboard_url');
      window.open(url, '_blank');
    } catch {
      window.open('http://localhost:18789', '_blank');
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-8 relative overflow-hidden">
      {/* 배경 효과 - 미묘한 중앙 글로우만 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-forge-copper/[0.03] blur-3xl" />
      </div>

      {/* 메인 컨테이너 */}
      <div className="relative w-full max-w-2xl aspect-square flex items-center justify-center">
        {/* 궤도 링 - 미묘한 가이드라인 */}
        <div className="absolute inset-4 rounded-full border border-white/[0.03]" />
        <div className="absolute inset-20 rounded-full border border-white/[0.05]" />

        {/* 전원 버튼 (중앙) */}
        <PowerButton
          status={gatewayStatus}
          onClick={handlePowerClick}
          loading={loading}
        />

        {/* 주변 버튼들 (궤도 위치) */}
        
        {/* 설정 버튼 (크기: 큼) - 우측 */}
        <OrbitButton
          icon="⚙️"
          label="설정"
          size="large"
          position={{ angle: 0, distance: 200 }}
          onClick={() => onNavigate('settings')}
        />

        {/* 알림 관리 버튼 (크기: 중간) - 상단 */}
        <OrbitButton
          icon="🔔"
          label="알림"
          size="medium"
          position={{ angle: 270, distance: 180 }}
          onClick={() => onNavigate('notifications')}
        />

        {/* 파일/기록 버튼 (크기: 작음) - 좌상단 */}
        <OrbitButton
          icon="📁"
          label="파일"
          size="small"
          position={{ angle: 225, distance: 170 }}
          onClick={() => onNavigate('files')}
        />

        {/* 로그 버튼 (크기: 작음) - 좌측 */}
        <OrbitButton
          icon="📋"
          label="로그"
          size="small"
          position={{ angle: 180, distance: 185 }}
          onClick={() => onNavigate('logs')}
        />

        {/* 웹 인터페이스 버튼 (크기: 작음) - 우상단 */}
        <OrbitButton
          icon="🌐"
          label="웹"
          size="small"
          position={{ angle: 315, distance: 170 }}
          onClick={openWebInterface}
        />

        {/* 경고/삭제 버튼 (크기: 작음) - 좌하단 */}
        <OrbitButton
          icon="⚠️"
          label="삭제"
          size="small"
          position={{ angle: 135, distance: 175 }}
          onClick={() => setShowDeleteModal(true)}
          danger
        />

        {/* 사용법 버튼 (크기: 작음) - 우하단 */}
        <OrbitButton
          icon="📖"
          label="가이드"
          size="small"
          position={{ angle: 45, distance: 180 }}
          onClick={() => onNavigate('guide')}
        />
      </div>

      {/* 하단 상태 표시 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
        <p className="text-sm text-forge-muted">
          {gatewayStatus === 'running' && '🟢 Gateway 실행 중'}
          {gatewayStatus === 'stopped' && '🔴 Gateway 중지됨'}
          {gatewayStatus === 'starting' && '🟡 시작 중...'}
          {gatewayStatus === 'checking' && '🟡 상태 확인 중...'}
          {gatewayStatus === 'error' && '❌ 연결 오류'}
        </p>
      </div>

      {/* 삭제 모달 */}
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
