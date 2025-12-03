'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FaGoogle, FaSignOutAlt, FaPlus, FaMoon, FaSun, FaBars, FaTimes, FaHeart, FaFeatherAlt } from 'react-icons/fa';
import { useState } from 'react';

export default function Header() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* 로고 */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden transform group-hover:scale-110 transition-transform duration-200 border border-gray-200 dark:border-gray-700 bg-white p-1">
              <Image
                src="/favicon_io/android-chrome-192x192.png"
                alt="AI Service Hub"
                width={48}
                height={48}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent hidden sm:block">
              AI Service Hub
            </h1>
          </Link>

          {/* 데스크톱 네비게이션 */}
          <nav className="hidden md:flex items-center space-x-2 lg:space-x-4">
            {!loading && (
              <>
                {/* 다크모드 토글 */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title={theme === 'light' ? '다크모드' : '라이트모드'}
                >
                  {theme === 'light' ? (
                    <FaMoon className="text-gray-700 dark:text-gray-300" />
                  ) : (
                    <FaSun className="text-yellow-500" />
                  )}
                </button>
                <Link
                  href="/apps"
                  className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  바이브코딩
                </Link>
                <Link
                  href="/prompts"
                  className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  프롬프트
                </Link>

                {user ? (
                  <>
                    {/* 상단 글로벌 등록 버튼 제거: 각 페이지에서 노출 */}
                    <Link
                      href="/my-apps"
                      className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      내 앱
                    </Link>
                    <Link
                      href="/liked-apps"
                      className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <FaHeart className="text-red-500" />
                      <span className="hidden lg:inline">좋아요</span>
                    </Link>
                    <div className="flex items-center space-x-3 pl-2 border-l border-gray-300 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        {user.photoURL && (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || '사용자'}
                            className="w-9 h-9 rounded-full border-2 border-blue-500 dark:border-purple-500"
                          />
                        )}
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden lg:inline">
                          {user.displayName}
                        </span>
                      </div>
                      <button
                        onClick={signOut}
                        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="로그아웃"
                      >
                        <FaSignOutAlt />
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={signInWithGoogle}
                    className="flex items-center space-x-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:scale-105 shadow-sm"
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
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'light' ? (
                <FaMoon className="text-gray-700 dark:text-gray-300" />
              ) : (
                <FaSun className="text-yellow-500" />
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {mobileMenuOpen ? (
                <FaTimes className="text-gray-700 dark:text-gray-300" />
              ) : (
                <FaBars className="text-gray-700 dark:text-gray-300" />
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
                    className="px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-center font-medium"
                  >
                    바이브코딩 둘러보기
                  </Link>
                  <Link
                    href="/prompts"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-center font-medium"
                  >
                    프롬프트 둘러보기
                  </Link>
                  {user ? (
                    <>
                      {/* 모바일 글로벌 등록 버튼 제거: 각 페이지에서 노출 */}
                      <Link
                        href="/my-apps"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-center"
                      >
                        내 앱
                      </Link>
                      <Link
                        href="/liked-apps"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <FaHeart className="text-red-500" />
                        <span>좋아요한 앱</span>
                      </Link>
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-2">
                          {user.photoURL && (
                            <img
                              src={user.photoURL}
                              alt={user.displayName || '사용자'}
                              className="w-8 h-8 rounded-full border-2 border-blue-500"
                            />
                          )}
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {user.displayName}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            signOut();
                            setMobileMenuOpen(false);
                          }}
                          className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
