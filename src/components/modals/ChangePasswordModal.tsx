import React, { useState } from 'react';
import { X, Key, Eye, EyeOff, Check } from 'lucide-react';
import styles from './ChangePasswordModal.module.css';
import { useToast } from '@/contexts/ToastContext';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const { showToast } = useToast();

    if (!isOpen) return null;

    // Password requirements
    const hasMinLength = newPassword.length >= 8;
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!currentPassword) {
            setError('Please enter your current password');
            return;
        }

        if (!isPasswordValid) {
            setError('New password does not meet requirements');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        // In a real app, this would call an API
        console.log('Password change submitted');
        showToast('Password changed successfully! 🔒', 'success');
        onClose();

        // Reset form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.title}>
                        <Key size={20} />
                        <h2>Change Password</h2>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Current Password</label>
                        <div className={styles.inputWrapper}>
                            <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className={styles.input}
                                placeholder="Enter current password"
                            />
                            <button
                                type="button"
                                className={styles.togglePassword}
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>New Password</label>
                        <div className={styles.inputWrapper}>
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={styles.input}
                                placeholder="Enter new password"
                            />
                            <button
                                type="button"
                                className={styles.togglePassword}
                                onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {newPassword && (
                            <div className={styles.requirements}>
                                <div className={`${styles.requirement} ${hasMinLength ? styles.met : ''}`}>
                                    {hasMinLength ? <Check size={14} /> : '•'} At least 8 characters
                                </div>
                                <div className={`${styles.requirement} ${hasUpperCase ? styles.met : ''}`}>
                                    {hasUpperCase ? <Check size={14} /> : '•'} One uppercase letter
                                </div>
                                <div className={`${styles.requirement} ${hasLowerCase ? styles.met : ''}`}>
                                    {hasLowerCase ? <Check size={14} /> : '•'} One lowercase letter
                                </div>
                                <div className={`${styles.requirement} ${hasNumber ? styles.met : ''}`}>
                                    {hasNumber ? <Check size={14} /> : '•'} One number
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Confirm New Password</label>
                        <div className={styles.inputWrapper}>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`${styles.input} ${confirmPassword && newPassword !== confirmPassword ? styles.error : ''}`}
                                placeholder="Confirm new password"
                            />
                            <button
                                type="button"
                                className={styles.togglePassword}
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {confirmPassword && newPassword !== confirmPassword && (
                            <div className={styles.errorText}>Passwords do not match</div>
                        )}
                    </div>

                    {error && <div className={styles.errorText}>{error}</div>}

                    <div className={styles.footer}>
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={!isPasswordValid || newPassword !== confirmPassword}>
                            Change Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
