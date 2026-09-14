'use client';

import React, { useState } from 'react';
import { useTheme, Theme } from '@/contexts/ThemeContext';
import { Sun, Moon, Palette, Check, Sparkles, Cloud, Leaf, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ThemeSwitcher.module.css';

export interface ThemeConfig {
  id: Theme;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  color: string;
}

export const THEMES: ThemeConfig[] = [
  { id: 'light', label: 'Light', icon: Sun, color: '#6366f1' },
  { id: 'dark', label: 'Dark', icon: Moon, color: '#7000ff' },
  { id: 'amethyst', label: 'Amethyst', icon: Sparkles, color: '#a855f7' },
  { id: 'midnight', label: 'Midnight', icon: Cloud, color: '#3b82f6' },
  { id: 'forest', label: 'Forest', icon: Leaf, color: '#10b981' },
];

export interface ThemeSwitcherProps {
  variant?: 'popover' | 'inline';
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ variant = 'popover' }) => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  if (variant === 'inline') {
    return (
      <div className={styles.inlineContainer}>
        <h3 className={styles.title}>Visual Vibe</h3>
        <div className={styles.inlineGrid}>
          {THEMES.map((t) => {
            const isActive = theme === t.id;
            const Icon = t.icon;
            return (
              <motion.button
                key={t.id}
                className={`${styles.inlineThemeBtn} ${isActive ? styles.active : ''}`}
                onClick={() => setTheme(t.id)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                type="button"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeThemeInline"
                    className={styles.activeBackground}
                    style={{ backgroundColor: t.color }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className={styles.iconWrapper} style={{ color: isActive ? '#ffffff' : t.color }}>
                  <Icon size={20} />
                </span>
                <span className={styles.label} style={{ color: isActive ? '#ffffff' : 'inherit' }}>
                  {t.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.popoverContainer}>
      <motion.button
        className={styles.toggleBtn}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        title="Change Visual Theme"
        aria-label="Change Visual Theme"
        type="button"
      >
        <Palette size={22} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className={styles.overlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              className={styles.menu}
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            >
              <div className={styles.header}>
                <h3>Appearance</h3>
                <p>Choose your workspace aesthetic</p>
              </div>
              <div className={styles.popoverGrid}>
                {THEMES.map((t) => {
                  const isActive = theme === t.id;
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`${styles.themeOption} ${isActive ? styles.active : ''}`}
                      onClick={() => {
                        setTheme(t.id);
                        setIsOpen(false);
                      }}
                    >
                      <div
                        className={styles.themePreview}
                        style={{ backgroundColor: t.color }}
                      >
                        <Icon size={20} color="#ffffff" />
                        {isActive && (
                          <motion.div
                            className={styles.checkIcon}
                            layoutId="activeThemePopover"
                          >
                            <Check size={12} strokeWidth={3} />
                          </motion.div>
                        )}
                      </div>
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeSwitcher;
