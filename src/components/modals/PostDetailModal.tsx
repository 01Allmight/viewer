'use client';

import React, { useEffect, useState } from 'react';
import { X, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Smile, Loader2 } from 'lucide-react';
import styles from './PostDetailModal.module.css';
import { Post } from '@/constants/mockData';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { addComment } from '@/app/actions';
import { isPusherConfigured, pusherClient } from '@/lib/pusher';
import { formatDistanceToNow } from 'date-fns';

interface CommentItem {
    id: string;
    text: string;
    createdAt: string;
    user: { username: string; avatar?: string | null };
}

interface PostDetailModalProps {
    post: Post;
    isOpen: boolean;
    onClose: () => void;
}

const PostDetailModal: React.FC<PostDetailModalProps> = ({ post, isOpen, onClose }) => {
    const [comment, setComment] = useState('');
    const [isLiked, setIsLiked] = useState(post.isLiked);
    const [likesCount, setLikesCount] = useState(post.likes);
    const [isSaved, setIsSaved] = useState(post.isSaved);
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const loadComments = async () => {
            setIsLoadingComments(true);
            try {
                const response = await fetch(`/api/posts/${post.id}/comments`);
                if (response.ok) setComments(await response.json());
            } finally {
                setIsLoadingComments(false);
            }
        };

        loadComments();
        if (!isPusherConfigured) return;

        const channelName = `post-${post.id}`;
        const channel = pusherClient.subscribe(channelName);
        const handleComment = (comment: CommentItem) => {
            setComments(prev => prev.some(item => item.id === comment.id) ? prev : [...prev, comment]);
        };
        channel.bind('new-comment', handleComment);

        return () => {
            channel.unbind('new-comment', handleComment);
            pusherClient.unsubscribe(channelName);
        };
    }, [isOpen, post.id]);

    if (!isOpen) return null;

    const handleLike = () => {
        setIsLiked(!isLiked);
        setLikesCount(prev => !isLiked ? prev + 1 : prev - 1);
    };

    const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim() || isSubmitting) return;
        const text = comment.trim();
        const optimisticId = `optimistic-${Date.now()}`;
        const optimisticComment: CommentItem = {
            id: optimisticId,
            text,
            createdAt: new Date().toISOString(),
            user: { username: 'You', avatar: undefined }
        };
        setComments(prev => [...prev, optimisticComment]);
        // In a real app, send to API
        setComment('');
        setIsSubmitting(true);
        try {
            await addComment(post.id, text);
            setComments(prev => prev.filter(item => item.id !== optimisticId));
        } catch (error) {
            setComments(prev => prev.filter(item => item.id !== optimisticId));
            console.error('Failed to post comment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <button className={styles.closeBtn} onClick={onClose}>
                <X size={32} />
            </button>

            <motion.div
                className={styles.modal}
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
                {/* Media Section */}
                <div className={styles.mediaSection} onDoubleClick={handleLike}>
                    <Image src={post.image || 'https://picsum.photos/seed/post/800'} alt={post.caption} className={styles.mainMedia} width={600} height={600} />
                </div>

                {/* Info Section */}
                <div className={styles.infoSection}>
                    <div className={styles.header}>
                        <div className={styles.userInfo}>
                            <Image src={post.user.avatar || 'https://i.pravatar.cc/150'} alt={post.user.username} className={styles.avatar} width={32} height={32} />
                            <span className={styles.username}>{post.user.username}</span>
                        </div>
                        <button className={styles.actionBtn}>
                            <MoreHorizontal size={20} />
                        </button>
                    </div>

                    <div className={styles.commentsSection}>
                        {/* Caption as first comment */}
                        <div className={styles.commentItem}>
                            <Image src={post.user.avatar || 'https://i.pravatar.cc/150'} alt={post.user.username} className={styles.avatar} width={32} height={32} />
                            <div className={styles.commentContent}>
                                <div className={styles.commentText}>
                                    <span className={styles.username}>{post.user.username}</span> {post.caption}
                                </div>
                                <div className={styles.commentMeta}>
                                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        {isLoadingComments && <Loader2 className="animate-spin" size={24} />}
                        {!isLoadingComments && comments.map(item => (
                            <div className={styles.commentItem} key={item.id}>
                                <Image src={item.user.avatar || 'https://i.pravatar.cc/150'} className={styles.avatar} alt={item.user.username} width={32} height={32} />
                                <div className={styles.commentContent}>
                                    <div className={styles.commentText}>
                                        <span className={styles.username}>{item.user.username}</span> {item.text}
                                    </div>
                                    <div className={styles.commentMeta}>
                                        <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                                        <span>Reply</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Actions Row */}
                    <div className={styles.actions}>
                        <div className={styles.actionRow}>
                            <div className={styles.leftActions}>
                                <button className={styles.actionBtn} onClick={handleLike}>
                                    <Heart size={24} fill={isLiked ? "#ed4956" : "none"} color={isLiked ? "#ed4956" : "currentColor"} />
                                </button>
                                <button className={styles.actionBtn}>
                                    <MessageCircle size={24} />
                                </button>
                                <button className={styles.actionBtn}>
                                    <Send size={24} />
                                </button>
                            </div>
                            <button className={styles.actionBtn} onClick={() => setIsSaved(!isSaved)}>
                                <Bookmark size={24} fill={isSaved ? "currentColor" : "none"} />
                            </button>
                        </div>
                        <div className={styles.likes}>
                            {likesCount.toLocaleString()} likes
                        </div>
                        <div className={styles.time}>
                            {new Date(post.createdAt).toDateString()}
                        </div>
                    </div>

                    {/* Input Section */}
                    <form className={styles.inputSection} onSubmit={handlePostComment}>
                        <Smile size={24} className={styles.emojiBtn} />
                        <input
                            type="text"
                            placeholder="Add a comment..."
                            className={styles.input}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />
                        <button
                            type="submit"
                            className={styles.postBtn}
                            disabled={!comment.trim() || isSubmitting}
                        >
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Post'}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default PostDetailModal;
