import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home as HomeIcon, Settings, Plus, Trash2 } from 'lucide-react';
import { getAllDocuments, deleteDocument } from '../lib/db';
import type { KavyaDocument } from '../lib/types';

interface LayoutProps {
    children: ReactNode;
    title?: string;
    actions?: ReactNode; // Extra buttons in top bar
}

const Layout = ({ children, title, actions }: LayoutProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [hoveredDocId, setHoveredDocId] = useState<string | null>(null);

    const [docs, setDocs] = useState<KavyaDocument[]>([]);

    useEffect(() => {
        loadDocs();
    }, [location.pathname]);

    const loadDocs = async () => {
        const documents = await getAllDocuments();
        setDocs(documents.reverse());
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this book completely?")) return;

        try {
            await deleteDocument(id);
            // If we deleted the current page, go home
            if (location.pathname === `/read/${id}`) {
                navigate('/');
            } else {
                loadDocs(); // Refresh list
            }
        } catch (err) {
            console.error(err);
        }
    };

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="app-layout" style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--color-bg)', color: 'var(--color-ink)' }}>
            {/* Sidebar */}
            <aside className="sidebar" style={{
                width: '260px',
                backgroundColor: '#121212', // Very dark background like Spotify/Apple Music
                color: '#b3b3b3',
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid #282828'
            }}>
                <div className="sidebar-header" style={{ padding: '1.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                    <img src="/logo.png" alt="KavyaSwar" style={{ width: '160px', height: 'auto', objectFit: 'contain' }} />
                </div>

                <div className="sidebar-content" style={{ flex: 1, overflowY: 'auto', padding: '0 1rem' }}>

                    <div style={{ marginBottom: '2rem' }}>
                        <div
                            onClick={() => navigate('/')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '1rem',
                                padding: '0.75rem 1rem', borderRadius: '6px',
                                cursor: 'pointer',
                                color: isActive('/') ? 'white' : 'inherit',
                                backgroundColor: isActive('/') ? '#282828' : 'transparent',
                                fontWeight: isActive('/') ? 600 : 500,
                                transition: 'all 0.2s'
                            }}
                        >
                            <HomeIcon size={22} />
                            <span>Home</span>
                        </div>
                    </div>

                    <div style={{ marginBottom: '0.5rem', paddingLeft: '1rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6 }}>
                        Your Library
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {docs.map(doc => (
                            <div
                                key={doc.id}
                                onClick={() => navigate(`/read/${doc.id}`)}
                                onMouseEnter={() => setHoveredDocId(doc.id)}
                                onMouseLeave={() => setHoveredDocId(null)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0.6rem 1rem', borderRadius: '4px', cursor: 'pointer',
                                    backgroundColor: location.pathname === `/read/${doc.id}` ? '#282828' : 'transparent',
                                    color: location.pathname === `/read/${doc.id}` ? 'white' : '#b3b3b3',
                                    transition: 'color 0.2s'
                                }}
                                className="group hover:text-white"
                            >
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem' }}>{doc.title}</span>

                                {hoveredDocId === doc.id && (
                                    <button
                                        onClick={(e) => handleDelete(e, doc.id)}
                                        style={{
                                            background: 'transparent',
                                            color: '#ef4444',
                                            border: 'none',
                                            padding: '2px',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center'
                                        }}
                                        title="Delete Book"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            onClick={() => navigate('/create')}
                            className="hover:text-white transition-colors"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.6rem 1rem', marginTop: '0.5rem',
                                color: '#b3b3b3', cursor: 'pointer', fontSize: '0.9rem'
                            }}
                        >
                            <div style={{ width: '24px', height: '24px', background: '#ccc', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black' }}>
                                <Plus size={16} strokeWidth={3} />
                            </div>
                            <span>Create Playlist</span>
                        </button>
                    </div>

                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid #282828' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#b3b3b3', cursor: 'not-allowed', opacity: 0.6 }}>
                        <Settings size={20} />
                        <span style={{ fontSize: '0.9rem' }}>Settings</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(to bottom, #1e1e1e 0%, #121212 100%)' }}>
                {/* Top Bar - nicely blended */}
                <header className="top-bar" style={{ padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {/* Navigation back/forward could go here */}
                        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', opacity: title ? 1 : 0 }}>
                            {title}
                        </h1>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {actions}
                    </div>
                </header>

                {/* Page Content */}
                <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
