'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
    Settings, Grid, Bookmark, UserSquare2, BadgeCheck,
    LayoutDashboard, Clapperboard, Heart, MessageCircle,
    AlertCircle, Plus, Globe, Tag, SquareStack,
    Lock, Bell, Shield, Key, LogOut, Check, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './profile.module.css';
import { useRouter, useSearchParams } from 'next/navigation';
import SavedTab from './SavedTab';
import MonetizationTab from './MonetizationTab';
import Image from 'next/image';
import SettingsTab from './SettingsTab';

import { useAuth } from '../../contexts/AuthContext';
import Loader from '../../components/common/Loader';
import Footer from '../../components/layout/Footer';
import PostDetailModal from '../../components/modals/PostDetailModal';
import FollowersModal from '../../components/modals/FollowersModal';
import { MOCK_POSTS, MOCK_USERS } from '@/constants/mockData';

// Local interfaces for ProfilePage to ensure types are available
export interface User {
    id: string;
    username: string;
    avatar: string;
    coverPhoto?: string | null;
    bio?: string | null;
    followers: number;
    following: number;
    website?: string;
    category?: string;
    isPrivate: boolean;
    posts: Post[];
    shots: any[];
}

export interface Post {
    id: string;
    image: string;
    likes: number;
    comments: number;
    userId: string;
    caption: string;
    createdAt: Date;
    isLiked: boolean;
    isSaved: boolean;
    user: {
        id: string;
        username: string;
        name: string;
        avatar: string;
    };
}

const getPreviewProfile = (): { user: User; posts: Post[] } => {
    const previewUser = MOCK_USERS[0];
    const previewPosts = MOCK_POSTS.slice(0, 6).map(post => ({
        id: post.id,
        image: post.image,
        likes: post.likes,
        comments: post.comments,
        userId: previewUser.id,
        caption: post.caption,
        createdAt: post.createdAt,
        isLiked: post.isLiked,
        isSaved: post.isSaved,
        user: {
            id: previewUser.id,
            username: previewUser.username,
            name: previewUser.name,
            avatar: previewUser.avatar
        }
    }));

    return {
        user: {
            id: previewUser.id,
            username: previewUser.username,
            avatar: previewUser.avatar,
            bio: previewUser.bio || null,
            followers: previewUser.followers || 0,
            following: 0,
            website: previewUser.website || '',
            category: previewUser.category || 'Digital Creator',
            isPrivate: false,
            posts: previewPosts,
            shots: []
        },
        posts: previewPosts
    };
};

const ProfilePage = () => {
    const { user: authUser, isLoading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<'posts' | 'shots' | 'saved' | 'tagged' | 'monetization' | 'settings'>('posts');
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [connectionModal, setConnectionModal] = useState<'followers' | 'following' | null>(null);
    const [connectionItems, setConnectionItems] = useState<any[]>([]);
    const [isLoadingConnections, setIsLoadingConnections] = useState(false);

    const searchParams = useSearchParams();

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'settings') {
            setActiveTab('settings');
        }
    }, [searchParams]);

    const [user, setUser] = useState<User | null>(null);
    const [postsState, setPostsState] = useState<Post[]>([]);

    const router = useRouter();

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!authUser) return;

            try {
                setLoading(true);
                // Fetch posts independently using the authUser id
                let myPosts: any[] = [];
                try {
                    const postsRes = await fetch('/api/posts?limit=100');
                    if (postsRes.ok) {
                        const allPosts = await postsRes.json();
                        myPosts = Array.isArray(allPosts)
                            ? allPosts.filter((p: any) => p.userId === authUser.id)
                            : [];
                    }
                } catch {
                    // Posts failed silently — profile still loads
                }

                const formattedPosts = myPosts.map((post: any) => ({
                    id: post.id,
                    image: post.image,
                    likes: post.likes ? post.likes.length : 0,
                    comments: post.comments ? post.comments.length : 0,
                    userId: post.userId || '',
                    caption: post.caption || '',
                    createdAt: post.createdAt ? new Date(post.createdAt) : new Date(0),
                    isLiked: false,
                    isSaved: false,
                    user: {
                        id: post.user?.id || '',
                        username: post.user?.username || authUser.username,
                        name: post.user?.name || '',
                        avatar: post.user?.avatar || authUser.avatar
                    }
                }));

                setUser({
                    id: authUser.id,
                    username: authUser.username,
                    avatar: authUser.avatar,
                    coverPhoto: authUser.coverPhoto,
                    bio: (authUser as any).bio || null, // bio might be in authUser if we expanded it
                    followers: (authUser as any)._count?.followedBy || 0,
                    following: (authUser as any)._count?.following || 0,
                    website: (authUser as any).website || '',
                    category: (authUser as any).category || 'Digital Creator',
                    isPrivate: false,
                    posts: formattedPosts,
                    shots: [],
                } as unknown as User);

                setPostsState(formattedPosts);
            } catch (err) {
                console.warn('Profile data fetch error:', err);
                const preview = getPreviewProfile();
                setUser(preview.user);
                setPostsState(preview.posts);
            } finally {
                setLoading(false);
            }
        };

        if (authUser) {
            fetchProfileData();
        } else if (!authLoading) {
            const preview = getPreviewProfile();
            setUser(preview.user);
            setPostsState(preview.posts);
            setLoading(false);
        }
    }, [authUser, authLoading]);

    const handleEditProfile = () => {
        setActiveTab('settings');
    };

    const openConnections = async (type: 'followers' | 'following') => {
        setConnectionModal(type);
        setIsLoadingConnections(true);
        try {
            const response = await fetch(`/api/users/me/${type}`);
            if (response.ok) {
                const items = await response.json();
                setConnectionItems(items);
                setUser(previous => previous ? {
                    ...previous,
                    followers: type === 'followers' ? items.length : previous.followers,
                    following: type === 'following' ? items.length : previous.following
                } : previous);
            } else {
                setConnectionItems([]);
            }
        } catch (error) {
            console.error(`Failed to load ${type}:`, error);
            setConnectionItems([]);
        } finally {
            setIsLoadingConnections(false);
        }
    };


    const formatFollowers = (count: number) => {
        if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
        if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
        return count.toString();
    };

    const getVerificationBadge = (followers: number) => {
        if (followers >= 1000000) return <BadgeCheck size={32} className={styles.blueTick} />;
        return null;
    };

    // Non-blocking: error is just logged; page still renders

    if (loading) {
        return (
            <div className="container" style={{ maxWidth: '1000px', padding: '100px 16px', display: 'flex', justifyContent: 'center' }}>
                <Loader size="large" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="container" style={{ maxWidth: '600px', padding: '120px 16px', textAlign: 'center' }}>
                <div className={styles.emptyTabState}>
                    <UserSquare2 size={80} strokeWidth={1} color="var(--foreground-muted)" />
                    <h3 style={{ marginTop: '24px' }}>Sign in to view your profile</h3>
                    <p style={{ marginTop: '12px', color: 'var(--foreground-muted)' }}>You need to be logged in to access this page.</p>
                    <button
                        className={styles.editButton}
                        style={{ marginTop: '32px' }}
                        onClick={() => router.push('/')}
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: '1200px', paddingTop: '40px' }}>
            <div className="neural-grid" />

            <motion.div
                className={styles.profile}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
            >
                {/* Premium Cover Photo / Profile Header */}
                <motion.div
                    className={styles.header}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className={styles.coverPhoto}>
                        <div
                            className={styles.coverGradient}
                            style={user.coverPhoto ? { backgroundImage: `url(${user.coverPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                        />
                        <div className={styles.neuralGridOverlay} />
                    </div>

                    <div className={styles.headerContent}>
                        <div className={styles.avatarSection}>
                            <motion.div
                                className={styles.avatarRing}
                                whileHover={{ scale: 1.05, rotate: 5 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                            >
                                <Image
                                    src={user.avatar || 'https://ui-avatars.com/api/?name=' + user.username}
                                    alt={user.username}
                                    className={styles.avatar}
                                    width={160}
                                    height={160}
                                />
                            </motion.div>
                        </div>

                        <div className={styles.infoSection}>
                            <div className={styles.topRow}>
                                <h2 className={styles.username}>{user.username}</h2>
                                {getVerificationBadge(user.followers)}

                                <div className={styles.actionButtons}>
                                    <button className={styles.editButton} onClick={handleEditProfile}>Edit Profile</button>
                                    <button className={styles.archiveBtn} onClick={() => setIsArchiveOpen(true)}>Archive</button>
                                    <button className={styles.settingsBtn} onClick={() => setActiveTab('settings')}><Settings size={22} /></button>
                                </div>
                            </div>

                            <div className={styles.statsRow}>
                                <div className={styles.statItem}>
                                    <span className={styles.statNumber}>{user.posts.length}</span>
                                    <span className={styles.statLabel}>Visions</span>
                                </div>
                                <button className={styles.statItem} onClick={() => openConnections('followers')} type="button">
                                    <span className={styles.statNumber}>{formatFollowers(user.followers)}</span>
                                    <span className={styles.statLabel}>Followers</span>
                                </button>
                                <button className={styles.statItem} onClick={() => openConnections('following')} type="button">
                                    <span className={styles.statNumber}>{user.following}</span>
                                    <span className={styles.statLabel}>Following</span>
                                </button>
                            </div>

                            <div className={styles.bioSection}>
                                {user.category && user.category !== 'None' && <span className={styles.categoryLabel}>{user.category}</span>}
                                <div className={styles.bioText}>
                                    {user.bio || "No bio yet. Share your vision with the world."}
                                    {user.website && (
                                        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Globe size={18} color="#0095f6" />
                                            <a href={`https://${user.website}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0095f6', fontWeight: 700, textDecoration: 'none' }}>{user.website}</a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Highlights */}
                <div className={styles.highlightsSection}>
                    {[
                        { id: 1, name: 'Visions', img: 'https://picsum.photos/seed/v/200' },
                        { id: 2, name: 'Spaces', img: 'https://picsum.photos/seed/s/200' },
                        { id: 3, name: 'Studio', img: 'https://picsum.photos/seed/st/200' },
                    ].map((item, idx) => (
                        <motion.div
                            key={item.id}
                            className={styles.highlightItem}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 + idx * 0.1 }}
                        >
                            <div className={styles.highlightCircle}>
                                <Image src={item.img} alt={item.name} className={styles.highlightImg} width={90} height={90} />
                            </div>
                            <span className={styles.highlightName}>{item.name}</span>
                        </motion.div>
                    ))}
                    <div className={styles.highlightItem}>
                        <div className={styles.highlightCircle} style={{ background: 'rgba(0,149,246,0.05)', border: '2px dashed #0095f6' }}>
                            <Plus size={32} color="#0095f6" strokeWidth={1.5} />
                        </div>
                        <span className={styles.highlightName} style={{ color: '#0095f6' }}>New</span>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className={styles.tabs}>
                    <button className={`${styles.tab} ${activeTab === 'posts' ? styles.activeTab : ''}`} onClick={() => setActiveTab('posts')}>
                        <Grid size={18} /> <span>VISIONS</span>
                    </button>
                    <button className={`${styles.tab} ${activeTab === 'shots' ? styles.activeTab : ''}`} onClick={() => setActiveTab('shots')}>
                        <Clapperboard size={18} /> <span>SHOTS</span>
                    </button>
                    <button className={`${styles.tab} ${activeTab === 'saved' ? styles.activeTab : ''}`} onClick={() => setActiveTab('saved')}>
                        <Bookmark size={18} /> <span>SAVED</span>
                    </button>
                    <button className={`${styles.tab} ${activeTab === 'tagged' ? styles.activeTab : ''}`} onClick={() => setActiveTab('tagged')}>
                        <SquareStack size={18} /> <span>TAGGED</span>
                    </button>
                    <button className={`${styles.tab} ${activeTab === 'monetization' ? styles.activeTab : ''}`} onClick={() => setActiveTab('monetization')}>
                        <LayoutDashboard size={18} /> <span>DASHBOARD</span>
                    </button>
                    <button className={`${styles.tab} ${activeTab === 'settings' ? styles.activeTab : ''}`} onClick={() => setActiveTab('settings')}>
                        <Settings size={18} /> <span>SETTINGS</span>
                    </button>
                </div>

                {/* Grid Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                    >
                        {activeTab === 'posts' && (
                            <div className={styles.grid}>
                                {postsState.length > 0 ? postsState.map((post) => (
                                    <motion.div
                                        key={post.id}
                                        className={styles.gridItem}
                                        whileHover={{ y: -5 }}
                                        onClick={() => setSelectedPost(post)}
                                    >
                                        <Image src={post.image || 'https://picsum.photos/seed/post/800'} alt="" className={styles.gridImage} width={400} height={400} />
                                        <div className={styles.overlay}>
                                            <div className={styles.overlayStats}>
                                                <div className={styles.statNumberOverlay}><Heart size={24} fill="white" /> {post.likes}</div>
                                                <div className={styles.statNumberOverlay}><MessageCircle size={24} fill="white" /> {post.comments}</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )) : (
                                    <div className={styles.emptyTabState}>
                                        <Grid size={80} strokeWidth={1} />
                                        <h3>No Visions Yet</h3>
                                        <p>Start sharing your creative journey with the world.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'shots' && (
                            <div className={styles.emptyTabState}>
                                <Clapperboard size={80} strokeWidth={1} />
                                <h3>No Shots Captured</h3>
                                <p>Vertical cinematics you post will appear in this space.</p>
                            </div>
                        )}

                        {activeTab === 'saved' && <SavedTab />}

                        {activeTab === 'tagged' && (
                            <div className={styles.emptyTabState}>
                                <Tag size={80} strokeWidth={1} />
                                <h3>No Connections Found</h3>
                                <p>Visions you are mentioned in will reside here.</p>
                            </div>
                        )}

                        {activeTab === 'monetization' && <MonetizationTab />}

                        {activeTab === 'settings' && <SettingsTab user={user} setUser={setUser} />}
                    </motion.div>
                </AnimatePresence>

                <div style={{ marginTop: '80px', opacity: 0.6 }}>
                    <Footer />
                </div>
            </motion.div>

            {/* Post Detail */}
            {selectedPost && (
                <PostDetailModal
                    post={selectedPost}
                    isOpen={!!selectedPost}
                    onClose={() => setSelectedPost(null)}
                />
            )}

            <FollowersModal
                isOpen={connectionModal !== null}
                onClose={() => setConnectionModal(null)}
                title={connectionModal === 'following' ? 'Following' : 'Followers'}
                items={isLoadingConnections ? [] : connectionItems}
            />
        </div>
    );
};

export default ProfilePage;

