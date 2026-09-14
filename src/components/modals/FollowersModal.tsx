import React from 'react';
import styles from './FollowersModal.module.css';
import { X } from 'lucide-react';
import Image from 'next/image';

interface Follower {
    id: string;
    username: string;
    avatar?: string;
    fullName?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    items?: Follower[];
}

const FollowersModal: React.FC<Props> = ({ isOpen, onClose, title = 'Followers', items = [] }) => {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                <div className={styles.header}>
                    <div className={styles.title}>
                        <h2>{title}</h2>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.content}>
                    {items.length === 0 ? (
                        <div style={{ padding: 20 }}>No items</div>
                    ) : (
                        items.map(i => (
                            <div key={i.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0' }}>
                                <Image src={i.avatar || `https://i.pravatar.cc/48?u=${i.username}`} alt={i.username} width={44} height={44} style={{ borderRadius: 8 }} />
                                <div>
                                    <div style={{ fontWeight: 600 }}>{i.username}</div>
                                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{i.fullName}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default FollowersModal;
