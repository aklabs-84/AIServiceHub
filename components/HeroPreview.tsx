'use client';

import Image from 'next/image';

export default function HeroPreview() {
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
