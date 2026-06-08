import React, { useState } from 'react';
import clsx from 'clsx';

const GRADIENTS = [
  'from-[#FF6B8A] to-[#C44FD4]',
  'from-[#FF8DA5] to-[#FF6B8A]',
  'from-[#A855F7] to-[#FF6B8A]',
  'from-[#6366F1] to-[#A855F7]',
  'from-[#F472B6] to-[#FB7185]',
  'from-[#EC4899] to-[#8B5CF6]',
] as const;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-7 h-7 text-[10px] rounded-md',
  md: 'w-9 h-9 text-xs rounded-lg',
  lg: 'w-12 h-12 text-sm rounded-xl',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  avatarUrl,
  size = 'sm',
  className,
}) => {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(name || '?');
  const gradient = GRADIENTS[hashString(name || 'user') % GRADIENTS.length];
  const showImage = Boolean(avatarUrl) && !imageError;

  if (showImage) {
    return (
      <img
        src={avatarUrl!}
        alt={name}
        onError={() => setImageError(true)}
        className={clsx(
          sizeClasses[size],
          'object-cover border border-white/10 shrink-0',
          className
        )}
      />
    );
  }

  return (
    <div
      className={clsx(
        sizeClasses[size],
        'bg-gradient-to-br flex items-center justify-center font-bold text-white border border-white/10 shrink-0 font-display shadow-sm',
        gradient,
        className
      )}
      aria-label={name}
    >
      {initials}
    </div>
  );
};
