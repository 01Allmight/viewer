import React, { useState } from 'react';
import { X, Settings, Shield, Bell, Key, LogOut, ChevronRight, User } from 'lucide-react';
import styles from './SettingsModal.module.css';
import PrivacyModal from './PrivacyModal';
import NotificationSettingsModal from './NotificationSettingsModal';
import SecurityModal from './SecurityModal';
import EditProfileModal from './EditProfileModal';
import { MOCK_USERS } from '@/constants/mockData';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProfileUpdate?: (data: { username: string; fullName: string; bio: string; avatar: string }) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onProfileUpdate }) => {
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isSecurityOpen, setIsSecurityOpen] = useState(false);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

    if (!isOpen) return null;

    const handlePrivacyClick = () => {
        setIsPrivacyOpen(true);
    };

    const handleNotificationsClick = () => {
        setIsNotificationsOpen(true);
    };

    const handleSecurityClick = () => {
        setIsSecurityOpen(true);
    };

    const handleEditProfileClick = () => {
        setIsEditProfileOpen(true);
    };

    const handleSaveProfile = (data: any) => {
        if (onProfileUpdate) {
            onProfileUpdate(data);
        }
        setIsEditProfileOpen(false);
    };

    const sections = [
        {
            title: 'Account',
            items: [
                { icon: User, label: 'Edit Profile', action: handleEditProfileClick },
                { icon: Key, label: 'Password and Security', action: handleSecurityClick },
                { icon: Bell, label: 'Notifications', action: handleNotificationsClick },
            ]
        },
        {
            title: 'Preferences',
            items: [

                { icon: Shield, label: 'Privacy', action: handlePrivacyClick },
            ]
        }
    ];

    return (
        <>
            <div className={styles.overlay} onClick={onClose}>
                <div className={styles.modal} onClick={e => e.stopPropagation()}>
                    <div className={styles.header}>
                        <div className={styles.title}>
                            <div className={styles.titleIconWrap}>
                                <Settings size={20} />
                            </div>
                            <h2>Settings</h2>
                        </div>
                        <button className={styles.closeBtn} onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>

                    <div style={{ paddingBottom: '16px' }}>
                        {sections.map((section, idx) => (
                            <div key={idx} className={styles.section}>
                                <h3 className={styles.sectionTitle}>{section.title}</h3>
                                {section.items.map((item, i) => (
                                    <button key={i} className={styles.menuItem} onClick={item.action}>
                                        <div className={styles.menuItemRow}>
                                            <div className={styles.iconWrap}>
                                                <item.icon size={18} />
                                            </div>
                                            <span>{item.label}</span>
                                        </div>
                                        <div className={styles.menuItemRow}>
                                            {(item as any).value && <span style={{ color: 'var(--foreground-muted)', fontSize: '13px' }}>{(item as any).value}</span>}
                                            <ChevronRight size={16} color="var(--foreground-muted)" />
                                        </div>
                                    </button>
                                ))}
                                {idx < sections.length - 1 && <div className={styles.separator} />}
                            </div>
                        ))}

                        <div className={styles.separator} />

                        <button className={`${styles.menuItem} ${styles.danger}`}>
                            <div className={styles.menuItemRow}>
                                <div className={styles.iconWrap}>
                                    <LogOut size={18} />
                                </div>
                                <span>Log Out</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <PrivacyModal
                isOpen={isPrivacyOpen}
                onClose={() => setIsPrivacyOpen(false)}
            />

            <NotificationSettingsModal
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
            />

            <SecurityModal
                isOpen={isSecurityOpen}
                onClose={() => setIsSecurityOpen(false)}
            />

            <EditProfileModal
                isOpen={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
                initialData={{
                    username: MOCK_USERS[0].username,
                    fullName: 'Aster Viewer',
                    bio: MOCK_USERS[0].bio || '',
                    avatar: MOCK_USERS[0].avatar
                }}
                onSave={handleSaveProfile}
            />
        </>
    );
};

export default SettingsModal;
