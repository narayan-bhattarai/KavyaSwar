import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { KavyaDocument } from './types';

interface KavyaDB extends DBSchema {
    documents: {
        key: string;
        value: KavyaDocument & {
            sourceType: 'text' | 'pdf' | 'mixed';
            fileId?: string;
        };
        indexes: { 'by-date': number };
    };
    voice_notes: {
        key: string;
        value: {
            id: string;
            documentId: string;
            poemId: string;
            audioId: string;
            duration: number;
            createdAt: number;
        };
        indexes: { 'by-document': string };
    };
    blobs: {
        key: string;
        value: {
            id: string;
            data: Blob;
            mimeType: string;
        };
    };
}

const DB_NAME = 'kavyaswar-db';
const DB_VERSION = 1;

export const initDB = async (): Promise<IDBPDatabase<KavyaDB>> => {
    return openDB<KavyaDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('documents')) {
                const store = db.createObjectStore('documents', { keyPath: 'id' });
                store.createIndex('by-date', 'createdAt');
            }
            if (!db.objectStoreNames.contains('voice_notes')) {
                const store = db.createObjectStore('voice_notes', { keyPath: 'id' });
                store.createIndex('by-document', 'documentId');
            }
            if (!db.objectStoreNames.contains('blobs')) {
                db.createObjectStore('blobs', { keyPath: 'id' });
            }
        },
    });
};

export const saveDocument = async (doc: KavyaDB['documents']['value']) => {
    const db = await initDB();
    return db.put('documents', doc);
};

export const getDocument = async (id: string) => {
    const db = await initDB();
    return db.get('documents', id);
};

export const saveVoiceNote = async (note: KavyaDB['voice_notes']['value']) => {
    const db = await initDB();
    return db.put('voice_notes', note);
};

export const getVoiceNotesWait = async (documentId: string) => {
    const db = await initDB();
    return db.getAllFromIndex('voice_notes', 'by-document', documentId);
};

export const saveBlob = async (id: string, data: Blob, mimeType: string) => {
    const db = await initDB();
    return db.put('blobs', { id, data, mimeType });
};

export const getBlob = async (id: string) => {
    const db = await initDB();
    return db.get('blobs', id);
};

export const getAllDocuments = async () => {
    const db = await initDB();
    return db.getAllFromIndex('documents', 'by-date');
};
