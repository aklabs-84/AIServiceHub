'use client';

import { useState, useEffect } from 'react';
import { FaAngleDoubleUp } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 400) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility, { passive: true });
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={scrollToTop}
                    className="fixed bottom-8 right-8 z-[100] flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors duration-200 border border-gray-300/50 dark:border-gray-600/50"
                    aria-label="Scroll to top"
                >
                    <FaAngleDoubleUp className="text-xl" />
                </motion.button>
            )}
        </AnimatePresence>
    );
}
