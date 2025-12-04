'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FaGoogle, FaSignOutAlt, FaMoon, FaSun, FaBars, FaTimes, FaHeart, FaUserCircle } from 'react-icons/fa';
import { useState } from 'react';

export default function Header() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-800 shadow-lg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* 로고 */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden transform group-hover:scale-110 transition-transform duration-200 border border-slate-700 bg-white p-1">
              <Image
                src="/favicon_io/android-chrome-192x192.png"
                alt="AI LABS"
                width={48}
                height={48}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white hidden sm:block">
              AI LABS
            </h1>
          </Link>

          {/* 데스크톱 네비게이션 */}
          <nav className="hidden md:flex items-center space-x-2 lg:space-x-4">
            {!loading && (
              <>
                {/* 다크모드 토글 */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title={theme === 'light' ? '다크모드' : '라이트모드'}
                >
                  {theme === 'light' ? (
                    <FaMoon className="text-slate-200" />
                  ) : (
                    <FaSun className="text-yellow-300" />
                  )}
                </button>
                <Link
                  href="/apps"
                  className="px-4 py-2 rounded-lg text-white hover:bg-white/10 transition-colors font-medium"
                >
                  바이브코딩
                </Link>
                <Link
                  href="/prompts"
                  className="px-4 py-2 rounded-lg text-white hover:bg-white/10 transition-colors font-medium"
                >
                  프롬프트
                </Link>
                <Link
                  href="/guide"
                  className="px-4 py-2 rounded-lg text-white hover:bg-white/10 transition-colors font-medium"
                >
                  Q&A
                </Link>

                {user ? (
                  <div className="relative">
                    <button
                      onClick={() => setProfileMenuOpen((prev) => !prev)}
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || '사용자'}
                          className="w-9 h-9 rounded-full border-2 border-blue-500 dark:border-purple-500"
                        />
                      ) : (
                        <FaUserCircle className="w-9 h-9 text-white" />
                      )}
                      <span className="text-sm font-medium text-white hidden lg:inline">
                        {user.displayName}
                      </span>
                    </button>

                    {profileMenuOpen && (
                      <div className="absolute right-0 mt-3 w-56 rounded-xl bg-white text-gray-800 shadow-2xl ring-1 ring-black/5 dark:bg-gray-800 dark:text-gray-100 dark:ring-white/10 animate-fadeIn">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                          <p className="text-sm text-gray-500 dark:text-gray-400">로그인됨</p>
                          <p className="font-semibold truncate">{user.displayName || '사용자'}</p>
                        </div>
                        <div className="py-2">
                          <Link
                            href="/my"
                            onClick={() => setProfileMenuOpen(false)}
                            className="block px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            마이페이지
                          </Link>
                        </div>
                        <button
                          onClick={() => {
                            signOut();
                            setProfileMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl"
                        >
                          로그아웃
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={signInWithGoogle}
                    className="flex items-center space-x-2 bg-white/10 border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all transform hover:scale-105 shadow-sm"
                  >
                    <FaGoogle className="text-red-500" />
                    <span>로그인</span>
                  </button>
                )}
              </>
            )}
          </nav>

          {/* 모바일 메뉴 버튼 */}
          <div className="flex items-center space-x-2 md:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              {theme === 'light' ? (
                <FaMoon className="text-slate-200" />
              ) : (
                <FaSun className="text-yellow-300" />
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              {mobileMenuOpen ? (
                <FaTimes className="text-white" />
              ) : (
                <FaBars className="text-white" />
              )}
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 animate-fadeIn">
            <div className="flex flex-col space-y-2 pt-2">
              {!loading && (
                <>
                  <Link
                    href="/apps"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-colors text-center font-medium"
                  >
                    바이브코딩 둘러보기
                  </Link>
                  <Link
                    href="/prompts"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-colors text-center font-medium"
                  >
                    프롬프트 둘러보기
                  </Link>
                  <Link
                    href="/guide"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-colors text-center font-medium"
                  >
                    Q&A
                  </Link>
                  {user ? (
                    <>
                      {/* 모바일 글로벌 등록 버튼 제거: 각 페이지에서 노출 */}
                      <Link
                        href="/my"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-colors text-center"
                      >
                        마이페이지
                      </Link>
                      <div className="flex items-center justify-between px-4 py-3 bg-white/10 rounded-lg">
                        <div className="flex items-center space-x-2">
                          {user.photoURL && (
                            <img
                              src={user.photoURL}
                              alt={user.displayName || '사용자'}
                              className="w-8 h-8 rounded-full border-2 border-blue-500"
                            />
                          )}
                          <span className="text-sm font-medium text-white">
                            {user.displayName}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            signOut();
                            setMobileMenuOpen(false);
                          }}
                          className="p-2 rounded-lg text-red-300 hover:bg-red-500/10 transition-colors"
                        >
                          <FaSignOutAlt />
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        signInWithGoogle();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center justify-center space-x-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <FaGoogle className="text-red-500" />
                      <span>Google 로그인</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
