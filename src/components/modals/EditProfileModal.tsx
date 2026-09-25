import React, { useState } from 'react';
import { X, Camera, Globe, ShieldCheck } from 'lucide-react';
import styles from './EditProfileModal.module.css';
import Image from 'next/image';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: {
        username: string;
        fullName: string;
        bio: string;
        avatar: string;
        coverPhoto?: string | null;
        website?: string;
        category?: string;
        isPrivate?: boolean;
    };
    onSave: (data: any) => void;
}

const CATEGORIES = [
    'None',
    'Artist',
    'Blogger',
    'Digital Creator',
    'Education',
    'Entrepreneur',
    'Health/Beauty',
    'Editor',
    'Writer',
    'Personal Blog'
];

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, initialData, onSave }) => {
    const [formData, setFormData] = useState({
        ...initialData,
        website: initialData.website || '',
        category: initialData.category || 'Digital Creator',
        isPrivate: initialData.isPrivate || false
    });
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const uploadAvatar = async (file: File) => {
        const contentType = file.type || 'image/jpeg';

        try {
            setIsUploadingAvatar(true);

            const presignResponse = await fetch('/api/uploads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: file.name, contentType })
            });

            if (presignResponse.ok) {
                const presignData = await presignResponse.json();

                if (presignData.uploadUrl && presignData.publicUrl) {
                    const uploadResponse = await fetch(presignData.uploadUrl, {
                        method: 'PUT',
                        headers: { 'Content-Type': contentType },
                        body: file
                    });

                    if (uploadResponse.ok) {
                        return presignData.publicUrl;
                    }
                }
            }

            const formData = new FormData();
            formData.append('file', file);

            const fallbackResponse = await fetch('/api/uploads', {
                method: 'POST',
                body: formData
            });

            if (!fallbackResponse.ok) {
                throw new Error('Profile image upload failed.');
            }

            const fallbackData = await fallbackResponse.json();
            if (!fallbackData.publicUrl) {
                throw new Error('No profile image URL returned from storage.');
            }

            return fallbackData.publicUrl;
        } catch (error) {
            console.error('Avatar upload error:', error);
            throw error;
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

        setFormData(prev => ({
            ...prev,
            [name]: val
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const uploadedUrl = await uploadAvatar(file);
            setFormData(prev => ({ ...prev, avatar: uploadedUrl }));
        } catch (error) {
            console.error('Failed to change profile picture', error);
            alert('Profile picture upload failed. Please try another image.');
        } finally {
            event.target.value = '';
        }
    };

    const handleCoverPhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const uploadedUrl = await uploadAvatar(file);
            setFormData(prev => ({ ...prev, coverPhoto: uploadedUrl }));
        } catch (error) {
            console.error('Failed to change cover photo', error);
            alert('Cover photo upload failed. Please try another image.');
        } finally {
            event.target.value = '';
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Edit Profile</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
                    <div className={styles.scrollArea}>
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.sectionTitle}>Profile Cover</span>
                            </div>
                            <div
                                onClick={() => document.getElementById('cover-photo-input')?.click()}
                                style={{
                                    height: 120,
                                    borderRadius: 16,
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    background: formData.coverPhoto ? `url(${formData.coverPhoto}) center / cover` : 'linear-gradient(120deg, #0f766e, #0ea5e9, #f59e0b)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontWeight: 700
                                }}
                            >
                                <span>{formData.coverPhoto ? 'Change cover photo' : 'Add cover photo'}</span>
                            </div>
                            <input
                                id="cover-photo-input"
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={handleCoverPhotoChange}
                            />
                        </div>

                        {/* Avatar Section */}
                        <div className={styles.avatarSection}>
                            <div className={styles.avatarContainer} onClick={() => document.getElementById('avatar-input')?.click()}>
                                <Image src={formData.avatar || 'https://i.pravatar.cc/150'} alt="Avatar" className={styles.avatar} width={120} height={120} />
                                <div className={styles.avatarOverlay}>
                                    {isUploadingAvatar ? <span style={{ fontSize: 12, fontWeight: 700 }}>UP</span> : <Camera size={32} />}
                                </div>
                            </div>
                            <span className={styles.changePhotoText} onClick={() => document.getElementById('avatar-input')?.click()}>
                                {isUploadingAvatar ? 'Uploading picture...' : 'Change Profile Vision'}
                            </span>
                            <input
                                id="avatar-input"
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={handleAvatarChange}
                            />
                        </div>

                        {/* Personal Info Section */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.sectionTitle}>Profile Info</span>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Name</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className={styles.input}
                                    placeholder="Full Name"
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Username</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className={styles.input}
                                    placeholder="Username"
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Website</label>
                                <div style={{ position: 'relative' }}>
                                    <Globe size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-muted)' }} />
                                    <input
                                        type="text"
                                        name="website"
                                        value={formData.website}
                                        onChange={handleChange}
                                        className={styles.input}
                                        style={{ paddingLeft: '38px' }}
                                        placeholder="https://example.com"
                                    />
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Bio</label>
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleChange}
                                    className={styles.textarea}
                                    placeholder="Write a bio..."
                                    maxLength={150}
                                />
                            </div>
                        </div>

                        {/* Professional Section */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.sectionTitle}>Professional Tools</span>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Category</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className={styles.select}
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Advanced/Privacy Section */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.sectionTitle}>Privacy & Safety</span>
                            </div>

                            <div className={styles.toggleItem}>
                                <div className={styles.toggleInfo}>
                                    <span className={styles.toggleTitle}>Private Account</span>
                                    <span className={styles.toggleDescription}>When your account is private, only people you approve can see your photos and videos.</span>
                                </div>
                                <label className={styles.switch}>
                                    <input
                                        type="checkbox"
                                        name="isPrivate"
                                        checked={formData.isPrivate}
                                        onChange={handleChange}
                                    />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>

                            <div className={styles.toggleItem}>
                                <div className={styles.toggleInfo}>
                                    <span className={styles.toggleTitle}>Show Verification Badge</span>
                                    <span className={styles.toggleDescription}>Display a silver or gold checkmark based on your influence score.</span>
                                </div>
                                <ShieldCheck size={24} color="var(--primary)" />
                            </div>
                        </div>
                    </div>

                    <div className={styles.footer}>
                        <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
                        <button type="submit" className={styles.saveBtn}>Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProfileModal;
