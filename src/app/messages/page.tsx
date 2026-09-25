'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Search,
    Phone,
    Video,
    Info,
    Smile,
    Image as LucideImage,
    Mic,
    Send,
    Edit,
    ChevronLeft,
    Play,
    Pause,
    Trash2,
    Reply,
    X,
    CheckCheck,
    MicOff,
    VideoOff,
    PhoneOff,
    Plus,
    Download,
    ZoomIn,
    ZoomOut,
    RotateCw,
    Heart,
    Sparkles,
    UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import styles from './messages.module.css';
import Image from 'next/image';
import {
    getConversations,
    getMessages,
    sendMessage,
    startConversation,
    broadcastTyping,
    broadcastReaction,
    deleteMessage
} from '@/app/actions';
import { chatChannel, isPusherConfigured, pusherClient, userConversationChannel } from '@/lib/pusher';

const QUICK_EMOJIS = ['❤️', '🔥', '😂', '😮', '😢', '👏', '🎉', '🙌'];
const EMOJI_DRAWER = [
    '😀', '😂', '🥰', '😍', '😎', '🤩', '🥳', '🤔',
    '🔥', '✨', '💖', '❤️', '💯', '👏', '🙌', '👍',
    '🚀', '🎉', '⚡', '☕', '💡', '🌈', '🍕', '👋'
];

interface MessageItem {
    id: string;
    content: string;
    createdAt: string | Date;
    senderId: string;
    sender?: {
        id: string;
        username: string;
        avatar?: string | null;
    };
    reactions?: Record<string, number>;
    userReactions?: string[];
}

const MessagesPage = () => {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
    const [messageText, setMessageText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [messages, setMessages] = useState<MessageItem[]>([]);
    const [conversations, setConversations] = useState<any[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    
    // Replying state
    const [replyingTo, setReplyingTo] = useState<{ id: string; username: string; text: string } | null>(null);
    const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
    
    // Emoji Drawers & Reaction pickers
    const [showEmojiDrawer, setShowEmojiDrawer] = useState(false);
    const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
    
    // Heart burst animation (messageId -> boolean)
    const [heartBurstId, setHeartBurstId] = useState<string | null>(null);

    // Drag and Drop
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    
    // Voice Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [liveAudioLevels, setLiveAudioLevels] = useState<number[]>([6, 12, 18, 10, 16, 22, 14, 8]);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number | null>(null);

    // Audio Playback state
    const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
    const [audioProgress, setAudioProgress] = useState<Record<string, { current: number; duration: number }>>({});
    const [audioSpeeds, setAudioSpeeds] = useState<Record<string, number>>({});
    const activeAudioElementRef = useRef<HTMLAudioElement | null>(null);

    // Lightbox state
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [lightboxZoom, setLightboxZoom] = useState(1);
    const [lightboxRotation, setLightboxRotation] = useState(0);

    // Call Modal state
    const [callModal, setCallModal] = useState<{ active: boolean; type: 'audio' | 'video'; duration: number } | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const callTimerRef = useRef<NodeJS.Timeout | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageElementsRef = useRef<Record<string, HTMLDivElement | null>>({});
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initial Load: Current user & conversations
    useEffect(() => {
        const init = async () => {
            try {
                const [userRes, convs] = await Promise.all([
                    fetch('/api/users/me').then(r => r.json()),
                    getConversations()
                ]);
                setCurrentUser(userRes);
                setConversations(convs);
            } catch (err) {
                console.error('Initialization failed', err);
            }
        };
        init();
    }, []);

    // Fetch Messages when conversation changes
    useEffect(() => {
        if (!selectedConversation) return;

        const fetchMsgs = async () => {
            try {
                const msgs = await getMessages(selectedConversation);
                setMessages(msgs);
            } catch (err) {
                console.error('Failed to fetch messages', err);
            }
        };
        fetchMsgs();

        // Subscribe to Pusher channel for this chat
        if (!isPusherConfigured) return;

        const channelName = chatChannel(selectedConversation);
        const channel = pusherClient.subscribe(channelName);

        channel.bind('new-message', (message: MessageItem) => {
            setMessages(prev => {
                if (prev.some(m => m.id === message.id)) return prev;
                return [...prev, message];
            });
        });

        channel.bind('typing-status', (data: { userId: string; username: string; isTyping: boolean }) => {
            if (data.userId !== currentUser?.id) {
                setIsTyping(data.isTyping);
                setTypingUser(data.isTyping ? data.username : null);
            }
        });

        channel.bind('message-reaction', (data: { messageId: string; userId: string; username: string; emoji: string }) => {
            setMessages(prev =>
                prev.map(m => {
                    if (m.id !== data.messageId) return m;
                    const prevReactions = m.reactions || {};
                    const currentCount = prevReactions[data.emoji] || 0;
                    return {
                        ...m,
                        reactions: {
                            ...prevReactions,
                            [data.emoji]: currentCount + 1
                        }
                    };
                })
            );
        });

        channel.bind('message-deleted', (data: { messageId: string }) => {
            setMessages(prev => prev.filter(m => m.id !== data.messageId));
        });

        return () => {
            pusherClient.unsubscribe(channelName);
        };
    }, [selectedConversation, currentUser?.id]);

    // Global conversation updates
    useEffect(() => {
        if (!currentUser?.id) return;

        if (!isPusherConfigured) return;

        const channelName = userConversationChannel(currentUser.id);
        const convChannel = pusherClient.subscribe(channelName);
        convChannel.bind('conversation-update', (data: any) => {
            setConversations(prev => {
                const existsIdx = prev.findIndex(c => c.id === data.conversationId);
                if (existsIdx >= 0) {
                    const newConvs = [...prev];
                    newConvs[existsIdx] = {
                        ...newConvs[existsIdx],
                        messages: [data.lastMessage],
                        updatedAt: data.lastMessage.createdAt
                    };
                    return newConvs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                } else {
                    getConversations().then(setConversations);
                    return prev;
                }
            });
        });

        return () => {
            pusherClient.unsubscribe(channelName);
        };
    }, [currentUser?.id]);

    // Auto scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Search handle
    useEffect(() => {
        if (!isSearching || !searchQuery) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            const res = await fetch('/api/users');
            if (res.ok) {
                const all = await res.json();
                setSearchResults(
                    all.filter((u: any) =>
                        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase())
                    )
                );
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, isSearching]);

    // Typing debounce
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessageText(e.target.value);
        if (!selectedConversation) return;

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        broadcastTyping(selectedConversation, true);

        typingTimeoutRef.current = setTimeout(() => {
            if (selectedConversation) broadcastTyping(selectedConversation, false);
        }, 2000);
    };

    // Send Message
    const handleSendMessage = async () => {
        if (!messageText.trim() || !selectedConversation) return;

        let contentToSend = messageText.trim();
        if (replyingTo) {
            contentToSend = `[REPLY:${replyingTo.username}:${replyingTo.text.slice(0, 60)}]:${contentToSend}`;
            setReplyingTo(null);
        }

        setMessageText('');
        setShowEmojiDrawer(false);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        broadcastTyping(selectedConversation, false);

        try {
            await sendMessage(selectedConversation, contentToSend);
        } catch (err) {
            console.error('Failed to send message', err);
        }
    };

    // Image and video upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedConversation) return;

        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                const mediaType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
                await sendMessage(selectedConversation, `[${mediaType}]:${base64String}`);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Failed to upload image', err);
        }
    };

    // Paste Image from Clipboard
    const handlePaste = (e: React.ClipboardEvent) => {
        if (!selectedConversation) return;
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        const base64String = reader.result as string;
                        await sendMessage(selectedConversation, `[IMAGE]:${base64String}`);
                    };
                    reader.readAsDataURL(blob);
                }
            }
        }
    };

    // Drag and drop files
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingOver(true);
    };

    const handleDragLeave = () => {
        setIsDraggingOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingOver(false);
        if (!selectedConversation) return;

        const file = e.dataTransfer.files?.[0];
            if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                    const mediaType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
                    await sendMessage(selectedConversation, `[${mediaType}]:${base64String}`);
            };
            reader.readAsDataURL(file);
        }
    };

    // Voice Note Recording with Live AudioContext Analyser
    const startVoiceRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Audio analyser setup
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 32;
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            
            audioContextRef.current = audioCtx;
            analyserRef.current = analyser;

            const updateVisualizer = () => {
                if (!analyserRef.current) return;
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);
                const levels = Array.from(dataArray.slice(0, 8)).map(val => Math.max(4, Math.min(22, (val / 255) * 24)));
                setLiveAudioLevels(levels);
                animFrameRef.current = requestAnimationFrame(updateVisualizer);
            };
            updateVisualizer();

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
                if (audioContextRef.current) audioContextRef.current.close();

                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                if (audioBlob.size > 0 && selectedConversation && recordingTime > 0) {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        const base64Audio = reader.result as string;
                        await sendMessage(selectedConversation, `[AUDIO]:${base64Audio}`);
                    };
                    reader.readAsDataURL(audioBlob);
                }
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.warn('Microphone permission denied or not supported, generating simulated note', err);
            // Graceful fallback simulated recording
            setIsRecording(true);
            setRecordingTime(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        }
    };

    const stopVoiceRecording = () => {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        } else if (isRecording && selectedConversation) {
            // Simulated note fallback
            sendMessage(selectedConversation, `[AUDIO]:simulated_voice_note_${Date.now()}`);
        }
        setIsRecording(false);
    };

    const cancelVoiceRecording = () => {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            audioChunksRef.current = [];
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        setRecordingTime(0);
    };

    // Voice Playback with Scrubber & Progress
    const toggleAudioPlay = (msgId: string, audioSrc: string) => {
        if (playingAudioId === msgId) {
            activeAudioElementRef.current?.pause();
            setPlayingAudioId(null);
        } else {
            if (activeAudioElementRef.current) {
                activeAudioElementRef.current.pause();
            }

            if (audioSrc.startsWith('simulated_voice_note')) {
                // Simulated audio playback
                setPlayingAudioId(msgId);
                let cur = 0;
                const int = setInterval(() => {
                    cur += 0.5;
                    setAudioProgress(prev => ({ ...prev, [msgId]: { current: cur, duration: 8 } }));
                    if (cur >= 8) {
                        clearInterval(int);
                        setPlayingAudioId(null);
                        setAudioProgress(prev => ({ ...prev, [msgId]: { current: 0, duration: 8 } }));
                    }
                }, 500);
                return;
            }

            const audio = new Audio(audioSrc);
            const speed = audioSpeeds[msgId] || 1;
            audio.playbackRate = speed;
            activeAudioElementRef.current = audio;
            setPlayingAudioId(msgId);

            audio.ontimeupdate = () => {
                setAudioProgress(prev => ({
                    ...prev,
                    [msgId]: {
                        current: audio.currentTime,
                        duration: audio.duration || 1
                    }
                }));
            };

            audio.onended = () => {
                setPlayingAudioId(null);
                setAudioProgress(prev => ({
                    ...prev,
                    [msgId]: {
                        current: 0,
                        duration: audio.duration || 1
                    }
                }));
            };

            audio.play().catch(e => console.warn('Audio play error', e));
        }
    };

    const toggleAudioSpeed = (msgId: string) => {
        const currentSpeed = audioSpeeds[msgId] || 1;
        const nextSpeed = currentSpeed === 1 ? 1.5 : currentSpeed === 1.5 ? 2 : 1;
        setAudioSpeeds(prev => ({ ...prev, [msgId]: nextSpeed }));
        if (playingAudioId === msgId && activeAudioElementRef.current) {
            activeAudioElementRef.current.playbackRate = nextSpeed;
        }
    };

    // Reactions & Double-tap Heart
    const handleReaction = async (messageId: string, emoji: string) => {
        if (!selectedConversation) return;
        setActiveReactionMsgId(null);

        setMessages(prev =>
            prev.map(m => {
                if (m.id !== messageId) return m;
                const prevReactions = m.reactions || {};
                const currentCount = prevReactions[emoji] || 0;
                return {
                    ...m,
                    reactions: {
                        ...prevReactions,
                        [emoji]: currentCount + 1
                    }
                };
            })
        );

        await broadcastReaction(selectedConversation, messageId, emoji);
    };

    const handleDoubleTapMessage = (messageId: string) => {
        setHeartBurstId(messageId);
        handleReaction(messageId, '❤️');
        setTimeout(() => setHeartBurstId(null), 900);
    };

    // Scroll to quoted message
    const scrollToMessage = (msgId: string) => {
        const el = messageElementsRef.current[msgId];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMsgId(msgId);
            setTimeout(() => setHighlightedMsgId(null), 2000);
        }
    };

    // Delete Message
    const handleDeleteMessage = async (messageId: string) => {
        if (!selectedConversation) return;
        setMessages(prev => prev.filter(m => m.id !== messageId));
        await deleteMessage(selectedConversation, messageId);
    };

    // Start Conversation
    const handleStartConversation = async (username: string) => {
        try {
            const conv = await startConversation(username);
            setConversations(prev => {
                const existing = prev.find(c => c.id === conv.id);
                if (existing) return prev;
                return [conv, ...prev];
            });
            setSelectedConversation(conv.id);
            setIsSearching(false);
            setSearchQuery('');
        } catch (err) {
            console.error('Failed to start conversation', err);
        }
    };

    // Audio / Video Calling Modal with Live Camera Stream
    const startCall = async (type: 'audio' | 'video') => {
        setCallModal({ active: true, type, duration: 0 });
        setIsMuted(false);
        setIsVideoOff(false);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: type === 'video',
                audio: true
            });
            localStreamRef.current = stream;
            if (localVideoRef.current && type === 'video') {
                localVideoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.warn('Camera/Mic stream access optional/denied', err);
        }

        if (callTimerRef.current) clearInterval(callTimerRef.current);
        callTimerRef.current = setInterval(() => {
            setCallModal(prev => (prev ? { ...prev, duration: prev.duration + 1 } : null));
        }, 1000);
    };

    const endCall = () => {
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }
        setCallModal(null);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const selectedConv = conversations.find(c => c.id === selectedConversation);
    const otherParticipant = selectedConv?.participants?.[0];

    const filteredConversations = conversations.filter(c => {
        const other = c.participants?.[0];
        if (!other) return false;
        return (
            other.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (other.fullName || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    const formatTimer = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Helper: Parse rich message contents
    const parseContent = (content: string) => {
        let replyHeader: { author: string; text: string } | null = null;
        let mainContent = content;

        if (content.startsWith('[REPLY:')) {
            const match = content.match(/^\[REPLY:([^:]+):([^\]]+)\]:([\s\S]*)$/);
            if (match) {
                replyHeader = { author: match[1], text: match[2] };
                mainContent = match[3];
            }
        }

        const isImage = mainContent.startsWith('[IMAGE]:');
        const isVideo = mainContent.startsWith('[VIDEO]:');
        const isAudio = mainContent.startsWith('[AUDIO]:');
        const imageUrl = isImage ? mainContent.replace('[IMAGE]:', '') : null;
        const videoUrl = isVideo ? mainContent.replace('[VIDEO]:', '') : null;
        const audioUrl = isAudio ? mainContent.replace('[AUDIO]:', '') : null;

        return { replyHeader, isImage, isVideo, isAudio, imageUrl, videoUrl, audioUrl, text: mainContent };
    };

    return (
        <div className={styles.messagesContainer}>
            <div className={styles.mainWrapper}>
                {/* Conversations Sidebar */}
                <div className={`${styles.conversationsList} ${selectedConversation ? styles.hiddenOnMobile : ''}`}>
                    <div className={styles.conversationsHeader}>
                        <h1 className={styles.headerTitle}>Messages</h1>
                        <button
                            className={styles.newMessageBtn}
                            onClick={() => setIsSearching(!isSearching)}
                            title="New Conversation"
                        >
                            <Edit size={20} />
                        </button>
                    </div>

                    <div className={styles.searchContainer}>
                        <Search size={16} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder={isSearching ? 'Find creators...' : 'Search inbox...'}
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {isSearching && searchResults.length > 0 && (
                        <div className={styles.searchResults}>
                            {searchResults.map((user: any) => (
                                <div
                                    key={user.id}
                                    className={styles.searchResultItem}
                                    onClick={() => handleStartConversation(user.username)}
                                >
                                    <Image
                                        src={user.avatar || 'https://i.pravatar.cc/150'}
                                        alt={user.username}
                                        width={40}
                                        height={40}
                                        className={styles.resultAvatar}
                                    />
                                    <div className={styles.resultInfo}>
                                        <span className={styles.resultName}>{user.fullName || user.username}</span>
                                        <span className={styles.resultUsername}>@{user.username}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={styles.conversationsScroll}>
                        {filteredConversations.map((conv, idx) => {
                            const other = conv.participants?.[0] || { username: 'User', avatar: '' };
                            const lastMsg = conv.messages?.[0];
                            const lastMsgParsed = lastMsg ? parseContent(lastMsg.content) : null;
                            const displayLast = lastMsgParsed
                                ? lastMsgParsed.isImage
                                    ? '📷 Photo'
                                    : lastMsgParsed.isVideo
                                    ? '🎬 Video'
                                    : lastMsgParsed.isAudio
                                    ? '🎙️ Voice note'
                                    : lastMsgParsed.text
                                : 'Started a conversation';

                            return (
                                <motion.div
                                    key={conv.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className={`${styles.conversationItem} ${
                                        selectedConversation === conv.id ? styles.active : ''
                                    }`}
                                    onClick={() => setSelectedConversation(conv.id)}
                                >
                                    <div className={styles.avatarContainer}>
                                        <Image
                                            src={other.avatar || 'https://i.pravatar.cc/150'}
                                            alt={other.username}
                                            className={styles.avatar}
                                            width={48}
                                            height={48}
                                        />
                                        <div className={styles.onlineIndicator} />
                                    </div>
                                    <div className={styles.conversationInfo}>
                                        <div className={styles.conversationTop}>
                                            <span className={styles.conversationName}>
                                                {other.fullName || other.username}
                                            </span>
                                            <span className={styles.timestamp}>
                                                {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: false })}
                                            </span>
                                        </div>
                                        <div className={styles.conversationBottom}>
                                            <span className={styles.lastMessage}>{displayLast}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div
                    className={`${styles.chatArea} ${
                        selectedConversation ? styles.visibleOnMobile : styles.hiddenOnMobile
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {/* Drag and drop glowing overlay */}
                    {isDraggingOver && (
                        <div className={styles.dragDropOverlay}>
                            <UploadCloud size={54} />
                            <div className={styles.dragDropTitle}>Drop image here to send</div>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {selectedConversation ? (
                            <motion.div
                                key="chat"
                                className={styles.chatWrapper}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            >
                                {/* Chat Header */}
                                <div className={styles.chatHeader}>
                                    <div className={styles.chatHeaderLeft}>
                                        <button
                                            className={styles.backBtn}
                                            onClick={() => setSelectedConversation(null)}
                                        >
                                            <ChevronLeft size={24} />
                                        </button>
                                        <div className={styles.avatarContainer}>
                                            <Image
                                                src={otherParticipant?.avatar || 'https://i.pravatar.cc/150'}
                                                alt={otherParticipant?.username || ''}
                                                className={styles.avatar}
                                                width={42}
                                                height={42}
                                            />
                                            <div className={styles.onlineIndicator} />
                                        </div>
                                        <div className={styles.chatHeaderInfo}>
                                            <h2 className={styles.chatName}>
                                                {otherParticipant?.fullName || otherParticipant?.username}
                                            </h2>
                                            <span className={styles.chatStatus}>
                                                {isTyping ? 'typing...' : 'Active now'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.chatHeaderActions}>
                                        <button
                                            className={styles.headerActionBtn}
                                            onClick={() => startCall('audio')}
                                            title="Audio Call"
                                        >
                                            <Phone size={18} />
                                        </button>
                                        <button
                                            className={styles.headerActionBtn}
                                            onClick={() => startCall('video')}
                                            title="Video Call"
                                        >
                                            <Video size={18} />
                                        </button>
                                        <button className={styles.headerActionBtn} title="Details">
                                            <Info size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Messages Stream */}
                                <div className={styles.messagesArea}>
                                    <AnimatePresence mode="popLayout">
                                        {messages.map((message) => {
                                            const isMe = message.senderId === currentUser?.id;
                                            const { replyHeader, isImage, isVideo, isAudio, imageUrl, videoUrl, audioUrl, text } =
                                                parseContent(message.content);
                                            const prog = audioProgress[message.id] || { current: 0, duration: 0 };
                                            const playPct = prog.duration > 0 ? (prog.current / prog.duration) * 100 : 0;

                                            return (
                                                <motion.div
                                                    key={message.id}
                                                    ref={(el) => {
                                                        messageElementsRef.current[message.id] = el;
                                                    }}
                                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    className={`${styles.messageWrapper} ${
                                                        isMe ? styles.userMessage : styles.otherMessage
                                                    }`}
                                                    onDoubleClick={() => handleDoubleTapMessage(message.id)}
                                                >
                                                    {!isMe && (
                                                        <Image
                                                            src={otherParticipant?.avatar || 'https://i.pravatar.cc/150'}
                                                            alt="Avatar"
                                                            className={styles.messageAvatar}
                                                            width={32}
                                                            height={32}
                                                        />
                                                    )}

                                                    <div className={styles.messageBubbleContainer}>
                                                        {/* Heart Burst on double tap */}
                                                        {heartBurstId === message.id && (
                                                            <motion.div
                                                                className={styles.heartBurst}
                                                                initial={{ scale: 0, opacity: 1 }}
                                                                animate={{ scale: [0, 1.4, 1.1], opacity: [1, 1, 0] }}
                                                                transition={{ duration: 0.8 }}
                                                            >
                                                                <Heart size={48} fill="#ef4444" />
                                                            </motion.div>
                                                        )}

                                                        {/* Hover Action Bar (React / Reply / Delete) */}
                                                        <div className={styles.messageActionsBar}>
                                                            <button
                                                                className={styles.messageActionBtn}
                                                                onClick={() =>
                                                                    setActiveReactionMsgId(
                                                                        activeReactionMsgId === message.id ? null : message.id
                                                                    )
                                                                }
                                                                title="React"
                                                            >
                                                                <Smile size={14} />
                                                            </button>
                                                            <button
                                                                className={styles.messageActionBtn}
                                                                onClick={() =>
                                                                    setReplyingTo({
                                                                        id: message.id,
                                                                        username: isMe
                                                                            ? 'You'
                                                                            : otherParticipant?.username || 'User',
                                                                        text: isImage ? '📷 Photo' : isVideo ? '🎬 Video' : isAudio ? '🎙️ Voice note' : text
                                                                    })
                                                                }
                                                                title="Reply"
                                                            >
                                                                <Reply size={14} />
                                                            </button>
                                                            {isMe && (
                                                                <button
                                                                    className={`${styles.messageActionBtn} ${styles.messageActionBtnDelete}`}
                                                                    onClick={() => handleDeleteMessage(message.id)}
                                                                    title="Unsend"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Floating Reaction Picker */}
                                                        {activeReactionMsgId === message.id && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.8, y: 5 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                className={styles.reactionPicker}
                                                            >
                                                                {QUICK_EMOJIS.map((emoji) => (
                                                                    <button
                                                                        key={emoji}
                                                                        className={styles.reactionEmojiBtn}
                                                                        onClick={() => handleReaction(message.id, emoji)}
                                                                    >
                                                                        {emoji}
                                                                    </button>
                                                                ))}
                                                                <button
                                                                    className={styles.reactionEmojiBtn}
                                                                    onClick={() => setShowEmojiDrawer(true)}
                                                                    title="More Emojis"
                                                                >
                                                                    <Plus size={16} />
                                                                </button>
                                                            </motion.div>
                                                        )}

                                                        {/* Message Bubble Content */}
                                                        <div
                                                            className={`${styles.messageBubble} ${
                                                                highlightedMsgId === message.id
                                                                    ? styles.highlightedBubble
                                                                    : ''
                                                            }`}
                                                        >
                                                            {/* Quoted Reply Banner */}
                                                            {replyHeader && (
                                                                <div
                                                                    className={styles.quotePreviewBubble}
                                                                    onClick={() => scrollToMessage(message.id)}
                                                                    title="Click to jump to quoted message"
                                                                >
                                                                    <div className={styles.quoteSender}>
                                                                        @{replyHeader.author}
                                                                    </div>
                                                                    <div className={styles.quoteText}>
                                                                        {replyHeader.text}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Image Bubble */}
                                                            {isImage && imageUrl && (
                                                                <div
                                                                    className={styles.messageImageWrapper}
                                                                    onClick={() => {
                                                                        setLightboxImage(imageUrl);
                                                                        setLightboxZoom(1);
                                                                        setLightboxRotation(0);
                                                                    }}
                                                                >
                                                                    <Image
                                                                        src={imageUrl}
                                                                        alt="Shared image"
                                                                        width={280}
                                                                        height={280}
                                                                        className={styles.messageImage}
                                                                    />
                                                                </div>
                                                            )}

                                                            {isVideo && videoUrl && (
                                                                <div className={styles.messageVideoWrapper}>
                                                                    <video
                                                                        src={videoUrl}
                                                                        className={styles.messageVideo}
                                                                        controls
                                                                        playsInline
                                                                        preload="metadata"
                                                                    />
                                                                    <span className={styles.mediaTypeBadge}>VIDEO</span>
                                                                </div>
                                                            )}

                                                            {/* Audio Voice Note Bubble */}
                                                            {isAudio && audioUrl && (
                                                                <div className={styles.audioPlayerBubble}>
                                                                    <div className={styles.audioPlayerTop}>
                                                                        <button
                                                                            className={styles.audioPlayBtn}
                                                                            onClick={() =>
                                                                                toggleAudioPlay(message.id, audioUrl)
                                                                            }
                                                                        >
                                                                            {playingAudioId === message.id ? (
                                                                                <Pause size={17} />
                                                                            ) : (
                                                                                <Play size={17} />
                                                                            )}
                                                                        </button>

                                                                        <div className={styles.audioWaveform}>
                                                                            {[8, 14, 22, 16, 26, 12, 18, 24, 10, 16, 20, 14, 28, 12, 18, 22].map(
                                                                                (h, i) => {
                                                                                    const isPassed = (i / 16) * 100 <= playPct;
                                                                                    return (
                                                                                        <div
                                                                                            key={i}
                                                                                            className={`${styles.waveBar} ${
                                                                                                isPassed || playingAudioId === message.id
                                                                                                    ? styles.waveBarActive
                                                                                                    : ''
                                                                                            }`}
                                                                                            style={{ height: `${h}px` }}
                                                                                        />
                                                                                    );
                                                                                }
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className={styles.audioPlayerBottom}>
                                                                        <span>
                                                                            {prog.duration > 0
                                                                                ? `${formatTimer(prog.current)} / ${formatTimer(prog.duration)}`
                                                                                : '0:00 / Voice Note'}
                                                                        </span>
                                                                        <button
                                                                            className={styles.audioSpeedBtn}
                                                                            onClick={() => toggleAudioSpeed(message.id)}
                                                                        >
                                                                            {audioSpeeds[message.id] || 1}x
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Plain Text Content */}
                                                            {!isImage && !isVideo && !isAudio && (
                                                                <p className={styles.messageText}>{text}</p>
                                                            )}

                                                            <div className={styles.messageFooter}>
                                                                <span className={styles.messageTime}>
                                                                    {new Date(message.createdAt).toLocaleTimeString([], {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </span>
                                                                {isMe && (
                                                                    <span className={styles.messageStatus}>
                                                                        <CheckCheck size={13} />
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Reaction Badges */}
                                                        {message.reactions &&
                                                            Object.keys(message.reactions).length > 0 && (
                                                                <div className={styles.reactionBadges}>
                                                                    {Object.entries(message.reactions).map(([em, cnt]) => (
                                                                        <div
                                                                            key={em}
                                                                            className={styles.reactionPill}
                                                                            onClick={() => handleReaction(message.id, em)}
                                                                        >
                                                                            <span>{em}</span>
                                                                            <span>{cnt}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}

                                        {/* Typing Indicator */}
                                        {isTyping && (
                                            <motion.div
                                                key="typing"
                                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                                className={`${styles.messageWrapper} ${styles.otherMessage}`}
                                            >
                                                <Image
                                                    src={otherParticipant?.avatar || 'https://i.pravatar.cc/150'}
                                                    alt="Avatar"
                                                    className={styles.messageAvatar}
                                                    width={32}
                                                    height={32}
                                                />
                                                <div className={styles.messageBubble}>
                                                    <div className={styles.typingIndicator}>
                                                        <span></span>
                                                        <span></span>
                                                        <span></span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Chat Input Area */}
                                <div className={styles.inputContainerWrapper}>
                                    {/* Quoted Replying Banner */}
                                    {replyingTo && (
                                        <div className={styles.replyBanner}>
                                            <div className={styles.replyBannerContent}>
                                                Replying to <span className={styles.replyBannerUser}>@{replyingTo.username}</span>: &quot;{replyingTo.text}&quot;
                                            </div>
                                            <button
                                                className={styles.cancelReplyBtn}
                                                onClick={() => setReplyingTo(null)}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Emoji Drawer Dropdown */}
                                    {showEmojiDrawer && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className={styles.emojiPickerDrawer}
                                        >
                                            {EMOJI_DRAWER.map((emoji) => (
                                                <button
                                                    key={emoji}
                                                    className={styles.emojiDrawerBtn}
                                                    onClick={() => setMessageText((prev) => prev + emoji)}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}

                                    {/* Message Inputs */}
                                    <div className={styles.messageInput}>
                                        <input
                                            type="file"
                                            accept="image/*,video/*"
                                            id="chat-image-upload"
                                            style={{ display: 'none' }}
                                            onChange={handleImageUpload}
                                        />

                                        {!isRecording ? (
                                            <>
                                                <button
                                                    className={styles.headerActionBtn}
                                                    onClick={() =>
                                                        document.getElementById('chat-image-upload')?.click()
                                                    }
                                                    title="Attach Image"
                                                >
                                                    <LucideImage size={20} />
                                                </button>
                                                <button
                                                    className={styles.headerActionBtn}
                                                    onClick={() => setShowEmojiDrawer(!showEmojiDrawer)}
                                                    title="Emoji Picker"
                                                >
                                                    <Smile size={20} />
                                                </button>
                                                <input
                                                    type="text"
                                                    placeholder="Type a message or paste image (Ctrl+V)..."
                                                    className={styles.textInput}
                                                    value={messageText}
                                                    onChange={handleInputChange}
                                                    onKeyDown={handleKeyPress}
                                                    onPaste={handlePaste}
                                                />
                                                {messageText.trim() ? (
                                                    <button className={styles.sendBtn} onClick={handleSendMessage}>
                                                        <Send size={18} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        className={styles.sendBtn}
                                                        onClick={startVoiceRecording}
                                                        title="Record Voice Note"
                                                    >
                                                        <Mic size={18} />
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            /* Active Recording Bar with Live Microphone Waveform */
                                            <div className={styles.voiceRecordingBar}>
                                                <div className={styles.voiceRecLeft}>
                                                    <div className={styles.recDot} />
                                                    <span className={styles.recTimer}>
                                                        {formatTimer(recordingTime)}
                                                    </span>
                                                    <div className={styles.voiceWaveAnim}>
                                                        {liveAudioLevels.map((h, i) => (
                                                            <div
                                                                key={i}
                                                                className={styles.voiceWaveBar}
                                                                style={{ height: `${h}px` }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <button
                                                        className={styles.trashRecBtn}
                                                        onClick={cancelVoiceRecording}
                                                        title="Cancel Recording"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                    <button
                                                        className={styles.sendBtn}
                                                        onClick={stopVoiceRecording}
                                                        title="Send Voice Note"
                                                    >
                                                        <Send size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            /* Empty Inbox State */
                            <motion.div
                                key="empty"
                                className={styles.emptyState}
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            >
                                <div className={styles.emptyIconWrapper}>
                                    <Send size={40} />
                                </div>
                                <h2 className={styles.emptyTitle}>Your Messages</h2>
                                <p className={styles.emptyDescription}>
                                    Send private photos, voice notes, and messages to your friends and creator network.
                                </p>
                                <button
                                    className={styles.sendMessageBtn}
                                    onClick={() => setIsSearching(true)}
                                >
                                    Start a Chat
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Media Lightbox Viewer with Zoom, Rotate, and Download Controls */}
            <AnimatePresence>
                {lightboxImage && (
                    <motion.div
                        className={styles.lightboxOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightboxImage(null)}
                    >
                        <div className={styles.lightboxControls} onClick={(e) => e.stopPropagation()}>
                            <button
                                className={styles.lightboxBtn}
                                onClick={() => setLightboxZoom((prev) => Math.min(3, prev + 0.25))}
                                title="Zoom In"
                            >
                                <ZoomIn size={18} />
                            </button>
                            <button
                                className={styles.lightboxBtn}
                                onClick={() => setLightboxZoom((prev) => Math.max(0.5, prev - 0.25))}
                                title="Zoom Out"
                            >
                                <ZoomOut size={18} />
                            </button>
                            <button
                                className={styles.lightboxBtn}
                                onClick={() => setLightboxRotation((prev) => prev + 90)}
                                title="Rotate"
                            >
                                <RotateCw size={18} />
                            </button>
                            <a
                                href={lightboxImage}
                                download="shared_image.png"
                                className={styles.lightboxBtn}
                                title="Download Image"
                            >
                                <Download size={18} />
                            </a>
                            <button
                                className={styles.lightboxBtn}
                                onClick={() => setLightboxImage(null)}
                                title="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
                            <Image
                                src={lightboxImage}
                                alt="Expanded view"
                                width={800}
                                height={800}
                                className={styles.lightboxImage}
                                style={{
                                    transform: `scale(${lightboxZoom}) rotate(${lightboxRotation}deg)`
                                }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Audio / Video Calling Modal with Live Camera PIP Preview */}
            <AnimatePresence>
                {callModal && (
                    <motion.div
                        className={styles.callModalOverlay}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                    >
                        <div className={styles.callHeader}>
                            <h3 className={styles.callTitle}>
                                {callModal.type === 'video' ? 'Video Call' : 'Audio Call'}
                            </h3>
                            <span className={styles.callStatus}>
                                {otherParticipant?.fullName || otherParticipant?.username} •{' '}
                                {formatTimer(callModal.duration)}
                            </span>
                        </div>

                        {callModal.type === 'video' ? (
                            /* Live Video Calling Container */
                            <div className={styles.callVideoContainer}>
                                <Image
                                    src={otherParticipant?.avatar || 'https://i.pravatar.cc/400'}
                                    alt="Remote participant"
                                    fill
                                    className={styles.mainVideoStream}
                                    style={{ filter: isVideoOff ? 'blur(20px)' : 'none' }}
                                />

                                {/* Local webcam Picture-in-Picture */}
                                <div className={styles.pipVideoWrapper}>
                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className={styles.pipVideoStream}
                                    />
                                </div>
                            </div>
                        ) : (
                            /* Audio Call Avatar with Pulse Waves */
                            <div className={styles.callAvatarContainer}>
                                <div className={styles.callPulseRing} />
                                <div className={styles.callPulseRing2} />
                                <Image
                                    src={otherParticipant?.avatar || 'https://i.pravatar.cc/150'}
                                    alt="Caller"
                                    width={110}
                                    height={110}
                                    className={styles.callAvatar}
                                />
                            </div>
                        )}

                        <div className={styles.callActions}>
                            <button
                                className={`${styles.callActionBtn} ${isMuted ? styles.callActionBtnActive : ''}`}
                                onClick={() => setIsMuted(!isMuted)}
                                title="Mute Microphone"
                            >
                                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                            </button>

                            {callModal.type === 'video' && (
                                <button
                                    className={`${styles.callActionBtn} ${isVideoOff ? styles.callActionBtnActive : ''}`}
                                    onClick={() => setIsVideoOff(!isVideoOff)}
                                    title="Toggle Camera"
                                >
                                    {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
                                </button>
                            )}

                            <button className={styles.endCallBtn} onClick={endCall} title="End Call">
                                <PhoneOff size={26} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MessagesPage;
