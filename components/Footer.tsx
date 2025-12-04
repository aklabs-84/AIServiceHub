import Link from 'next/link';
import Image from 'next/image';
import { FaGlobe, FaBlog, FaComments, FaYoutube, FaInstagram, FaTiktok, FaEnvelopeOpenText } from 'react-icons/fa';

const links = [
  { href: 'https://litt.ly/aklabs', label: '홈페이지', icon: FaGlobe },
  { href: 'https://blog.naver.com/ak_labs', label: '블로그', icon: FaBlog },
  { href: 'https://cafe.naver.com/ilyuin', label: '네이버 카페', icon: FaComments },
  { href: 'https://www.youtube.com/@AKLABS84', label: '유튜브', icon: FaYoutube },
  { href: 'https://www.instagram.com/aklabs_/', label: '인스타그램', icon: FaInstagram },
  { href: 'https://www.tiktok.com/@aklabs84', label: '틱톡', icon: FaTiktok },
  { href: 'https://tally.so/r/mepkae', label: '뉴스레터 신청', icon: FaEnvelopeOpenText },
];

export default function Footer() {
  return (
    <footer className="mt-28 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-slate-100 border-t border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/30 bg-white p-1">
                <Image
                  src="/favicon_io/android-chrome-192x192.png"
                  alt="AI LABS"
                  width={36}
                  height={36}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <h3 className="text-lg font-semibold text-white">AI LABS</h3>
            </div>
            <p className="text-sm text-slate-200/80">
              바이브코딩이 만든 AI 앱과 프롬프트를 실험하고 공유하는 AI LABS.
              <br />
              아이디어를 빠르게 검증하고 팀과 나눠보세요.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-start md:justify-end">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-3 py-2 rounded-full border border-white/20 text-slate-100 hover:bg-white/10 transition text-sm"
              >
                <Icon />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-6 text-xs text-slate-300/80">
          © {new Date().getFullYear()} AKLABS. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
