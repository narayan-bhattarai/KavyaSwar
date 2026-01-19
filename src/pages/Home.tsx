import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PenTool, ArrowRight, Book, Clock, Music } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAllDocuments } from '../lib/db';
import type { KavyaDocument } from '../lib/types';
import Layout from '../components/Layout';

const Home = () => {
    const navigate = useNavigate();
    const [docs, setDocs] = useState<KavyaDocument[]>([]);
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        loadDocs();
        setTimeGreeting();
    }, []);

    const loadDocs = async () => {
        const documents = await getAllDocuments();
        // Sort by most recent
        setDocs(documents.reverse());
    };

    const setTimeGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    };

    const GradiantCover = ({ id }: { id: string }) => {
        // Deterministic gradient based on ID
        const colors = [
            'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 99%, #FECFEF 100%)',
            'linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)',
            'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',
            'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)',
            'linear-gradient(120deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)',
        ];
        const index = id.charCodeAt(0) % colors.length;

        return (
            <div style={{
                width: '100%',
                aspectRatio: '1',
                background: colors[index],
                borderRadius: '8px',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(255,255,255,0.2), transparent)' }}></div>
                <Music size={48} color="white" style={{ opacity: 0.8 }} />
            </div>
        );
    }

    return (
        <Layout title="KavyaSwar Library">
            <div className="container" style={{ padding: '1.5rem 2.5rem', maxWidth: '1400px', margin: '0 auto' }}>

                {/* Greeting Header */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginBottom: '1.5rem' }}
                >
                    <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-serif)', color: 'white', marginBottom: '0.25rem' }}>
                        {greeting}
                    </h1>
                </motion.div>

                {/* Hero / Create Bundle */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>

                    {/* Create New Action Card */}
                    <motion.div
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => navigate('/create')}
                        style={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', // Vibrant Indigo->Purple (Lively)
                            borderRadius: '16px',
                            padding: '1.75rem',
                            color: 'white',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minHeight: '200px',
                            boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)'
                        }}
                    >
                        {/* Abstract Background Decoration */}
                        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)', borderRadius: '50%' }}></div>

                        <div style={{ position: 'relative', zIndex: 10 }}>
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '50%',
                                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '1rem'
                            }}>
                                <PenTool size={18} />
                            </div>
                            <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-serif)', marginBottom: '0.25rem' }}>Compose New</h2>
                            <p style={{ opacity: 0.9, fontSize: '0.85rem', maxWidth: '250px' }}>Upload PDF & record voice.</p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '0.75rem', marginTop: '1rem' }}>
                            Start Studio <ArrowRight size={14} />
                        </div>
                    </motion.div>
                </div>

                {/* Library Grid */}
                <section>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-serif)', color: 'var(--color-ink)' }}>Your Collection</h2>
                        <span style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700, letterSpacing: '1px' }}>{docs.length} AUDIO BOOKS</span>
                    </div>

                    {docs.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--color-surface)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
                            <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>Your library is empty.</p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                            gap: '1.5rem'
                        }}>
                            {docs.map((doc, i) => (
                                <motion.div
                                    key={doc.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    whileHover={{ y: -5 }}
                                    onClick={() => navigate(`/read/${doc.id}`)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <GradiantCover id={doc.id} />

                                    <h3 style={{
                                        fontSize: '0.95rem',
                                        fontWeight: 600,
                                        color: 'var(--color-ink)',
                                        marginBottom: '0.15rem',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {doc.title}
                                    </h3>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.6, fontSize: '0.75rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                            <Book size={12} /> PDF
                                        </span>
                                        <span>•</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                            <Clock size={12} /> {new Date(doc.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </Layout>
    );
};

export default Home;
