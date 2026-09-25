'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Camera, Heart, Sun, Moon, Search, MessageSquare, Sparkles } from 'lucide-react';
import styles from './TopHeader.module.css';
import { usePathname } from 'next/navigation';
import NotificationModal from '../modals/NotificationModal';
import { notificationService } from '@/services/notification-service';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { triggerHaptic } from '@/lib/haptics';
import { ImpactStyle } from '@capacitor/haptics';

const TopHeader = () => {
    const pathname = usePathname();
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const { theme, toggleTheme } = useTheme();
    const { user } = useAuth();
    const isLoggedIn = !!user;
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const fetchUnreadCount = async () => {
        if (!isLoggedIn) return;
        try {
            const data = await notificationService.getNotifications();
            if (data && typeof data.unreadCount === 'number') {
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            // Silently handle
        }
    };

    useEffect(() => {
        if (isLoggedIn) {
            fetchUnreadCount();
            const interval = setInterval(fetchUnreadCount, 60000);
            return () => clearInterval(interval);
        } else {
            setUnreadCount(0);
        }
    }, [isLoggedIn]);

    useEffect(() => {
        if (!showNotifications) {
            fetchUnreadCount();
        }
    }, [showNotifications]);

    if (pathname === '/reels') return null;

    return (
        <>
            <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
                <div className={styles.leftSection}>
                    {/* Mobile Logo */}
                    <Link href="/" className={styles.mobileLogo}>
                        <div className={styles.logoIcon}>
                            <Camera size={18} strokeWidth={2.5} />
                        </div>
                        <span className={styles.logoText}>Viewer</span>
                    </Link>

                    {/* Desktop Search Shortcut */}
                    <Link href="/search" className={styles.searchBarShortcut}>
                        <Search size={16} />
                        <span>Search creators, tags...</span>
                        <span className={styles.searchShortcutKey}>⌘K</span>
                    </Link>
                </div>

                <div className={styles.rightSection}>
                    {/* Direct Messages Shortcut on Desktop */}
                    <Link href="/messages" className={styles.iconBtn} aria-label="Messages">
                        <MessageSquare size={18} />
                    </Link>

                    {/* Theme Toggle Button */}
                    <button
                        className={`${styles.themeToggleBtn} ${theme === 'dark' ? styles.themeToggleDark : styles.themeToggleLight}`}
                        onClick={() => {
                            toggleTheme();
                            triggerHaptic(ImpactStyle.Light);
                        }}
                        aria-label="Toggle theme"
                        type="button"
                    >
                        <span className={styles.themeToggleGlow} />
                        <span className={styles.themeToggleIcon}>
                            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                        </span>
                        <span className={styles.themeToggleLabel}>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                        <Sparkles size={12} className={styles.themeSparkle} />
                    </button>

                    {/* Notifications Button */}
                    <button
                        className={styles.iconBtn}
                        onClick={() => {
                            setShowNotifications(true);
                            triggerHaptic(ImpactStyle.Light);
                        }}
                        aria-label="Notifications"
                    >
                        <Heart size={18} />
                        {unreadCount > 0 && (
                            <span className={styles.badge}>{unreadCount}</span>
                        )}
                    </button>
                </div>
            </header>

            <NotificationModal
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
            />
        </>
    );
};

export default TopHeader;
