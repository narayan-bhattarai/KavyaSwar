import JSZip from 'jszip';
import type { KavyaDocument } from '../lib/types';
import { saveBlob, saveDocument, saveVoiceNote, getBlob } from '../lib/db';

export const createKavyaPackage = async (
    document: KavyaDocument
): Promise<Blob> => {
    const zip = new JSZip();

    // Add metadata
    zip.file('metadata.json', JSON.stringify(document, null, 2));

    // Add audio/files


    // Helper to fetch and add to zip
    const addToZip = async (id: string, path: string) => {
        const blobEntry = await getBlob(id);
        if (blobEntry) {
            if (path) {
                // if path has slash
                if (path.includes('/')) {
                    const parts = path.split('/');
                    const folder = zip.folder(parts[0]);
                    folder?.file(parts[1], blobEntry.data);
                } else {
                    zip.file(path, blobEntry.data);
                }
            }
        }
    };

    // 1. PDF Source
    if (document.pdfSourceId) {
        await addToZip(document.pdfSourceId, `${document.pdfSourceId}.pdf`);
    }

    // 2. Page Audio
    if (document.pages) {
        for (const page of document.pages) {
            if (page.audioId) {
                await addToZip(page.audioId, `audio/${page.audioId}.m4a`);
            }
        }
    }

    // 3. Legacy Poems
    const docAny = document as any;
    if (docAny.poems) {
        for (const poem of docAny.poems) {
            if (poem.audioId) {
                await addToZip(poem.audioId, `audio/${poem.audioId}.m4a`);
            }
            if (poem.type === 'pdf' && poem.fileRef) {
                await addToZip(poem.fileRef, `${poem.fileRef}.pdf`);
            }
        }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    return content;
};

export const parseKavyaPackage = async (file: File): Promise<string> => {
    const zip = new JSZip();
    const unzip = await zip.loadAsync(file);

    // Read metadata
    const metadataFile = unzip.file('metadata.json');
    if (!metadataFile) throw new Error('Invalid .kavyaSwar file: missing metadata.json');

    const metadataText = await metadataFile.async('text');
    const document: KavyaDocument = JSON.parse(metadataText);

    // Extract and save blobs

    // Helper to save blob
    const saveZipFile = async (paramId: string, zipPath: string, type: string) => {
        const file = unzip.file(zipPath);
        if (file) {
            const blob = await file.async('blob');
            await saveBlob(paramId, blob, type);
        }
    };

    // Iterate through content to find linked audio/files
    const docAny = document as any;

    // 1. Handle Legacy Poems
    if (docAny.poems) {
        for (const poem of docAny.poems) {
            if (poem.audioId) {
                await saveZipFile(poem.audioId, `audio/${poem.audioId}.m4a`, 'audio/m4a');
            }
        }
    }

    // 2. Handle New PDF Pages
    if (document.pages) {
        for (const page of document.pages) {
            if (page.audioId) {
                await saveZipFile(page.audioId, `audio/${page.audioId}.m4a`, 'audio/m4a');
            }
        }
    }

    // 3. Handle Main PDF Source
    if (document.pdfSourceId) {
        // Assume it's at root with id.pdf
        await saveZipFile(document.pdfSourceId, `${document.pdfSourceId}.pdf`, 'application/pdf');
    }

    // Save document metadata
    await saveDocument({
        ...document,
        // Ensure sourceType is set gracefully
        sourceType: document.pdfSourceId ? 'mixed' : ((docAny.sourceType as any) || 'text')
    });

    // Re-construct VoiceNotes entries (Legacy)
    if (docAny.poems) {
        for (const poem of docAny.poems) {
            if (poem.audioId && poem.hasAudio) {
                await saveVoiceNote({
                    id: crypto.randomUUID(),
                    documentId: document.id,
                    poemId: poem.id,
                    audioId: poem.audioId,
                    duration: poem.audioDuration || 0,
                    createdAt: Date.now()
                });
            }
        }
    }

    // Re-construct VoiceNotes entries (New Pages)
    if (document.pages) {
        for (const page of document.pages) {
            if (page.audioId) {
                await saveVoiceNote({
                    id: crypto.randomUUID(),
                    documentId: document.id,
                    poemId: `page-${page.pageNumber}`,
                    audioId: page.audioId,
                    duration: page.audioDuration || 0,
                    createdAt: Date.now()
                });
            }
        }
    }

    return document.id;
};
