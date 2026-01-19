import { useState, useRef, useEffect } from 'react';
import { Mic, Square, RotateCcw, Trash2 } from 'lucide-react';

interface AudioRecorderProps {
    onRecordingComplete: (audioData: { blob: Blob, duration: number, id: string }) => void;
    onDelete?: () => void;
    existingAudio?: string;
}

const AudioRecorder = ({ onRecordingComplete, onDelete, existingAudio }: AudioRecorderProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(existingAudio || null);

    // Sync local state when existingAudio prop changes (e.g., page navigation)
    useEffect(() => {
        setAudioUrl(existingAudio || null);
    }, [existingAudio]);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const audioContextRef = useRef<AudioContext | null>(null); // Added audioContextRef

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/m4a' });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                let duration = 0;
                if (audioContextRef.current && startTimeRef.current) {
                    duration = audioContextRef.current.currentTime - startTimeRef.current;
                }
                // Generate a simple unique ID for the recording
                const id = `rec-${Date.now()}`;
                onRecordingComplete({ blob, duration, id });

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0); // Changed from setDuration(0) to setRecordingTime(0)

            // Create Audio Context to track time accurately
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            startTimeRef.current = audioContextRef.current.currentTime;

            timerRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access microphone. Please ensure permissions are granted.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);

            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    };

    const handleDelete = () => {
        setAudioUrl(null);
        if (onDelete) { // Make sure onDelete is defined before calling
            onDelete();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (audioUrl) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', width: '100%', justifyContent: 'space-between' }}>
                <audio src={audioUrl} controls style={{ height: '32px', flex: 1, maxWidth: '200px' }} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setAudioUrl(null)}
                        title="Re-record"
                        style={{
                            width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--color-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', backgroundColor: 'var(--color-paper)', color: 'var(--color-ink)'
                        }}
                    >
                        <RotateCcw size={16} />
                    </button>
                    <button
                        onClick={handleDelete}
                        title="Delete Recording"
                        style={{
                            width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #fee2e2',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', backgroundColor: '#fef2f2', color: '#ef4444'
                        }}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            {!isRecording ? (
                <button
                    onClick={startRecording}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '1rem 2rem', borderRadius: '9999px',
                        backgroundColor: 'transparent',
                        border: '2px solid var(--color-ink)',
                        color: 'var(--color-ink)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <Mic size={20} />
                    Record Voice
                </button>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '100%', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '1.25rem', color: '#ef4444', fontWeight: 700 }} className="animate-pulse">
                        {formatTime(recordingTime)}
                    </span>
                    <button
                        onClick={stopRecording}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.75rem 1.5rem', borderRadius: '9999px',
                            backgroundColor: '#ef4444',
                            border: 'none',
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                        }}
                    >
                        <Square size={16} fill="white" />
                        Stop
                    </button>
                </div>
            )}
        </div>
    );
};

export default AudioRecorder;
