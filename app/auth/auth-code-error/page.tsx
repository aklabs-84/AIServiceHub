
import Link from 'next/link';
import { FaExclamationTriangle } from 'react-icons/fa';

export default function AuthCodeErrorPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="max-w-md w-full text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
                        <FaExclamationTriangle className="text-4xl text-red-500" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    로그인 오류
                </h1>

                <p className="text-gray-600 dark:text-gray-300 mb-8">
                    인증 과정에서 문제가 발생했습니다.<br />
                    잠시 후 다시 시도해 주세요.
                </p>

                <div className="space-y-3">
                    <Link
                        href="/"
                        className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors duration-200"
                    >
                        홈으로 돌아가기
                    </Link>
                </div>
            </div>
        </div>
    );
}
