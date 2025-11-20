interface TagBadgeProps {
  tag: string;
  size?: 'sm' | 'md';
}

export default function TagBadge({ tag, size = 'sm' }: TagBadgeProps) {
  const getTagStyle = (tag: string): { bg: string; text: string; label: string } => {
    switch (tag) {
      case 'HEALTHY_DERATING':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          label: '건전 디레이팅'
        };
      case 'STRUCTURAL_IMPROVEMENT':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          label: '구조적 개선'
        };
      case 'OVERHEAT_WARNING':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          label: '과열 경고'
        };
      case 'TURNAROUND_CANDIDATE':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-800',
          label: '턴어라운드'
        };
      case 'HIGH_GROWTH':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          label: '고성장'
        };
      case 'VALUE_TRAP_WARNING':
        return {
          bg: 'bg-orange-100',
          text: 'text-orange-800',
          label: '가치함정 주의'
        };
      case 'MOMENTUM_SHIFT':
        return {
          bg: 'bg-indigo-100',
          text: 'text-indigo-800',
          label: '모멘텀 전환'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          label: tag
        };
    }
  };

  const style = getTagStyle(tag);
  const sizeClass = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  return (
    <span className={`${style.bg} ${style.text} ${sizeClass} font-semibold rounded-full inline-block`}>
      {style.label}
    </span>
  );
}
