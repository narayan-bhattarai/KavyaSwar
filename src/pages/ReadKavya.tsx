import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getDocument, getBlob } from '../lib/db';
import type { KavyaDocument } from '../lib/types';
import { Play, Pause, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';

// PDF.js worker setup
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import Layout from '../components/Layout';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const ReadKavya = () => {
    const { id } = useParams<{ id: string }>();
    const [doc, setDoc] = useState<KavyaDocument | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Legacy & New State
    const [audioUrls, setAudioUrls] = useState<{ [key: string]: string }>({});
    const [pdfUrls, setPdfUrls] = useState<{ [key: string]: string }>({});
    const [mainPdfUrl, setMainPdfUrl] = useState<string | null>(null);

    const [playingId, setPlayingId] = useState<string | null>(null);
    const [isPlayerCollapsed, setIsPlayerCollapsed] = useState(false);
    const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});

    // PDF Navigation for unified view
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [numPages, setNumPages] = useState<number>(0);

    // PDF Responsive Sizing (Moved up to fix Hook Rules)
    const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [pageAspectRatio, setPageAspectRatio] = useState<number | null>(null);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
            }
        });

        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const onPageLoad = (page: any) => setPageAspectRatio(page.width / page.height);

    const getPageSizeProps = () => {
        if (!containerSize) return { height: window.innerHeight - 100 };
        const { width, height } = containerSize;
        if (!pageAspectRatio) return { height: height - 40 };
        const containerRatio = width / height;
        return pageAspectRatio > containerRatio ? { width: width - 40 } : { height: height - 40 };
    };

    useEffect(() => {
        // Reset state immediately when ID changes to prevent stale data/page numbers
        setCurrentPage(1);
        setNumPages(0);
        setPageAspectRatio(null);
        setLoading(true);
        setError(null);

        const loadData = async () => {
            if (!id) return;
            try {
                console.log("Loading doc:", id);
                const document = await getDocument(id);
                if (document) {
                    setDoc(document);
                    const aUrls: { [key: string]: string } = {};

                    // Handle New PDF-Centric Model
                    if (document.pdfSourceId) {
                        console.log("Found PDF Source ID:", document.pdfSourceId);
                        const pdfBlob = await getBlob(document.pdfSourceId);
                        if (pdfBlob) {
                            console.log("PDF Blob loaded, size:", pdfBlob.data.size);
                            setMainPdfUrl(URL.createObjectURL(pdfBlob.data));
                        } else {
                            console.error("PDF Blob NOT found in DB");
                            setError("PDF file data is missing or corrupted.");
                        }

                        // Load Audio for Pages
                        if (document.pages) {
                            for (const page of document.pages) {
                                if (page.audioId) {
                                    const blobEntry = await getBlob(page.audioId);
                                    if (blobEntry) aUrls[page.audioId] = URL.createObjectURL(blobEntry.data);
                                }
                            }
                        }
                    }
                    // Handle Legacy Poem[] Model
                    else if ((document as any).poems) {
                        const pUrls: { [key: string]: string } = {};
                        for (const poem of (document as any).poems) {
                            if (poem.audioId) {
                                const blobEntry = await getBlob(poem.audioId);
                                if (blobEntry) aUrls[poem.audioId] = URL.createObjectURL(blobEntry.data);
                            }
                            if (poem.type === 'pdf' && poem.fileRef) {
                                const blobEntry = await getBlob(poem.fileRef);
                                if (blobEntry) pUrls[poem.fileRef] = URL.createObjectURL(blobEntry.data);
                            }
                        }
                        setPdfUrls(pUrls);
                    }
                    setAudioUrls(aUrls);
                } else {
                    console.error("Document not found in DB");
                    setError("Document not found.");
                }
            } catch (e) {
                console.error("Failed to load kavya", e);
                setError("Failed to load document.");
            } finally {
                setLoading(false);
            }
        };
        loadData();

        return () => {
            Object.values(audioUrls).forEach(url => URL.revokeObjectURL(url));
            Object.values(pdfUrls).forEach(url => URL.revokeObjectURL(url));
            if (mainPdfUrl) URL.revokeObjectURL(mainPdfUrl);
        };
    }, [id]);

    // Audio Visualization
    const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceMap = useRef<WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>>(new WeakMap());

    useEffect(() => {
        if (!canvasEl) return;

        let animationId: number;
        // Use a safe access or effect-scoped var if analyserRef is not immediately available, 
        // but since we want to animate regardless of playing to show 'idle' state:
        const ctx = canvasEl.getContext('2d');
        if (!ctx) return;

        const renderFrame = () => {
            const width = canvasEl.width;
            const height = canvasEl.height;
            ctx.clearRect(0, 0, width, height);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();

            // If playing and analyser exists, draw live wave
            if (playingId && analyserRef.current) {
                const analyser = analyserRef.current;
                const bufferLength = analyser.fftSize; // Use fftSize for time domain data
                const dataArray = new Uint8Array(bufferLength);
                analyser.getByteTimeDomainData(dataArray);

                const sliceWidth = width * 1.0 / bufferLength;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    const v = dataArray[i] / 128.0; // 128 is zero-crossing
                    const y = v * height / 2;

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }

                    x += sliceWidth;
                }
            } else {
                // Draw Flat Line
                ctx.moveTo(0, height / 2);
                ctx.lineTo(width, height / 2);
            }

            ctx.stroke();
            animationId = requestAnimationFrame(renderFrame);
        };

        renderFrame();

        return () => cancelAnimationFrame(animationId);
    }, [playingId, canvasEl]);

    const togglePlay = (audioId: string) => {
        let audio = audioElements[audioId];
        if (!audio) {
            audio = new Audio(audioUrls[audioId]);
            audio.crossOrigin = "anonymous";
            audio.onended = () => setPlayingId(null);
            setAudioElements(prev => ({ ...prev, [audioId]: audio }));
        }

        // Initialize Audio Context lazily
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
        }

        // Connect Source if not already
        if (audioContextRef.current && analyserRef.current && !sourceMap.current.has(audio)) {
            const source = audioContextRef.current.createMediaElementSource(audio);
            source.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current.destination);
            sourceMap.current.set(audio, source);
        }

        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }

        if (playingId && playingId !== audioId) {
            const current = audioElements[playingId];
            if (current) {
                current.pause();
                current.currentTime = 0;
            }
            setPlayingId(null);
        }

        if (playingId === audioId) {
            audio.pause();
            setPlayingId(null);
        } else {
            audio.play();
            setPlayingId(audioId);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
    if (error) return <div className="h-screen flex items-center justify-center text-red-500 font-bold">{error}</div>;
    if (!doc) return <div className="h-screen flex items-center justify-center">Kavya not found.</div>;


    // Explicitly handle New Doc Type
    if (doc.pdfSourceId) {
        if (!mainPdfUrl) {
            return (
                <Layout title={doc.title}>
                    <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-black/5">
                        <div className="animate-pulse text-xl font-serif opacity-50">Loading Document...</div>
                    </div>
                </Layout>
            );
        }

        // Find audio for current page
        const currentPageData = doc.pages?.find(p => p.pageNumber === currentPage);
        const hasAudio = currentPageData?.audioId && audioUrls[currentPageData.audioId];
        const currentAudioId = currentPageData?.audioId;
        const isPlaying = currentAudioId && playingId === currentAudioId;

        const headerControls = (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    backgroundColor: 'white',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '24px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}>
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="p-1.5 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-30 flex items-center justify-center cursor-pointer"
                        style={{ color: 'black' }}
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <span style={{
                        color: 'black',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        minWidth: '3.5rem',
                        textAlign: 'center',
                        fontFamily: 'var(--font-serif)',
                        fontVariantNumeric: 'tabular-nums'
                    }}>
                        {currentPage} <span style={{ opacity: 0.4, fontWeight: 400 }}>/ {numPages}</span>
                    </span>

                    <button
                        onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                        disabled={currentPage >= numPages}
                        className="p-1.5 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-30 flex items-center justify-center cursor-pointer"
                        style={{ color: 'black' }}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        );

        return (
            <Layout title={doc.title} actions={headerControls}>
                <div ref={containerRef} className="reader-container"
                    onTouchStart={() => setIsPlayerCollapsed(true)} // Auto-collapse on touch
                    style={{
                        position: 'relative',
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        backgroundColor: '#0a0a0a',
                        backgroundImage: 'radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)',
                        minHeight: '400px' // Safety constraint
                    }}>

                    {/* PDF Viewer - Centered */}
                    <div style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1,
                        width: '100%',
                        height: '100%',
                        padding: '2rem'
                    }}>
                        <div
                            onContextMenu={(e) => e.preventDefault()}
                            style={{
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                display: 'flex',
                                justifyContent: 'center'
                            }}>
                            <div style={{
                                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                transition: 'all 0.3s ease',
                            }}>
                                <Document
                                    file={mainPdfUrl}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    loading={<div className="text-white/50 animate-pulse">Loading Book...</div>}
                                >
                                    <Page
                                        pageNumber={currentPage}
                                        onLoadSuccess={onPageLoad}
                                        onLoadError={(error) => console.error("PDF Page specific load error:", error)}
                                        {...getPageSizeProps()}
                                        className="bg-white"
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                    />
                                </Document>
                            </div>
                        </div>
                    </div>

                    {/* Floating Metadata & Visualizer Card */}
                    <div className={`player-overlay-card ${isPlayerCollapsed ? 'collapsed' : ''}`}>
                        {/* Collapse Toggle (Mobile mostly) */}
                        <button
                            onClick={() => setIsPlayerCollapsed(!isPlayerCollapsed)}
                            className="collapse-btn bg-transparent border-none text-white absolute top-2 right-2 p-2 cursor-pointer opacity-50 hover:opacity-100 z-20"
                        >
                            {isPlayerCollapsed ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>

                        {!isPlayerCollapsed && (
                            <>
                                <div>
                                    <h1 style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 600,
                                        marginBottom: '0.35rem',
                                        lineHeight: 1.4,
                                        color: 'white',
                                        wordBreak: 'break-word',
                                        letterSpacing: '-0.01em',
                                        paddingRight: '2.5rem' // Prevent overlap with collapse button
                                    }}>
                                        {doc.title}
                                    </h1>
                                    {doc.author && (
                                        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                                            {doc.author}
                                        </p>
                                    )}
                                    {doc.poetryType && (
                                        <div style={{ marginTop: '0.75rem' }}>
                                            <span style={{
                                                fontSize: '0.65rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.1em',
                                                padding: '0.25rem 0.6rem',
                                                backgroundColor: 'rgba(255,255,255,0.08)',
                                                borderRadius: '6px',
                                                color: 'rgba(255,255,255,0.8)',
                                                fontWeight: 600,
                                                border: '1px solid rgba(255,255,255,0.05)'
                                            }}>
                                                {doc.poetryType}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Audio Visualizer Area */}
                                <div style={{
                                    height: '100px',
                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <canvas ref={setCanvasEl} width={250} height={100} style={{ width: '100%', height: '100%' }} />
                                </div>
                            </>
                        )}

                        {/* Minimized View Header */}
                        {isPlayerCollapsed && (
                            <div style={{ marginBottom: '0.5rem' }}>
                                <h1 style={{
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    color: 'white',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    paddingRight: '2rem'
                                }}>
                                    {doc.title}
                                </h1>
                            </div>
                        )}

                        {/* Floating Play Button integrated in card */}
                        {hasAudio && (
                            <button
                                onClick={currentAudioId ? () => togglePlay(currentAudioId) : undefined}
                                disabled={!currentAudioId}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '12px',
                                    backgroundColor: isPlaying ? 'white' : 'rgba(255,255,255,0.1)',
                                    color: isPlaying ? 'black' : 'white',
                                    border: 'none',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    cursor: currentAudioId ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    transition: 'all 0.2s',
                                    opacity: currentAudioId ? 1 : 0.5
                                }}
                            >
                                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                                {isPlaying ? 'Pause' : (currentAudioId ? 'Play Narration' : 'No Audio')}
                            </button>
                        )}
                    </div>
                </div>
            </Layout>
        );
    }

    // RENDER: Legacy View (Fallback)
    return (
        <Layout title={doc.title}>
            <div className="container py-8 max-w-2xl bg-paper" style={{ margin: '0 auto' }}>
                <div className="space-y-16">
                    {(doc as any).poems?.map((poem: any, index: number) => (
                        <motion.div key={poem.id} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="flex flex-col items-center w-full">
                            <div className="w-full mb-6 leading-relaxed text-lg font-serif whitespace-pre-wrap text-center">
                                {poem.type === 'pdf' && poem.fileRef && pdfUrls[poem.fileRef] ? (
                                    <div className="w-full h-[600px] border border-border rounded-lg overflow-hidden bg-white shadow-sm">
                                        <iframe src={pdfUrls[poem.fileRef]} className="w-full h-full" title={`Page ${index + 1}`} />
                                    </div>
                                ) : (
                                    poem.content && <p>{poem.content}</p>
                                )}
                            </div>
                            {poem.audioId && audioUrls[poem.audioId] && (
                                <button onClick={() => togglePlay(poem.audioId!)} className={`btn-icon flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 ${playingId === poem.audioId ? 'bg-accent text-white shadow-md' : 'bg-surface border border-accent text-accent hover:bg-accent hover:text-white'}`}>
                                    {playingId === poem.audioId ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                                    <span className="text-sm font-medium">{playingId === poem.audioId ? 'Pause' : 'Listen'}</span>
                                </button>
                            )}
                            {index < ((doc as any).poems?.length || 0) - 1 && <div className="w-16 h-px bg-border my-16 opacity-50"></div>}
                        </motion.div>
                    ))}
                </div>
                <div className="h-32"></div>
            </div>
        </Layout>
    );
};

export default ReadKavya;
