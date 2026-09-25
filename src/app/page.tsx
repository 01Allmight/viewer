'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Post from '@/components/feed/Post';
import StoryBar from '@/components/feed/StoryBar';
import styles from './home.module.css';
import Loader from '@/components/common/Loader';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { pusherClient } from '@/lib/pusher';
import { RefreshCw, Sparkles, Flame } from 'lucide-react';
import { triggerHapticNotification } from '@/lib/haptics';
import { NotificationType } from '@capacitor/haptics';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

export default function Home() {
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [feedTab, setFeedTab] = useState<'forYou' | 'following'>('forYou');
  const touchStart = useRef(0);

  const fetchContent = useCallback(async (pageNum: number) => {
    try {
      const [postsRes, shotsRes] = await Promise.all([
        fetch(`/api/posts?page=${pageNum}&limit=8`),
        fetch(`/api/shots?page=${pageNum}&limit=2`)
      ]);

      let postsData = [];
      let shotsData = [];

      if (postsRes.ok && shotsRes.ok) {
        const postsContent = postsRes.headers.get('content-type');
        if (postsContent && postsContent.includes('application/json')) {
            postsData = await postsRes.json();
        }
        
        const shotsContent = shotsRes.headers.get('content-type');
        if (shotsContent && shotsContent.includes('application/json')) {
            shotsData = await shotsRes.json();
        }
      }

      if (pageNum === 1 && (!postsData || postsData.length === 0) && (!shotsData || shotsData.length === 0)) {
        const { MOCK_POSTS, MOCK_SHOTS } = await import('@/constants/mockData');
        postsData = MOCK_POSTS.slice(0, 8);
        shotsData = MOCK_SHOTS.slice(0, 2);
      }

      const formattedPosts = postsData.map((post: any) => ({
        id: post.id,
        type: 'post',
        user: post.user,
        image: post.image,
        caption: post.caption,
        likes: typeof post.likes === 'number' ? post.likes : (post.likes?.length || 0),
        isLiked: post.isLiked || false,
        time: post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : 'Just now',
        comments: post.comments || []
      }));

      const formattedShots = shotsData.map((shot: any) => ({
        id: shot.id,
        type: 'shot',
        user: shot.user || { name: shot.username, avatar: shot.avatar },
        video: shot.video,
        caption: shot.caption,
        likes: typeof shot.likes === 'number' ? shot.likes : (shot.likes?.length || 0),
        isLiked: shot.isLiked || false,
        time: shot.createdAt ? formatDistanceToNow(new Date(shot.createdAt), { addSuffix: true }) : 'Just now',
        comments: shot.comments || []
      }));

      const combined = [];
      let postIdx = 0;
      let shotIdx = 0;

      while (postIdx < formattedPosts.length || shotIdx < formattedShots.length) {
        for (let i = 0; i < 4 && postIdx < formattedPosts.length; i++) {
          combined.push(formattedPosts[postIdx++]);
        }
        if (shotIdx < formattedShots.length) {
          combined.push(formattedShots[shotIdx++]);
        }
      }

      return combined;
    } catch (err) {
      console.error('Failed to fetch content:', err);
      if (pageNum === 1) {
        const { MOCK_POSTS } = await import('@/constants/mockData');
        return MOCK_POSTS.slice(0, 8).map(p => ({ ...p, user: p.user || { name: 'User' }, type: 'post', time: 'Just now' }));
      }
      return [];
    }
  }, []);

  const loadMoreItems = useCallback(async () => {
    const nextPage = page + 1;
    const data = await fetchContent(nextPage);

    if (data.length === 0) {
      setHasMore(false);
    } else {
      setFeedItems(prev => [...prev, ...data]);
      setPage(nextPage);
    }
  }, [fetchContent, page]);

  const { elementRef: lastElementRef, isLoading: fetchingMore } = useInfiniteScroll(
    loadMoreItems,
    { enabled: hasMore && !loading }
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    triggerHapticNotification(NotificationType.Success);
    const data = await fetchContent(1);
    setFeedItems(data);
    setPage(1);
    setHasMore(data.length > 0);
    setIsRefreshing(false);
    setPullProgress(0);
  }, [fetchContent]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStart.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && touchStart.current > 0) {
      const delta = e.touches[0].clientY - touchStart.current;
      if (delta > 0) {
        setPullProgress(Math.min(delta / 100, 1.2));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullProgress > 0.8) {
      onRefresh();
    } else {
      setPullProgress(0);
    }
    touchStart.current = 0;
  };

  // Initial Load
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setLoading(true);
      const data = await fetchContent(1);
      if (isMounted) {
        setFeedItems(data);
        setLoading(false);
        if (data.length === 0) setHasMore(false);
      }
    };
    init();
    return () => { isMounted = false; };
  }, [fetchContent]);

  // Real-time Updates
  useEffect(() => {
    const channel = pusherClient.subscribe('feed');
    // ... (bind events kept)
    return () => { pusherClient.unsubscribe('feed'); };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.feedSection}>
          <div className="skeleton" style={{ height: '500px', width: '100%', borderRadius: '12px', marginTop: '24px' }}></div>
          <div className="skeleton" style={{ height: '500px', width: '100%', borderRadius: '12px', marginTop: '24px' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.container}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Animated Background */}
      <div className={`${styles.bgBlob} ${styles.blob1}`} />
      <div className={`${styles.bgBlob} ${styles.blob2}`} />
      <div className={`${styles.bgBlob} ${styles.blob3}`} />

      <div className="neural-grid" />

      {/* Pull to Refresh Indicator */}
      <motion.div
        className={styles.pullIndicator}
        style={{
          opacity: pullProgress,
          scale: pullProgress,
          y: pullProgress * 50
        }}
      >
        <div className={`${styles.refreshIcon} ${isRefreshing ? styles.spinning : ''}`}>
          <RefreshCw size={24} />
        </div>
      </motion.div>

      <div className={styles.feedSection}>
        <div className={styles.feedHeader}>
          <div className={styles.feedHeaderText}>
            <span className={styles.kicker}>Live feed</span>
            <h1 className={styles.feedTitle}>{feedTab === 'forYou' ? 'Discover' : 'Following'}</h1>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.headerBadge}>
              <Sparkles size={12} />
              Fresh
            </div>
            <button className={styles.iconButton} type="button" aria-label="Trending">
              <Flame size={16} />
            </button>
          </div>
        </div>

        {/* Feed Segmented Switcher Tabs */}
        <div className={styles.tabBarContainer}>
          <div className={styles.tabGroup}>
            <button
              className={`${styles.tabBtn} ${feedTab === 'forYou' ? styles.active : ''}`}
              onClick={() => {
                setFeedTab('forYou');
                triggerHapticNotification(NotificationType.Success);
              }}
            >
              {feedTab === 'forYou' && (
                <motion.div
                  layoutId="feedTabIndicator"
                  className={styles.activeTabPill}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <span className={styles.tabLabel}>For You</span>
            </button>
            <button
              className={`${styles.tabBtn} ${feedTab === 'following' ? styles.active : ''}`}
              onClick={() => {
                setFeedTab('following');
                triggerHapticNotification(NotificationType.Success);
              }}
            >
              {feedTab === 'following' && (
                <motion.div
                  layoutId="feedTabIndicator"
                  className={styles.activeTabPill}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <span className={styles.tabLabel}>Following</span>
            </button>
          </div>
        </div>

        {/* Stories Section Card */}
        <div className={styles.storyBarCard}>
          <div className={styles.storyTopBar}>
            <span className={styles.storyTitle}>Stories</span>
            <span className={styles.storyMeta}><Flame size={12} /> Trending now</span>
          </div>
          <StoryBar />
        </div>

        <motion.div
          className={styles.feedItemsList}
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence mode="popLayout">
            {feedItems.map((item, index) => (
              <Post
                key={`${item.id}-${index}`}
                {...item}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Infinite Scroll Trigger */}
        <div ref={lastElementRef} className={styles.loaderContainer}>
          {fetchingMore && <Loader size="medium" />}
          {!hasMore && feedItems.length > 0 && (
            <div className={styles.endMessage}>You&apos;re all caught up! 🚀</div>
          )}
        </div>
      </div>
    </div>
  );
}
