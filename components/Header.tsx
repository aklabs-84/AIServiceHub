'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FaMoon, FaSun, FaBars, FaTimes, FaSignOutAlt } from 'react-icons/fa';
import { RiKakaoTalkFill } from 'react-icons/ri';
import { FcGoogle } from 'react-icons/fc';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();
  const { user, loading, signInWithGoogle, signInWithKakao, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  /* 
    Homepage specific: Force refresh to clear stale server cache on mount 
    This fixes the issue where homepage stays in "logged in" state visuals after logout
  */
  useEffect(() => {
    if (window.location.pathname === '/') {
      router.refresh();
    }
  }, [router, user]); // Re-run when user state changes

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-950/70 border-b border-gray-200/50 dark:border-gray-800/50 transition-colors duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* 로고 */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm border border-gray-200 dark:border-gray-700 bg-white p-1.5 font-bold flex items-center justify-center">
              <Image
                src="/favicon_io/android-chrome-192x192.png"
                alt="AI LABS"
                width={48}
                height={48}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tighter text-gray-900 dark:text-white hidden sm:block font-sans">
              AI LABS
            </h1>
          </Link>

          {/* 데스크톱 네비게이션 */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <NavLink href="/apps">바이브코딩</NavLink>
            <NavLink href="/prompts">프롬프트</NavLink>
            <NavLink href="/content">콘텐츠</NavLink>
            <NavLink href="/guide">Q&A</NavLink>
            <Link
              href="/request"
              className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200 dark:shadow-none transition-all"
            >
              제작 의뢰
            </Link>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-2" />

            {/* 다크모드 토글 */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-all active:scale-90"
              title={theme === 'light' ? '다크모드' : '라이트모드'}
            >
              {theme === 'light' ? (
                <FaMoon className="text-gray-600" />
              ) : (
                <FaSun className="text-yellow-400" />
              )}
            </button>

            {!loading ? (
              user ? (
                <div className="relative ml-2">
                  <button
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                    className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                  >
                    {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                      <Image
                        src={user.user_metadata.avatar_url || user.user_metadata.picture}
                        alt={user.user_metadata.full_name || user.user_metadata.name || '사용자'}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full shadow-sm"
                        unoptimized
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                        {user.email?.[0].toUpperCase()}
                      </div>
                    )}
                  </button>

                  {profileMenuOpen && (
                    <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-white text-gray-800 shadow-2xl ring-1 ring-black/5 dark:bg-gray-900 dark:text-gray-100 dark:ring-white/10 animate-fadeIn overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Signed in as</p>
                        <p className="font-bold truncate text-sm">{user.email}</p>
                      </div>
                      <div className="p-2 space-y-1">
                        <Link
                          href="/my"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center px-3 py-2 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          마이페이지
                        </Link>
                        {user.email === 'mosebb@gmail.com' && (
                          <Link
                            href="/admin"
                            onClick={() => setProfileMenuOpen(false)}
                            className="flex items-center px-3 py-2 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            관리자 설정
                          </Link>
                        )}
                        <button
                          onClick={async () => {
                            setProfileMenuOpen(false);
                            await signOut();
                          }}
                          className="w-full flex items-center px-3 py-2 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                        >
                          로그아웃
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2 ml-2">
                  <button
                    onClick={signInWithKakao}
                    className="p-2 rounded-xl bg-[#FEE500] hover:bg-[#FEE500]/90 transition-all hover:scale-105 active:scale-95 shadow-sm"
                  >
                    <RiKakaoTalkFill className="text-lg text-black" />
                  </button>
                  <button
                    onClick={signInWithGoogle}
                    className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-all hover:scale-105 active:scale-95 shadow-sm"
                  >
                    <FcGoogle className="text-lg" />
                  </button>
                </div>
              )
            ) : (
              // Loading Skeleton for User Area
              <div className="flex items-center space-x-2 ml-2 animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-800"></div>
                <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-800"></div>
              </div>
            )}
          </nav>

          {/* 모바일 버튼부 */}
          <div className="flex items-center space-x-2 md:hidden">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 focus:outline-none"
            >
              {theme === 'light' ? <FaMoon /> : <FaSun className="text-yellow-400" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 focus:outline-none"
            >
              {mobileMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {mobileMenuOpen && (
          <div className="md:hidden py-6 space-y-4 animate-fadeIn border-t border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-2 gap-3">
              <MobileNavLink href="/apps" onClick={() => setMobileMenuOpen(false)}>바이브코딩</MobileNavLink>
              <MobileNavLink href="/prompts" onClick={() => setMobileMenuOpen(false)}>프롬프트</MobileNavLink>
              <MobileNavLink href="/content" onClick={() => setMobileMenuOpen(false)}>콘텐츠</MobileNavLink>
              <MobileNavLink href="/guide" onClick={() => setMobileMenuOpen(false)}>Q&A</MobileNavLink>
              <MobileNavLink href="/request" onClick={() => setMobileMenuOpen(false)} highlight>제작 의뢰</MobileNavLink>
              <MobileNavLink href="/my" onClick={() => setMobileMenuOpen(false)}>마이페이지</MobileNavLink>
              {user?.email === 'mosebb@gmail.com' && (
                <MobileNavLink href="/admin" onClick={() => setMobileMenuOpen(false)}>관리자 설정</MobileNavLink>
              )}
            </div>

            {!loading && !user && (
              <div className="flex items-center justify-center space-x-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button onClick={signInWithKakao} className="flex-1 flex items-center justify-center py-3 rounded-2xl bg-[#FEE500] font-bold text-black shadow-sm">
                  <RiKakaoTalkFill className="mr-2" /> 카카오 로그인
                </button>
                <button onClick={signInWithGoogle} className="flex-1 flex items-center justify-center py-3 rounded-2xl bg-white border border-gray-200 font-bold text-gray-700 shadow-sm">
                  <FcGoogle className="mr-2" /> Google 로그인
                </button>
              </div>
            )}

            {user && (
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 overflow-hidden shadow-inner flex items-center justify-center text-white font-bold">
                    {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                      <Image
                        src={user.user_metadata.avatar_url || user.user_metadata.picture}
                        alt="Profile" width={40} height={40} unoptimized
                      />
                    ) : user.email?.[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold truncate max-w-[150px] text-gray-900 dark:text-white">{user.email}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Logged in</p>
                  </div>
                </div>
                <button onClick={async () => await signOut()} className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold hover:scale-105 active:scale-95 transition-all">
                  <FaSignOutAlt />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ href, children, onClick, highlight }: { href: string; children: React.ReactNode; onClick: () => void; highlight?: boolean }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center justify-center px-4 py-3 rounded-2xl text-sm font-bold transition-all ${highlight
        ? "bg-blue-600 text-white shadow-lg"
        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        }`}
    >
      {children}
    </Link>
  );
}
