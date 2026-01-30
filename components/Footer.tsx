import Link from 'next/link';
import Image from 'next/image';
import { FaGlobe, FaBlog, FaComments, FaYoutube, FaInstagram, FaTiktok, FaEnvelopeOpenText } from 'react-icons/fa';

const links = [
  { href: 'https://litt.ly/aklabs', label: '홈페이지', icon: FaGlobe },
  { href: 'https://blog.naver.com/ak_labs', label: '블로그', icon: FaBlog },
  { href: 'https://cafe.naver.com/ilyuin', label: '카페', icon: FaComments },
  { href: 'https://www.youtube.com/@AKLABS84', label: '유튜브', icon: FaYoutube },
  { href: 'https://www.instagram.com/aklabs_/', label: '인스타그램', icon: FaInstagram },
  { href: 'https://www.tiktok.com/@aklabs84', label: '틱톡', icon: FaTiktok },
  { href: 'https://tally.so/r/mepkae', label: '뉴스레터', icon: FaEnvelopeOpenText },
];

export default function Footer() {
  return (
    <footer className="mt-20 py-12 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
          <div className="max-w-md">
            <Link href="/" className="flex items-center space-x-3 mb-6 group">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white p-1.5 transform group-hover:scale-110 transition-transform shadow-sm">
                <Image
                  src="/favicon_io/android-chrome-192x192.png"
                  alt="AI LABS"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-xl font-black tracking-tighter text-gray-900 dark:text-white">AI LABS</h3>
            </Link>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
              바이브코딩이 만든 AI 앱과 프롬프트를 실험하고 공유하는 공간입니다.
              <br className="hidden sm:block" />
              아이디어를 빠르게 현실로 만들고 팀원들과 검증해 보세요.
            </p>
            <div className="flex flex-wrap gap-2">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-all shadow-sm hover:shadow-md active:scale-95"
                  title={label}
                >
                  <Icon className="text-lg" />
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
            <FooterLinkGroup title="Menu">
              <FooterLink href="/apps">바이브코딩</FooterLink>
              <FooterLink href="/prompts">프롬프트</FooterLink>
              <FooterLink href="/content">콘텐츠</FooterLink>
            </FooterLinkGroup>
            <FooterLinkGroup title="Support">
              <FooterLink href="/guide">Q&A</FooterLink>
              <FooterLink href="/request">제작 의뢰</FooterLink>
              <FooterLink href="/my">마이페이지</FooterLink>
            </FooterLinkGroup>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
            © {new Date().getFullYear()} AKLABS. EXPERIMENTAL AI HUB.
          </p>
          <div className="flex items-center space-x-6">
            <p className="text-[10px] font-bold text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">Privacy Policy</p>
            <p className="text-[10px] font-bold text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">Terms of Service</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLinkGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">{title}</h4>
      <div className="flex flex-col space-y-2">
        {children}
      </div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
    >
      {children}
    </Link>
  );
}
