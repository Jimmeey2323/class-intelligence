/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_AI_API_KEY: string
  readonly VITE_USE_MOCK_AI: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}