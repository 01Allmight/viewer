'use client';

import React, { useState, useTransition, useCallback, useEffect } from 'react';
import { X, Upload, Sparkles, MapPin, Smile, ChevronDown, ChevronLeft, Loader2, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './create.module.css';
import { useRouter } from 'next/navigation';
import { createPost } from '@/app/actions';
import Image from 'next/image';
import { compressImage, compressVideo } from '@/lib/compression';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Camera as CameraIcon } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

const FILTERS = [
    { name: 'Original', value: 'none' },
    { name: 'Vibrant', value: 'contrast(1.2) saturate(1.4)' },
    { name: 'Ethereal', value: 'brightness(1.1) contrast(0.9) saturate(0.8) sepia(0.1)' },
    { name: 'Midnight', value: 'grayscale(0.2) brightness(0.8) contrast(1.2) hue-rotate(-20deg)' },
    { name: 'Cinema', value: 'contrast(1.3) brightness(0.9) saturate(1.1)' },
    { name: 'Noir', value: 'grayscale(1) contrast(1.3) brightness(0.8)' },
];

const CreatePostPage = () => {
    const [mediaItems, setMediaItems] = useState<{ url: string; file?: File; type: 'image' | 'video' }[]>([]);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [caption, setCaption] = useState('');
    const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
    const [location, setLocation] = useState('');
    const [isPending, startTransition] = useTransition();
    const [isCompressing, setIsCompressing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [isEnhanced, setIsEnhanced] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const { showToast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const fetchMe = async () => {
            try {
                const res = await fetch('/api/users/me');
                if (res.ok) {
                    const data = await res.json();
                    setCurrentUser(data);
                }
            } catch (err) {
                console.error('Failed to fetch user', err); 
            }
        };
        fetchMe();
    }, []);

    const handleAIEnhance = () => {
        setIsEnhancing(true);
        setTimeout(() => {
            setIsEnhancing(false);
            setIsEnhanced(!isEnhanced);
        }, 1800);
    };

    const processFiles = (files: File[]) => {
        files.forEach(file => {
            if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;
            const type: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
            const objectUrl = URL.createObjectURL(file);
            setMediaItems(prev => [...prev, { url: objectUrl, file, type }]);
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        processFiles(files);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files || []);
        processFiles(files);
    }, []);

    const takePhoto = async () => {
        try {
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: true,
                resultType: CameraResultType.Uri,
                source: CameraSource.Prompt
            });

            if (image.webPath) {
                const res = await fetch(image.webPath);
                const blob = await res.blob();
                const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
                setMediaItems(prev => [...prev, { url: image.webPath!, file, type: 'image' }]);
            }
        } catch (e) {
            console.warn('Camera failed', e);
        }
    };

    const handleShare = async () => {
        if (mediaItems.length === 0) return;

        setIsCompressing(true);

        try {
            const formData = new FormData();
            formData.append('caption', caption);
            formData.append('location', location);
            formData.append('filter', activeFilter.name);

            for (let i = 0; i < mediaItems.length; i++) {
                const item = mediaItems[i];
                if (item.file) {
                    // Compress file before upload
                    let fileToUpload = item.file;
                    if (item.type === 'image') {
                        fileToUpload = await compressImage(item.file);
                    } else if (item.type === 'video') {
                        fileToUpload = await compressVideo(item.file);
                    }

                    const res = await fetch('/api/uploads', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileName: fileToUpload.name, contentType: fileToUpload.type })
                    });

                    const data = await res.json();

                    if (!res.ok || data.error) {
                        console.warn('S3 Setup missing or failed, falling back to local upload logic.');
                        const localData = new FormData();
                        localData.append('file', fileToUpload);

                        const localRes = await fetch('/api/uploads', {
                            method: 'POST',
                            body: localData // Uses multipart/form-data automatically
                        });

                        if (!localRes.ok) throw new Error('Local fallback upload failed');
                        const localJson = await localRes.json();
                        formData.append(`media-${i}`, localJson.publicUrl);
                    } else {
                        // Regular S3 upload
                        const putRes = await fetch(data.uploadUrl, {
                            method: 'PUT',
                            headers: { 'Content-Type': fileToUpload.type },
                            body: fileToUpload
                        });

                        if (!putRes.ok) throw new Error(`Upload failed for item ${i}`);
                        formData.append(`media-${i}`, data.publicUrl);
                    }
                } else {
                    formData.append(`media-${i}`, item.url);
                }
            }

            startTransition(async () => {
                try {
                    await createPost(formData);
                    showToast('Post created successfully! 🎉', 'success');
                    router.push('/');
                } catch (error) {
                    console.error('Failed to share post:', error);
                    showToast('Failed to share post: ' + (error as Error).message, 'error');
                }
            });
        } catch (error) {
            console.error('Compression or Upload failed:', error);
            showToast('Upload failed: ' + (error as Error).message, 'error');
        } finally {
            setIsCompressing(false);
        }
    };

    const generateAICaption = () => {
        setIsGeneratingCaption(true);
        setTimeout(() => {
            const mocks = [
                "Capturing moments that feel like dreams. ✨🌌",
                "Ethereal vibes only. #ViewerSocial #Art",
                "POV: You've found your digital sanctuary. 🕊️",
                "Beyond the surface, into the soul. 💫",
                "Crafting new worlds, one post at a time. 🎨"
            ];
            setCaption(mocks[Math.floor(Math.random() * mocks.length)]);
            setIsGeneratingCaption(false);
        }, 1200);
    };

    return (
        <div className={styles.createPage}>
            <div className="neural-grid" />

            <motion.div
                className={styles.modal}
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
                {/* Header */}
                <div className={styles.header}>
                    <div style={{ width: 40 }}>
                        {mediaItems.length > 0 && (
                            <button className={styles.backBtn} onClick={() => setMediaItems([])} disabled={isPending || isCompressing}>
                                <ChevronLeft size={22} />
                            </button>
                        )}
                    </div>

                    <div className={styles.title}>
                        {mediaItems.length > 0 ? 'Refine Post' : 'Share Vision'}
                    </div>

                    <div style={{ width: 100, display: 'flex', justifyContent: 'flex-end' }}>
                        {mediaItems.length > 0 ? (
                            <button
                                className={styles.shareButton}
                                onClick={handleShare}
                                disabled={isPending || isCompressing}
                            >
                                {(isPending || isCompressing) ? <Loader2 className="animate-spin" size={20} /> : 'Publish'}
                                {isCompressing && <span style={{ fontSize: '11px', display: 'block', marginTop: '-4px' }}>Compressing...</span>}
                            </button>
                        ) : (
                            <button className={styles.closeBtn} onClick={() => router.back()}>
                                <X size={22} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div
                    className={`${styles.content} ${isDragging ? styles.dragging : ''}`}
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                >
                    {mediaItems.length > 0 ? (
                        <div className={styles.editorContainer}>
                            {/* Media Preview */}
                            <div className={styles.imagePreviewSection}>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={mediaItems[currentMediaIndex].url}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.4 }}
                                        className={styles.mainPreviewWrapper}
                                    >
                                        {mediaItems[currentMediaIndex].type === 'image' ? (
                                            <Image
                                                src={mediaItems[currentMediaIndex].url}
                                                alt="Preview"
                                                className={styles.previewImage}
                                                style={{ filter: isEnhanced ? 'contrast(1.1) saturate(1.15) brightness(1.02)' : activeFilter.value }}
                                                width={1000}
                                                height={1000}

                                            />
                                        ) : (
                                            <video
                                                src={mediaItems[currentMediaIndex].url}
                                                className={styles.previewImage}
                                                style={{ filter: isEnhanced ? 'contrast(1.1) saturate(1.1)' : activeFilter.value }}
                                                autoPlay muted loop
                                            />
                                        )}
                                    </motion.div>
                                </AnimatePresence>

                                <button
                                    className={`${styles.aiEnhanceBtn} ${isEnhanced ? styles.aiActive : ''}`}
                                    onClick={handleAIEnhance}
                                    disabled={isEnhancing}
                                >
                                    {isEnhancing ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
                                    <span>{isEnhancing ? 'Optimizing...' : isEnhanced ? 'Vision Restored' : 'Enhance View'}</span>
                                </button>
                            </div>

                            {/* Sidebar Details */}
                            <div className={styles.detailsSidebar}>
                                {currentUser && (
                                    <div className={styles.userInfo}>
                                        <Image
                                            src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.username}&background=random`}
                                            alt="Me"
                                            className={styles.avatar}
                                            width={40} height={40}
                                        />
                                        <span className={styles.username}>{currentUser.username}</span>
                                    </div>
                                )}

                                <div className={styles.captionArea}>
                                    <textarea
                                        className={styles.captionInput}
                                        placeholder="What's the story behind this vision?..."
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                        disabled={isPending}
                                        maxLength={2200}
                                    />
                                    <div className={styles.toolsRow}>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <button className={styles.toolBtn} title="Emojis"><Smile size={22} /></button>
                                            <button
                                                className={styles.toolBtn}
                                                onClick={generateAICaption}
                                                disabled={isGeneratingCaption}
                                            >
                                                {isGeneratingCaption ? <Loader2 className="animate-spin" size={22} /> : <Sparkles size={22} />}
                                            </button>
                                        </div>
                                        <div className={styles.charCount}>{caption.length}/2,200</div>
                                    </div>
                                </div>

                                <div className={styles.optionsList}>
                                    <div className={styles.optionItem} onClick={() => setLocation("Digital Space, Web")}>
                                        <span className={styles.optionLabel}>Location</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span className={styles.optionValue}>{location || "Add place"}</span>
                                            <MapPin size={18} color="#9ca3af" />
                                        </div>
                                    </div>
                                    <div className={styles.optionItem}>
                                        <span className={styles.optionLabel}>Tag Connections</span>
                                        <ChevronDown size={20} color="#9ca3af" />
                                    </div>
                                </div>

                                <div className={styles.filtersSection}>
                                    <div className={styles.filtersTitle}>Visual Aesthetics</div>
                                    <div className={styles.filtersGrid}>
                                        {FILTERS.map((filter) => (
                                            <div
                                                key={filter.name}
                                                className={styles.filterItem}
                                                onClick={() => setActiveFilter(filter)}
                                            >
                                                <div className={`${styles.filterPreview} ${activeFilter.name === filter.name ? styles.active : ''}`}>
                                                    {mediaItems[currentMediaIndex].type === 'image' ? (
                                                        <Image
                                                            src={mediaItems[currentMediaIndex].url}
                                                            alt={filter.name}
                                                            style={{ filter: filter.value }}
                                                            width={100} height={100}
                                                        />
                                                    ) : (
                                                        <div className={styles.videoFilterPlaceholder}><Upload size={16} /></div>
                                                    )}
                                                </div>
                                                <span className={`${styles.filterName} ${activeFilter.name === filter.name ? styles.activeText : ''}`}>{filter.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <motion.div
                            className={styles.uploadArea}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className={styles.uploadIconWrap}>
                                <Upload size={56} strokeWidth={1} />
                            </div>
                            <h2 className={styles.uploadText}>Experience the future of digital sharing</h2>

                            <div className={styles.uploadButtonsRow}>
                                <label className={styles.selectButton}>
                                    Select Media
                                    <input type="file" hidden onChange={handleFileChange} accept="image/*,video/*" multiple />
                                </label>

                                {Capacitor.isNativePlatform() && (
                                    <button className={styles.captureButton} onClick={takePhoto}>
                                        <CameraIcon size={20} />
                                        Capture
                                    </button>
                                )}
                            </div>

                            <p style={{ color: '#9ca3af', fontSize: '14px', fontWeight: 600 }}>Drag and drop media here</p>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default CreatePostPage;
