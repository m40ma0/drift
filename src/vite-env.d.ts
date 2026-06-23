/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_KEY?: string;
  readonly VITE_OPENAI_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
