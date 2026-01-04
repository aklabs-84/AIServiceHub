'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function HeroPreview() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="w-full max-w-[520px] mx-auto rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"
        style={{ aspectRatio: '520 / 376' }}
      />
    );
  }

  return (
    <Image
      src="/hero_image.png"
      alt="앱과 프롬프트를 함께 관리하는 인터페이스 미리보기"
      width={520}
      height={376}
      priority
      className="w-full max-w-[520px] h-auto mx-auto object-contain"
    />
  );
}
