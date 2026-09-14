'use client';

import React, { useState, useEffect } from 'react';
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
    BarChart3,
    ShieldCheck,
    Users,
    Twitter, // Use as standard X/Twitter placeholder
    MessageCircle, // WhatsApp/SMS placeholder
    Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './monetization.module.css';
import { useToast } from '@/contexts/ToastContext';

const MonetizationPage = () => {
    // State for Modals & Tabs
    const [activeTab, setActiveTab] = useState<'revenue' | 'influencer'>('revenue');
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const { showToast } = useToast();

    // Influencer / Referral Data
    const [referralStats, setReferralStats] = useState({
        code: '',
        link: 'https://viewersocial.com/?ref=',
        totalClicks: 0,
        totalSignups: 0,
        pendingEarnings: '$0.00'
    });

    // Fetch Live Referral Stats from API
    useEffect(() => {
        const fetchReferrals = async () => {
            try {
                const res = await fetch('/api/referrals');
                const data = await res.json();

                if (data.success) {
                    setReferralStats({
                        code: data.referralCode || '',
                        link: `${window.location.origin}/?ref=${data.referralCode}`,
                        totalClicks: data.totalReferrals * 5, // Mock clicks if no sophisticated tracking, usually 1 signup : 5 clicks
                        totalSignups: data.totalReferrals,
                        pendingEarnings: `$${(data.pendingEarnings || 0).toFixed(2)}`
                    });
                }
            } catch (error) {
                console.error('Failed to fetch referral stats:', error);
            }
        };

        fetchReferrals();
    }, []);

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
        { id: 2, type: 'PayPal', email: 'user@example.com', icon: Wallet, isDefault: false }
    ]);

    // Mock data for tools
    const tools = [
        {
            id: 1,
            name: 'Ads on Shots',
            status: 'Active',
            icon: Video,
            color: '#E1306C',
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
        },
        {
            id: 4,
            name: 'Gifts',
            status: 'Locked',
            icon: Gift,
            color: '#C13584',
            earnings: '$0.00'
        }
    ];

    // Mock recent activity
    const activities = [
        { id: 1, title: 'Payout Processed', date: 'Jan 21, 2026', amount: '$2,100.00', status: 'Completed' },
        { id: 2, title: 'Shots Revenue', date: 'Jan 20, 2026', amount: '+$450.20', status: 'Earnings' },
        { id: 3, title: 'Subscription Revenue', date: 'Jan 19, 2026', amount: '+$120.00', status: 'Earnings' },
        { id: 4, title: 'Stars Received', date: 'Jan 18, 2026', amount: '+$15.50', status: 'Earnings' },
    ];

    const handleAddPayment = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate adding card
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

    const handleCopyLink = () => {
        navigator.clipboard.writeText(referralStats.link);
        showToast('Referral link copied to clipboard! 📋', 'success');
    };

    const shareToTwitter = () => {
        const text = encodeURIComponent(`Come check out my exclusive content on Viewer Social! Use my invite link to get started: ${referralStats.link}`);
        window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
    };

    const shareToWhatsApp = () => {
        const text = encodeURIComponent(`Join me on Viewer Social! Use my special invite link: ${referralStats.link}`);
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    };

    return (
        <div className={styles.container}>
            <div className="neural-grid" />

            <header className={styles.header}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={styles.titleContainer}
                >
                    <h1 className={styles.title}>Professional Dashboard</h1>
                    <div className={styles.premiumBadge}>
                        <ShieldCheck size={14} />
                        Professional Account
                    </div>
                </motion.div>
                <p className={styles.subtitle}>Unlock potential and manage your digital workspace.</p>
            </header>

            {/* Top Navigation Tabs */}
            <div className={styles.navTabs}>
                <button
                    className={`${styles.navTab} ${activeTab === 'revenue' ? styles.activeNavTab : ''}`}
                    onClick={() => setActiveTab('revenue')}
                >
                    <DollarSign size={18} /> Revenue
                </button>
                <button
                    className={`${styles.navTab} ${activeTab === 'influencer' ? styles.activeNavTab : ''}`}
                    onClick={() => setActiveTab('influencer')}
                >
                    <Users size={18} /> Influencer Hub
                </button>
            </div>

            {/* TAB: REVENUE (Original Monetization Content) */}
            {activeTab === 'revenue' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className={styles.overviewGrid}>
                        {/* Total Earnings Card */}
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
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
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className={styles.overviewCard}
                        >
                            <div className={styles.cardHeader}>
                                <div className={styles.cardIcon}>
                                    <ArrowUpRight size={24} />
                                </div>
                                <span className={styles.cardChange}>{earnings.trend}</span>
                            </div>
                            <div>
                                <div className={styles.cardLabel}>Monthly Growth</div>
                                <div className={styles.cardValue}>{earnings.lastMonth}</div>
                                <div className={styles.cardSubValue}>Payout on {earnings.payoutDate}</div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Payment Methods Section */}
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <Wallet size={20} />
                            Payment Methods
                        </h2>
                        <button className={styles.addBtn} onClick={() => setShowAddPayment(true)}>
                            <Plus size={16} /> Add Method
                        </button>
                    </div>

                    <div className={styles.paymentMethodsGrid}>
                        <AnimatePresence>
                            {paymentMethods.map((method, idx) => (
                                <motion.div
                                    key={method.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + (idx * 0.1) }}
                                    className={`${styles.paymentCard} ${method.isDefault ? styles.defaultCard : ''}`}
                                >
                                    <div className={styles.paymentIcon}>
                                        <method.icon size={24} />
                                    </div>
                                    <div className={styles.paymentInfo}>
                                        <div className={styles.paymentType}>{method.type}</div>
                                        <div className={styles.paymentDetail}>
                                            {method.type === 'PayPal' ? method.email : `**** **** **** ${method.last4}`}
                                        </div>
                                        {method.expiry && <div className={styles.paymentExpiry}>Expires {method.expiry}</div>}
                                    </div>
                                    {method.isDefault && <div className={styles.defaultBadge}>Primary</div>}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Monetization Tools */}
                    <h2 className={styles.sectionTitle} style={{ marginTop: '40px' }}>
                        <LayoutDashboard size={20} />
                        Your Cosmic Tools
                    </h2>
                    <div className={styles.toolsGrid}>
                        {tools.map((tool, idx) => (
                            <motion.div
                                key={tool.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + (idx * 0.1) }}
                                whileHover={{ scale: 0.98 }}
                                className={styles.toolCard}
                            >
                                <div className={styles.toolIcon} style={{ color: tool.color, background: `${tool.color}15` }}>
                                    <tool.icon size={24} />
                                </div>
                                <div className={styles.toolInfo}>
                                    <div className={styles.toolName}>{tool.name}</div>
                                    <div className={`${styles.toolStatus} ${tool.status === 'Active' ? styles.statusActive :
                                        tool.status === 'Eligible' ? styles.statusEligible :
                                            styles.statusLocked
                                        }`}>
                                        <span className={styles.statusDot}></span>
                                        {tool.status === 'Active' && 'Available • ' + tool.earnings}
                                        {tool.status === 'Eligible' && 'Ready to sync'}
                                        {tool.status === 'Locked' && 'Tier requirements not met'}
                                    </div>
                                </div>
                                <ChevronRight size={20} className={styles.toolArrow} />
                            </motion.div>
                        ))}
                    </div>

                    {/* Recent Activity */}
                    <h2 className={styles.sectionTitle}>
                        <TrendingUp size={20} />
                        Economic Pulse
                    </h2>
                    <div className={styles.activityList}>
                        {activities.map((activity, idx) => (
                            <motion.div
                                key={activity.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.6 + (idx * 0.05) }}
                                className={styles.activityItem}
                            >
                                <div className={styles.activityLeft}>
                                    <div className={styles.activityIcon}>
                                        {activity.status === 'Completed' ? <CheckCircle2 size={20} color="#4ade80" /> : <Clock size={20} />}
                                    </div>
                                    <div className={styles.activityDetails}>
                                        <div className={styles.activityTitle}>{activity.title}</div>
                                        <div className={styles.activityDate}>{activity.date}</div>
                                    </div>
                                </div>
                                <div className={`${styles.activityAmount} ${activity.status !== 'Completed' ? styles.pending : ''}`}>
                                    {activity.amount}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Add Payment Modal */}
                    {showAddPayment && (
                        <div className={styles.modalOverlay}>
                            <div className={styles.modal}>
                                <div className={styles.modalHeader}>
                                    <h3>Add Payment Method</h3>
                                    <button onClick={() => setShowAddPayment(false)} className={styles.closeBtn}><X size={20} /></button>
                                </div>
                                <form onSubmit={handleAddPayment} className={styles.modalForm}>
                                    <div className={styles.formGroup}>
                                        <label>Card Number</label>
                                        <input type="text" placeholder="0000 0000 0000 0000" className={styles.input} required />
                                    </div>
                                    <div className={styles.formRow}>
                                        <div className={styles.formGroup}>
                                            <label>Expiry Date</label>
                                            <input type="text" placeholder="MM/YY" className={styles.input} required />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>CVC</label>
                                            <input type="text" placeholder="123" className={styles.input} required />
                                        </div>
                                    </div>
                                    <button type="submit" className={styles.submitBtn}>Add Card</button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Withdraw Modal */}
                    {showWithdraw && (
                        <div className={styles.modalOverlay}>
                            <div className={styles.modal}>
                                <div className={styles.modalHeader}>
                                    <h3>Withdraw Funds</h3>
                                    <button onClick={() => setShowWithdraw(false)} className={styles.closeBtn}><X size={20} /></button>
                                </div>
                                <form onSubmit={handleWithdraw} className={styles.modalForm}>
                                    <div className={styles.balanceDisplay}>
                                        <span>Available Balance</span>
                                        <h2>${balance.toFixed(2)}</h2>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Amount to Withdraw</label>
                                        <div className={styles.inputWrapper}>
                                            <span className={styles.currencyPrefix}>$</span>
                                            <input
                                                type="number"
                                                value={withdrawAmount}
                                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                                placeholder="0.00"
                                                className={styles.input}
                                                required
                                                max={balance}
                                                min="1"
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Withdraw to</label>
                                        <select className={styles.select}>
                                            {paymentMethods.map(m => (
                                                <option key={m.id} value={m.id}>
                                                    {m.type} ends in {m.last4 || m.email?.split('@')[0]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button type="submit" className={styles.submitBtn} disabled={!withdrawAmount}>
                                        Confirm Withdrawal
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
};

export default MonetizationPage;
