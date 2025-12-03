import Link from 'next/link';
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
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-950/60 backdrop-blur">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">AI Service Hub</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              아이디어를 서비스로 연결하는 허브. 바이브코딩이 만든 앱과 프롬프트를 한 곳에서 만나보세요.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-start md:justify-end">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-3 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm"
              >
                <Icon />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-6 text-xs text-gray-500 dark:text-gray-500">
          © {new Date().getFullYear()} AKLABS. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
