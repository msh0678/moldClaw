// BrandIcon - 브랜드 아이콘 표시 컴포넌트
// @iconify/react (Simple Icons) 사용, fallback으로 이미지/이모지

import { Icon } from '@iconify/react';

interface BrandIconProps {
  iconSlug?: string;
  iconColor?: string;
  logo?: string;
  icon?: string;
  name: string;
  size?: number;
  className?: string;
}

export function BrandIcon({ 
  iconSlug, 
  iconColor, 
  logo, 
  icon, 
  name, 
  size = 24,
  className = ''
}: BrandIconProps) {
  // 1순위: iconSlug가 있으면 @iconify/react 사용
  if (iconSlug) {
    return (
      <Icon 
        icon={`simple-icons:${iconSlug}`} 
        color={iconColor}
        width={size} 
        height={size}
        className={className}
      />
    );
  }

  // 2순위: logo URL이 있으면 이미지 사용
  if (logo) {
    return (
      <img 
        src={logo} 
        alt={name} 
        className={`object-contain ${className}`}
        style={{ width: size, height: size }}
        onError={(e) => {
          // 이미지 로드 실패 시 이모지로 fallback
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.parentElement?.querySelector('.fallback-emoji')?.classList.remove('hidden');
        }}
      />
    );
  }

  // 3순위: 이모지 아이콘
  return (
    <span 
      className={`text-center ${className}`}
      style={{ fontSize: size * 0.8, lineHeight: `${size}px` }}
    >
      {icon || '❓'}
    </span>
  );
}

// 프로바이더/메신저 정보에서 직접 사용하는 헬퍼
export function BrandIconFromInfo({ 
  info, 
  size = 24, 
  className = '' 
}: { 
  info: { iconSlug?: string; iconColor?: string; logo?: string; icon?: string; name: string };
  size?: number;
  className?: string;
}) {
  return (
    <BrandIcon 
      iconSlug={info.iconSlug}
      iconColor={info.iconColor}
      logo={info.logo}
      icon={info.icon}
      name={info.name}
      size={size}
      className={className}
    />
  );
}
