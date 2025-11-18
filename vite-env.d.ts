/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SIGNALING_SERVER: string;
    readonly VITE_SIGNALING_PASSWORD: string;
    // Standard Vite environment variables
    readonly MODE: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly SSR: boolean;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
