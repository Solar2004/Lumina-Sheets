/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SIGNALING_SERVER: string;
    readonly VITE_SIGNALING_PASSWORD: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
