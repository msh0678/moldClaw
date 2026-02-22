// OrbitButton - 궤도 위 기능 버튼
// 아이콘 중심, 텍스트 절제

interface OrbitButtonProps {
  icon: string;
  label: string;
  size: 'large' | 'medium' | 'small';
  position: {
    angle: number;   // 각도 (0 = 우측, 90 = 하단, 180 = 좌측, 270 = 상단)
    distance: number; // 중심에서의 거리 (px)
  };
  onClick: () => void;
  danger?: boolean;
}

const SIZE_CLASSES = {
  large: {
    button: 'w-20 h-20',
    icon: 'text-3xl',
    label: 'text-xs mt-1',
  },
  medium: {
    button: 'w-16 h-16',
    icon: 'text-2xl',
    label: 'text-[11px] mt-1',
  },
  small: {
    button: 'w-14 h-14',
    icon: 'text-xl',
    label: 'text-[10px] mt-0.5',
  },
};

export default function OrbitButton({
  icon,
  label,
  size,
  position,
  onClick,
  danger = false,
}: OrbitButtonProps) {
  // 각도를 라디안으로 변환하고 위치 계산
  const angleRad = (position.angle * Math.PI) / 180;
  const x = Math.cos(angleRad) * position.distance;
  const y = Math.sin(angleRad) * position.distance;

  const sizeClass = SIZE_CLASSES[size];

  return (
    <button
      onClick={onClick}
      className={`
        absolute flex flex-col items-center justify-center
        transition-all duration-300 group
        ${sizeClass.button}
      `}
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        transform: 'translate(-50%, -50%)',
      }}
      // title 제거 - 커스텀 라벨과 중복 방지
    >
      {/* 배경 - solid & opaque, 모든 버튼 동일 스타일 */}
      <div className={`
        absolute inset-0 rounded-full transition-all duration-300
        bg-[#252836] border-2 border-[#3a3f52] 
        group-hover:bg-[#2d3142] group-hover:border-forge-copper/70
        group-hover:scale-105
        shadow-lg shadow-black/40
      `} />

      {/* 아이콘 */}
      <span className={`
        relative z-10 transition-transform duration-300
        ${sizeClass.icon}
        group-hover:scale-110
      `}>
        {icon}
      </span>

      {/* 라벨 (호버 시 표시) - 불투명 배경 */}
      <span className={`
        absolute -bottom-7 left-1/2 -translate-x-1/2
        px-3 py-1 rounded-md bg-[#1a1c24] border border-[#2a2d3e]
        whitespace-nowrap transition-all duration-300
        opacity-0 group-hover:opacity-100
        shadow-lg shadow-black/50
        ${sizeClass.label}
        ${danger ? 'text-forge-error' : 'text-forge-text'}
      `}>
        {label}
      </span>

      {/* 글로우 효과 (호버 시) */}
      <div className={`
        absolute inset-0 rounded-full opacity-0 group-hover:opacity-100
        transition-opacity duration-300 pointer-events-none
        ${danger 
          ? 'shadow-lg shadow-forge-error/30' 
          : 'shadow-lg shadow-forge-copper/20'}
      `} />
    </button>
  );
}
