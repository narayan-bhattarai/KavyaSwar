
import { createClient } from '@supabase/supabase-js';
import type { KavyaDocument, KavyaPage } from './types';

// Initialize Supabase Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);



export const initDB = async () => {
    // No-op for Supabase, but keeping signature compatible if needed
    return null;
};

// --- DATA ACCESS METHODS ---

export const saveDocument = async (doc: KavyaDocument & { sourceType?: string }) => {
    // 1. Upsert Document
    const { error: docError } = await supabase
        .from('kavya_documents')
        .upsert({
            id: doc.id,
            title: doc.title,
            author: doc.author,
            poetry_type: doc.poetryType, // Mapped from camelCase
            pdf_source_path: doc.pdfSourceId, // Storing ID/Path mapping
            created_at: new Date(doc.createdAt).toISOString()
        });

    if (docError) throw docError;

    // 2. Clear old pages? Or Upsert pages?
    // Easiest is to delete old pages and insert new ones to handle removals
    // But for a simple app sending all pages, we can just upsert.
    // Let's delete existing pages first to be safe (clean overwrite)
    await supabase.from('kavya_pages').delete().eq('document_id', doc.id);

    if (doc.pages && doc.pages.length > 0) {
        const pagesToInsert = doc.pages.map(p => ({
            document_id: doc.id,
            page_number: p.pageNumber,
            audio_path: p.audioId, // Using audioId as path ref
            audio_duration: p.audioDuration
        }));

        const { error: pageError } = await supabase
            .from('kavya_pages')
            .insert(pagesToInsert);

        if (pageError) throw pageError;
    }

    return doc.id;
};

export const getDocument = async (id: string): Promise<KavyaDocument | undefined> => {
    // 1. Get Document
    const { data: docData, error: docError } = await supabase
        .from('kavya_documents')
        .select('*')
        .eq('id', id)
        .single();

    if (docError || !docData) return undefined;

    // 2. Get Pages
    const { data: pageData, error: pageError } = await supabase
        .from('kavya_pages')
        .select('*')
        .eq('document_id', id)
        .order('page_number', { ascending: true });

    if (pageError) return undefined;

    // 3. Map to Types
    const pages: KavyaPage[] = (pageData || []).map((p: any) => ({
        pageNumber: p.page_number,
        audioId: p.audio_path,
        audioDuration: p.audio_duration
    }));

    return {
        id: docData.id,
        title: docData.title,
        author: docData.author,
        poetryType: docData.poetry_type,
        createdAt: new Date(docData.created_at).getTime(),
        pdfSourceId: docData.pdf_source_path,
        pages: pages
    };
};

export const getAllDocuments = async (): Promise<KavyaDocument[]> => {
    const { data, error } = await supabase
        .from('kavya_documents')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return [];

    return data.map((d: any) => ({
        id: d.id,
        title: d.title,
        author: d.author,
        poetryType: d.poetry_type,
        createdAt: new Date(d.created_at).getTime(),
        pdfSourceId: d.pdf_source_path,
        pages: [] // List view doesn't need pages usually
    }));
};

export const deleteDocument = async (id: string) => {
    // 1. Get Document to find assets to delete (Optional cleanup)
    const doc = await getDocument(id);
    if (doc) {
        const filesToDelete: string[] = [];
        if (doc.pdfSourceId) filesToDelete.push(doc.pdfSourceId);
        if (doc.pages) {
            doc.pages.forEach(p => {
                if (p.audioId) filesToDelete.push(p.audioId);
            });
        }

        if (filesToDelete.length > 0) {
            await supabase.storage.from('kavya-assets').remove(filesToDelete);
        }
    }

    // 2. Delete from DB (Cascades pages)
    const { error } = await supabase.from('kavya_documents').delete().eq('id', id);
    if (error) throw error;
};

// --- BLOB / STORAGE METHODS ---

export const saveBlob = async (id: string, data: Blob, mimeType: string) => {
    // Upload to 'kavya-assets' bucket
    // ID will be the path
    const { error } = await supabase.storage
        .from('kavya-assets')
        .upload(id, data, {
            contentType: mimeType,
            upsert: true
        });

    if (error) {
        console.error("Storage upload failed", error);
        throw error;
    }
};

export const getBlob = async (id: string) => {
    // Create a Blob from the downloaded file
    const { data, error } = await supabase.storage
        .from('kavya-assets')
        .download(id);

    if (error) {
        console.error("Storage download failed", id, error);
        return undefined;
    }

    if (!data) return undefined;

    return {
        id,
        data,
        mimeType: data.type
    };
};

// Legacy shim for voice notes if needed (not actively used in new flow but kept for type compat)
export const saveVoiceNote = async (note: any) => {
    // No-op or map to pages if needed. createKavya handles mapping.
    console.log("saveVoiceNote called (shim)", note);
};
