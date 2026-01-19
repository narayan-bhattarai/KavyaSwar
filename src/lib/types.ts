export interface KavyaDocument {
    id: string;
    title: string;
    author?: string;
    poetryType?: string;
    createdAt: number;
    pdfSourceId?: string; // Reference to the single PDF blob
    pages: KavyaPage[]; // Ordered list of pages
}

export interface KavyaPage {
    pageNumber: number;
    audioId?: string;
    audioDuration?: number;
}

// Keep Poem for backward compatibility or define it as union if needed, 
// but for this major refactor we are effectively replacing it. 
// To avoid breaking DB too hard, we can let Poem be alias or keep unused.
// But cleanly:
export interface Poem extends KavyaPage {
    id: string; // Legacy
    content: string; // Legacy
}

export interface StoredBlob {
    id: string;
    data: Blob;
    type: string;
}
