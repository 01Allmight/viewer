import React, { useState } from 'react';
import { X, Bell } from 'lucide-react';
import styles from './NotificationSettingsModal.module.css';

interface NotificationSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({ isOpen, onClose }) => {
    const [pushNotifications, setPushNotifications] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [likesAndComments, setLikesAndComments] = useState(true);
    const [newFollowers, setNewFollowers] = useState(true);
    const [directMessages, setDirectMessages] = useState(true);
    const [liveVideos, setLiveVideos] = useState(false);
    const [reminders, setReminders] = useState(true);
    const [productAnnouncements, setProductAnnouncements] = useState(false);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.title}>
                        <Bell size={20} />
                        <h2>Notification Settings</h2>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Push Notifications</h3>
                        <div className={styles.settingItem}>
                            <div className={styles.settingInfo}>
                                <div className={styles.settingLabel}>Enable Push Notifications</div>
                                <div className={styles.settingDescription}>
                                    Receive notifications on this device
                                </div>
                            </div>
                            <div
                                className={`${styles.toggle} ${pushNotifications ? styles.active : ''}`}
                                onClick={() => setPushNotifications(!pushNotifications)}
                            >
                                <div className={styles.toggleKnob}></div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.separator} />

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Email Notifications</h3>
                        <div className={styles.settingItem}>
                            <div className={styles.settingInfo}>
                                <div className={styles.settingLabel}>Email Updates</div>
                                <div className={styles.settingDescription}>
                                    Receive email notifications about your account
                                </div>
                            </div>
                            <div
                                className={`${styles.toggle} ${emailNotifications ? styles.active : ''}`}
                                onClick={() => setEmailNotifications(!emailNotifications)}
                            >
                                <div className={styles.toggleKnob}></div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.separator} />

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Activity</h3>

                        <div className={styles.settingItem}>
                            <div className={styles.settingInfo}>
                                <div className={styles.settingLabel}>Likes and Comments</div>
                                <div className={styles.settingDescription}>
                                    When someone likes or comments on your posts
                                </div>
                            </div>
                            <div
                                className={`${styles.toggle} ${likesAndComments ? styles.active : ''}`}
                                onClick={() => setLikesAndComments(!likesAndComments)}
                            >
                                <div className={styles.toggleKnob}></div>
                            </div>
                        </div>

                        <div className={styles.settingItem}>
                            <div className={styles.settingInfo}>
                                <div className={styles.settingLabel}>New Followers</div>
                                <div className={styles.settingDescription}>
                                    When someone starts following you
                                </div>
                            </div>
                            <div
                                className={`${styles.toggle} ${newFollowers ? styles.active : ''}`}
                                onClick={() => setNewFollowers(!newFollowers)}
                            >
                                <div className={styles.toggleKnob}></div>
                            </div>
                        </div>

                        <div className={styles.settingItem}>
                            <div className={styles.settingInfo}>
                                <div className={styles.settingLabel}>Direct Messages</div>
                                <div className={styles.settingDescription}>
                                    When you receive a new message
                                </div>
                            </div>
                            <div
                                className={`${styles.toggle} ${directMessages ? styles.active : ''}`}
                                onClick={() => setDirectMessages(!directMessages)}
                            >
                                <div className={styles.toggleKnob}></div>
                            </div>
                        </div>

                        <div className={styles.settingItem}>
                            <div className={styles.settingInfo}>
                                <div className={styles.settingLabel}>Live Videos</div>
                                <div className={styles.settingDescription}>
                                    When accounts you follow go live
                                </div>
                            </div>
                            <div
                                className={`${styles.toggle} ${liveVideos ? styles.active : ''}`}
                                onClick={() => setLiveVideos(!liveVideos)}
                            >
                                <div className={styles.toggleKnob}></div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.separator} />

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Other</h3>

                        <div className={styles.settingItem}>
                            <div className={styles.settingInfo}>
                                <div className={styles.settingLabel}>Reminders</div>
                                <div className={styles.settingDescription}>
                                    Important reminders and updates
                                </div>
                            </div>
                            <div
                                className={`${styles.toggle} ${reminders ? styles.active : ''}`}
                                onClick={() => setReminders(!reminders)}
                            >
                                <div className={styles.toggleKnob}></div>
                            </div>
                        </div>

                        <div className={styles.settingItem}>
                            <div className={styles.settingInfo}>
                                <div className={styles.settingLabel}>Product Announcements</div>
                                <div className={styles.settingDescription}>
                                    New features and product updates
                                </div>
                            </div>
                            <div
                                className={`${styles.toggle} ${productAnnouncements ? styles.active : ''}`}
                                onClick={() => setProductAnnouncements(!productAnnouncements)}
                            >
                                <div className={styles.toggleKnob}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationSettingsModal;
