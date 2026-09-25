'use client';

import React, { useState } from 'react';
import { updateUserSettings } from '@/app/actions';
import ThemeSwitcher from '@/components/common/ThemeSwitcher';
import { CheckCircle2, Globe2, Loader2, LockKeyhole, UserRound } from 'lucide-react';

import { User } from './page';

interface SettingsTabProps {
    user: User;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ user, setUser }) => {
    const [formData, setFormData] = useState({
        username: user.username || '',
        bio: user.bio || '',
        website: user.website || '',
        isPrivate: user.isPrivate || false,
        coverPhoto: user.coverPhoto || '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const isSuccess = message.includes('successfully');

    const handleCoverPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsLoading(true);
            const formData = new FormData();
            formData.append('file', file);
            const uploadResponse = await fetch('/api/uploads', { method: 'POST', body: formData });
            const uploadData = await uploadResponse.json();

            if (!uploadResponse.ok || !uploadData.publicUrl) {
                throw new Error('Cover photo upload failed.');
            }

            setFormData(prev => ({ ...prev, coverPhoto: uploadData.publicUrl }));
            setMessage('Cover photo uploaded. Save changes to publish it.');
        } catch (error) {
            setMessage((error as Error).message);
        } finally {
            setIsLoading(false);
            e.target.value = '';
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev) => ({ ...prev, [name]: checked }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        const res = await updateUserSettings({
            username: formData.username,
            bio: formData.bio,
            website: formData.website,
            isPrivate: formData.isPrivate,
            coverPhoto: formData.coverPhoto,
        });

        if (res.success && res.user) {
            setMessage('Profile updated successfully!');
            setUser({
                ...user,
                username: res.user.username,
                bio: res.user.bio,
                website: res.user.website,
                isPrivate: res.user.isPrivate,
                coverPhoto: res.user.coverPhoto,
            } as any);
        } else {
            setMessage(res.error || 'Failed to update profile.');
        }
        setIsLoading(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                    <p style={{ margin: 0, color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Account settings</p>
                    <h2 style={{ margin: '6px 0 4px', fontSize: '1.65rem', fontWeight: 800 }}>Make your space yours</h2>
                    <p style={{ margin: 0, color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>Update your public profile and control who can see it.</p>
                </div>
                {isSuccess && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '0.82rem', fontWeight: 700 }}>
                        <CheckCircle2 size={16} /> Saved
                    </span>
                )}
            </div>

            <ThemeSwitcher variant="inline" />
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--background-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'grid', placeItems: 'center', background: 'var(--secondary)', color: 'var(--primary)' }}>
                        <UserRound size={18} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Profile information</h3>
                        <p style={{ margin: '3px 0 0', color: 'var(--foreground-muted)', fontSize: '0.82rem' }}>This is what people see when they visit your profile.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)' }}>Cover photo</label>
                    <div
                        style={{
                            height: '120px',
                            borderRadius: '12px',
                            background: formData.coverPhoto ? `url(${formData.coverPhoto}) center / cover` : 'linear-gradient(120deg, #0f766e, #0ea5e9, #f59e0b)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                        onClick={() => document.getElementById('settings-cover-photo')?.click()}
                    >
                        {formData.coverPhoto ? 'Change cover photo' : 'Add cover photo'}
                    </div>
                    <input id="settings-cover-photo" type="file" accept="image/*" hidden onChange={handleCoverPhotoChange} />
                </div>
                
                {message && (
                    <div style={{ padding: '11px 12px', borderRadius: '8px', background: isSuccess ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: isSuccess ? 'var(--success)' : 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>
                        {message}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)' }}>Username</label>
                    <input 
                        type="text" 
                        name="username" 
                        value={formData.username} 
                        onChange={handleChange} 
                        style={{ padding: '12px', borderRadius: '8px', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)' }}>Bio</label>
                    <textarea 
                        name="bio" 
                        value={formData.bio} 
                        onChange={handleChange} 
                        rows={4}
                        style={{ padding: '12px', borderRadius: '8px', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)', resize: 'vertical' }}
                    />
                    <span style={{ alignSelf: 'flex-end', color: 'var(--foreground-muted)', fontSize: '0.75rem' }}>{formData.bio.length}/160</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)' }}>Website</label>
                    <input 
                        type="url" 
                        name="website" 
                        value={formData.website} 
                        onChange={handleChange} 
                        style={{ padding: '12px', borderRadius: '8px', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '13px', borderRadius: '10px', background: 'var(--secondary)', border: '1px solid var(--border)' }}>
                    <input 
                        type="checkbox" 
                        name="isPrivate" 
                        checked={formData.isPrivate} 
                        onChange={handleChange} 
                        id="isPrivate"
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <LockKeyhole size={17} style={{ color: 'var(--primary)', marginTop: '1px', flexShrink: 0 }} />
                    <label htmlFor="isPrivate" style={{ cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>Private account <span style={{ display: 'block', marginTop: '3px', color: 'var(--foreground-muted)', fontSize: '0.78rem', fontWeight: 400 }}>Only approved followers can view your posts and shots.</span></label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--foreground-muted)', fontSize: '0.78rem' }}>
                    <Globe2 size={15} /> Your website will be shown on your public profile.
                </div>

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="btn-primary"
                    style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '8px' }}
                >
                    {isLoading && <Loader2 size={18} className="spin" />}
                    Save Changes
                </button>
            </form>
        </div>
    );
};

export default SettingsTab;
