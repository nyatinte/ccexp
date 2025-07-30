/// <reference types="vitest/importMeta" />

declare global {
  interface ImportMeta {
    readonly vitest?: import('vitest');
  }
}

export {};
