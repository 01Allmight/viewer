import React, { useState } from 'react';
import {
    LayoutDashboard,
    DollarSign,
    TrendingUp,
    CreditCard,
    Gift,
    Star,
    Video,
    ChevronRight,
    Clock,
    CheckCircle2,
    Plus,
    Wallet,
    X,
    ArrowUpRight,
    BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './profile.module.css';
import { useToast } from '@/contexts/ToastContext';

const MonetizationTab = () => {
    // State for Modals
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const { showToast } = useToast();

    // Mock data for earnings
    const [balance, setBalance] = useState(12450.50);
    const earnings = {
        total: `$${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        lastMonth: '$2,340.20',
        payoutDate: 'Feb 21, 2026',
        trend: '+15.4%'
    };

    // Mock data for payment methods
    const [paymentMethods, setPaymentMethods] = useState([
        { id: 1, type: 'Visa', last4: '4242', expiry: '12/28', icon: CreditCard, isDefault: true },
        { id: 2, type: 'PayPal', email: 'user@viewer.app', icon: Wallet, isDefault: false }
    ]);

    // Mock data for tools
    const tools = [
        {
            id: 1,
            name: 'Ads on Shots',
            status: 'Active',
            icon: Video,
            color: '#0095f6',
            earnings: '$1,240.50'
        },
        {
            id: 2,
            name: 'Stars',
            status: 'Eligible',
            icon: Star,
            color: '#FCAF45',
            earnings: '$0.00'
        },
        {
            id: 3,
            name: 'Subscriptions',
            status: 'Active',
            icon: CreditCard,
            color: '#833AB4',
            earnings: '$850.00'
        }
    ];

    // Mock recent activity
    const activities = [
        { id: 1, title: 'Payout Processed', date: 'Jan 21, 2026', amount: '$2,100.00', status: 'Completed' },
        { id: 2, title: 'Shots Revenue', date: 'Jan 20, 2026', amount: '+$450.20', status: 'Earnings' },
        { id: 3, title: 'Subscription Revenue', date: 'Jan 19, 2026', amount: '+$120.00', status: 'Earnings' },
    ];

    const handleAddPayment = (e: React.FormEvent) => {
        e.preventDefault();
        const newCard = {
            id: Date.now(),
            type: 'Mastercard',
            last4: '8888',
            expiry: '09/29',
            icon: CreditCard,
            isDefault: false
        };
        setPaymentMethods([...paymentMethods, newCard]);
        setShowAddPayment(false);
    };

    const handleWithdraw = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(withdrawAmount);
        if (amount > 0 && amount <= balance) {
            setBalance(prev => prev - amount);
            setShowWithdraw(false);
            setWithdrawAmount('');
            showToast(`Withdrawal of $${amount} initiated successfully! 💸`, 'success');
        } else {
            showToast('Invalid amount or insufficient funds', 'error');
        }
    };

    return (
        <motion.div
            className={styles.professionalDashboard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
        >
            <div className={styles.overviewGrid}>
                {/* Total Earnings Card */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className={styles.overviewCard}
                >
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIcon}>
                            <DollarSign size={24} />
                        </div>
                        <button className={styles.withdrawBtn} onClick={() => setShowWithdraw(true)}>
                            Withdraw
                        </button>
                    </div>
                    <div>
                        <div className={styles.cardLabel}>Available Balance</div>
                        <div className={styles.cardValue}>{earnings.total}</div>
                    </div>
                    <div className={styles.cardVisual}>
                        <BarChart3 size={100} className={styles.visualIcon} />
                    </div>
                </motion.div>

                {/* Last Payout Card */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className={styles.overviewCard}
                >
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIcon}>
                            <ArrowUpRight size={24} />
                        </div>
                        <span className={styles.cardChange} style={{ color: '#10b981', fontWeight: 800 }}>{earnings.trend}</span>
                    </div>
                    <div>
                        <div className={styles.cardLabel}>Monthly Growth</div>
                        <div className={styles.cardValue}>{earnings.lastMonth}</div>
                        <div className={styles.cardSubValue} style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px', fontWeight: 600 }}>
                            Payout on {earnings.payoutDate}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Monetization Tools */}
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                    <LayoutDashboard size={20} color="#0095f6" />
                    Professional Tools
                </h2>
            </div>
            <div className={styles.toolsGrid}>
                {tools.map((tool, idx) => (
                    <motion.div
                        key={tool.id}
                        whileHover={{ scale: 1.03 }}
                        className={styles.toolCard}
                    >
                        <div className={styles.toolIcon} style={{ color: tool.color, background: `${tool.color}15` }}>
                            <tool.icon size={26} />
                        </div>
                        <div className={styles.toolInfo}>
                            <div className={styles.toolName}>{tool.name}</div>
                            <div className={styles.toolStatus}>
                                <span className={styles.statusDot} style={{ background: tool.status === 'Active' ? '#4ade80' : '#FCAF45' }}></span>
                                {tool.status === 'Active' ? `Active • ${tool.earnings}` : 'Eligible to setup'}
                            </div>
                        </div>
                        <ChevronRight size={20} style={{ marginLeft: 'auto', color: '#9ca3af' }} />
                    </motion.div>
                ))}
            </div>

            {/* Recent Activity */}
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                    <TrendingUp size={20} color="#0095f6" />
                    Economic Pulse
                </h2>
            </div>
            <div className={styles.activityList}>
                {activities.map((activity, idx) => (
                    <motion.div key={activity.id} className={styles.activityItem}>
                        <div className={styles.activityLeft}>
                            <div className={styles.activityIcon}>
                                {activity.status === 'Completed' ? <CheckCircle2 size={20} color="#4ade80" /> : <Clock size={20} color="#9ca3af" />}
                            </div>
                            <div>
                                <div className={styles.activityTitle}>{activity.title}</div>
                                <div className={styles.activityDate}>{activity.date}</div>
                            </div>
                        </div>
                        <div className={styles.activityAmount} style={{ color: activity.status === 'Completed' ? '#111827' : '#10b981' }}>
                            {activity.amount}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Withdraw Modal */}
            <AnimatePresence>
                {showWithdraw && (
                    <div className={styles.modalOverlay}>
                        <motion.div
                            className={styles.modal}
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        >
                            <div className={styles.modalHeader}>
                                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: 'var(--foreground)' }}>Withdraw Funds</h3>
                                <button onClick={() => setShowWithdraw(false)} className={styles.closeBtn} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={24} color="#6b7280" /></button>
                            </div>
                            <form onSubmit={handleWithdraw} className={styles.modalForm}>
                                <div className={styles.balanceDisplay}>
                                    <span style={{ color: '#6b7280', fontSize: '14px', fontWeight: 700 }}>Available Balance</span>
                                    <h2 style={{ fontSize: '36px', fontWeight: 900, margin: '4px 0 24px', letterSpacing: '-0.04em' }}>${balance.toFixed(2)}</h2>
                                </div>
                                <div className={styles.formGroup}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#6b7280', marginBottom: '8px' }}>Amount to Withdraw</label>
                                    <div className={styles.inputWrapper}>
                                        <span className={styles.currencyPrefix} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#111827' }}>$</span>
                                        <input
                                            type="number"
                                            value={withdrawAmount}
                                            onChange={(e) => setWithdrawAmount(e.target.value)}
                                            placeholder="0.00"
                                            className={styles.input}
                                            required
                                            max={balance}
                                            min="1"
                                            style={{ paddingLeft: '32px' }}
                                        />
                                    </div>
                                </div>
                                <div className={styles.formGroup} style={{ marginTop: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#6b7280', marginBottom: '8px' }}>Withdraw to</label>
                                    <select className={styles.select}>
                                        {paymentMethods.map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.type} ends in {m.last4 || m.email?.split('@')[0]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button type="submit" className={styles.submitBtn} disabled={!withdrawAmount} style={{ marginTop: '24px' }}>
                                    Confirm Withdrawal
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default MonetizationTab;
