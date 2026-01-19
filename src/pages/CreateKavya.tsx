
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import type { KavyaDocument, KavyaPage } from '../lib/types';
import { saveDocument, saveVoiceNote, saveBlob } from '../lib/db';
import AudioRecorder from '../components/AudioRecorder';
import Layout from '../components/Layout';

// Clickable layer issues sometimes
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const CreateKavya = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [poetryType, setPoetryType] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);

    // Audio State: Map page number to audio blob
    const [audioMap, setAudioMap] = useState<Map<number, { blob: Blob, duration: number, id: string }>>(new Map());

    const [isSaving, setIsSaving] = useState(false);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setCurrentPage(1);
    };

    const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPdfFile(file);
            setTitle(file.name.replace('.pdf', ''));
        }
    };

    const handleAudioRecorded = ({ blob, duration, id }: { blob: Blob, duration: number, id: string }) => {
        setAudioMap(prev => {
            const newMap = new Map(prev);
            newMap.set(currentPage, { blob, duration, id });
            return newMap;
        });
    };

    const handleAudioDeleted = () => {
        setAudioMap(prev => {
            const newMap = new Map(prev);
            newMap.delete(currentPage);
            return newMap;
        });
    };

    const handleSaveToLibrary = async () => {
        if (!title.trim() || !pdfFile) {
            alert('Please provide a title and upload a PDF.');
            return;
        }
        setIsSaving(true);
        try {
            const docId = crypto.randomUUID();
            const pdfId = crypto.randomUUID();

            // Construct Pages
            const pages: KavyaPage[] = [];
            for (let i = 1; i <= numPages; i++) {
                const audioData = audioMap.get(i);
                pages.push({
                    pageNumber: i,
                    audioId: audioData?.id,
                    audioDuration: audioData?.duration
                });
            }

            const document: KavyaDocument = {
                id: docId,
                title,
                author,
                poetryType,
                createdAt: Date.now(),
                pdfSourceId: pdfId,
                pages
            };

            // Save DB Entry
            await saveDocument({
                ...document,
                sourceType: 'mixed' // Re-using mixed for now, or could define 'pdf-centric' or 'pdf'
            });

            // Save PDF Blob
            await saveBlob(pdfId, pdfFile, 'application/pdf');

            // Save Audio Blobs
            for (const [page, data] of audioMap.entries()) {
                await saveBlob(data.id, data.blob, 'audio/m4a');
                await saveVoiceNote({
                    id: crypto.randomUUID(),
                    documentId: docId,
                    poemId: `page-${page}`, // Virtual ID since we don't have poem objects anymore
                    audioId: data.id,
                    duration: data.duration,
                    createdAt: Date.now()
                });
            }

            alert("Saved to library successfully! You can now read/listen to it from the home page.");
            navigate('/');
        } catch (e) {
            console.error(e);
            alert("Failed to save.");
        } finally {
            setIsSaving(false);
        }
    };

    const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [pageAspectRatio, setPageAspectRatio] = useState<number | null>(null);

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                setContainerSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });

        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const onPageLoadSuccess = (page: any) => {
        setPageAspectRatio(page.width / page.height);
    };

    const getPageSize = () => {
        if (!containerSize || !pageAspectRatio) return { width: undefined }; // specific undefined to let valid defaults take over if needed
        const { width: cWidth, height: cHeight } = containerSize;
        const availableWidth = cWidth - 48; // Padding
        const availableHeight = cHeight - 48;
        const containerRatio = availableWidth / availableHeight;

        if (pageAspectRatio > containerRatio) {
            // Page is wider (relative to container) -> Constrain by Width
            return { width: availableWidth };
        } else {
            // Page is taller -> Constrain by Height
            return { height: availableHeight };
        }
    };

    return (
        <Layout title="Studio">

            {/* Main Content Area */}
            {!pdfFile ? (
                /* Empty Upload State (Unchanged...) */
                <div className="flex-1 flex flex-col items-center justify-center" style={{ padding: '3rem', backgroundColor: 'var(--color-paper)' }}>
                    <div style={{ maxWidth: '600px', width: '100%', borderRadius: '12px' }}>
                        <div className="text-center" style={{ marginBottom: '3rem' }}>
                            <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontFamily: 'var(--font-serif)', color: 'var(--color-ink)' }}>Create Audio Book</h1>
                            <p style={{ fontSize: '1.2rem', opacity: 0.6, maxWidth: '450px', margin: '0 auto', color: 'var(--color-ink)' }}>
                                Transform your PDF documents into immersive audio experiences.
                            </p>
                        </div>

                        <div className="group cursor-pointer relative"
                            style={{
                                backgroundColor: 'var(--color-surface)',
                                border: '2px dashed var(--color-border)',
                                borderRadius: '24px',
                                padding: '5rem 2rem',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                            }}>

                            <input
                                type="file"
                                accept="application/pdf"
                                className="absolute"
                                style={{ inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }}
                                onChange={handlePdfUpload}
                            />

                            <div style={{
                                width: '90px',
                                height: '90px',
                                borderRadius: '50%', // fixed syntax error from previous read if any
                                backgroundColor: 'var(--color-paper)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '2rem',
                                transition: 'transform 0.3s ease',
                                boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)'
                            }} className="group-hover:scale-110">
                                <Upload size={36} style={{ color: 'var(--color-accent)' }} />
                            </div>

                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'var(--color-ink)' }}>Upload PDF Document</h2>
                            <p style={{ opacity: 0.5, marginBottom: '2.5rem', color: 'var(--color-ink)', fontSize: '1rem' }}>Max file size 50MB</p>

                            <button style={{
                                padding: '0.875rem 2.5rem',
                                borderRadius: '9999px',
                                fontWeight: '600',
                                backgroundColor: 'var(--color-ink)',
                                color: 'var(--color-paper)',
                                border: 'none',
                                boxShadow: '0 10px 20px -5px rgba(0,0,0,0.2)',
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}>
                                Select File
                            </button>
                        </div>

                        {/* Horizontal Steps */}
                        <div style={{ marginTop: '5rem', position: 'relative', width: '100%', maxWidth: '400px', margin: '5rem auto 0 auto' }}>
                            {/* Connecting Line */}
                            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '2px', backgroundColor: 'var(--color-border)', zIndex: 0 }}></div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-paper)', padding: '0 0.5rem' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', backgroundColor: 'var(--color-accent)' }}>1</div>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 'bold', opacity: 0.8, color: 'var(--color-ink)' }}>Upload</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-paper)', padding: '0 0.5rem' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-ink)' }}>2</div>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 'bold', opacity: 0.4, color: 'var(--color-ink)' }}>Record</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-paper)', padding: '0 0.5rem' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-ink)' }}>3</div>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 'bold', opacity: 0.4, color: 'var(--color-ink)' }}>Save</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Editor Workspace */
                /* Editor Workspace */
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: PDF Viewport - Scrollable */}
                    <div ref={containerRef} className="flex-1 bg-black/5 overflow-auto flex justify-center items-center relative p-8" style={{ backgroundColor: 'var(--color-surface)' }}>
                        <div className="relative" style={{ height: 'fit-content', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', minHeight: '600px' }}>
                            <Document
                                file={pdfFile}
                                onLoadSuccess={onDocumentLoadSuccess}
                                loading={<div className="p-12 text-center text-gray-500">Loading Document...</div>}
                            >
                                <Page
                                    pageNumber={currentPage}
                                    onLoadSuccess={onPageLoadSuccess}
                                    {...getPageSize()}
                                    className="bg-white"
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                />
                            </Document>
                        </div>
                    </div>

                    {/* Right: Studio Sidebar - Compact */}
                    <div style={{
                        width: '320px',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: 'var(--color-paper)',
                        borderLeft: '1px solid var(--color-border)',
                        boxShadow: '-4px 0 20px rgba(0,0,0,0.02)',
                        zIndex: 20
                    }}>
                        {/* Page Controls Section */}
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-ink)', opacity: 0.5, marginBottom: '0.1rem' }}>Page</h3>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '2rem', fontWeight: '800', fontFamily: 'var(--font-serif)', lineHeight: 1, color: 'var(--color-ink)' }}>{currentPage}</span>
                                        <span style={{ fontSize: '0.9rem', opacity: 0.4, color: 'var(--color-ink)' }}>/ {numPages}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.35rem' }}>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage <= 1}
                                        style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: '1px solid var(--color-border)',
                                            backgroundColor: 'var(--color-paper)',
                                            color: 'var(--color-ink)',
                                            opacity: currentPage <= 1 ? 0.3 : 1,
                                            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                                        disabled={currentPage >= numPages}
                                        style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: '1px solid var(--color-ink)',
                                            backgroundColor: 'var(--color-ink)',
                                            color: 'var(--color-paper)',
                                            opacity: currentPage >= numPages ? 0.3 : 1,
                                            cursor: currentPage >= numPages ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: '8px',
                                backgroundColor: audioMap.has(currentPage) ? 'rgba(34, 197, 94, 0.1)' : 'var(--color-surface)',
                                border: `1px solid ${audioMap.has(currentPage) ? 'rgba(34, 197, 94, 0.2)' : 'var(--color-border)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}>
                                <div style={{
                                    width: '6px', height: '6px', borderRadius: '50%',
                                    backgroundColor: audioMap.has(currentPage) ? '#22c55e' : 'var(--color-border)',
                                    boxShadow: audioMap.has(currentPage) ? '0 0 0 2px rgba(34, 197, 94, 0.1)' : 'none'
                                }}></div>
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: audioMap.has(currentPage) ? '#15803d' : 'var(--color-ink)',
                                    opacity: audioMap.has(currentPage) ? 1 : 0.6
                                }}>
                                    {audioMap.has(currentPage) ? 'Recorded' : 'No Audio'}
                                </span>
                            </div>
                        </div>

                        {/* Studio Section */}
                        <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', overflowY: 'auto' }}>
                            <div style={{
                                backgroundColor: 'var(--color-paper)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '12px',
                                padding: '0.25rem',
                                boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
                                marginBottom: '1rem'
                            }}>
                                {/* Audio Recorder - Compact */}
                                <div style={{ padding: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                                    <AudioRecorder
                                        key={currentPage}
                                        onRecordingComplete={handleAudioRecorded}
                                        onDelete={handleAudioDeleted}
                                        existingAudio={audioMap.get(currentPage) ? URL.createObjectURL(audioMap.get(currentPage)!.blob) : undefined}
                                    />
                                </div>
                            </div>

                            <p style={{ fontSize: '0.75rem', textAlign: 'center', color: 'var(--color-ink)', opacity: 0.5, lineHeight: 1.4, marginBottom: '1rem' }}>
                                Record narration for <strong>Page {currentPage}</strong>.
                            </p>

                            {/* Bottom Actions Area */}
                            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                                <input
                                    type="text"
                                    placeholder="Author Name"
                                    className="input"
                                    style={{
                                        width: '100%',
                                        padding: '0.6rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--color-border)',
                                        backgroundColor: 'var(--color-paper)',
                                        fontSize: '0.8rem',
                                        color: 'var(--color-ink)'
                                    }}
                                    value={author}
                                    onChange={(e) => setAuthor(e.target.value)}
                                />

                                <input
                                    type="text"
                                    placeholder="Type (e.g. Poem)"
                                    className="input"
                                    style={{
                                        width: '100%',
                                        padding: '0.6rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--color-border)',
                                        backgroundColor: 'var(--color-paper)',
                                        fontSize: '0.8rem',
                                        color: 'var(--color-ink)'
                                    }}
                                    value={poetryType}
                                    onChange={(e) => setPoetryType(e.target.value)}
                                />

                                <input
                                    type="text"
                                    placeholder="Book Title"
                                    className="input"
                                    style={{
                                        width: '100%',
                                        padding: '0.6rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--color-border)',
                                        backgroundColor: 'var(--color-paper)',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: 'var(--color-ink)'
                                    }}
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />

                                <button
                                    onClick={handleSaveToLibrary}
                                    disabled={isSaving}
                                    className="btn btn-primary"
                                    style={{
                                        justifyContent: 'center',
                                        padding: '0.5rem',
                                        fontSize: '0.85rem',
                                        borderRadius: '6px',
                                        opacity: isSaving ? 0.7 : 1,
                                        fontWeight: 500,
                                        marginTop: '0.5rem'
                                    }}
                                >
                                    {isSaving ? 'Saving...' : 'Save Book'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default CreateKavya;
