import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  // Egy Electron-példány egyszerre: a második indítás az egy-példány zárra fut.
  workers: 1,
  timeout: 90_000,
  reporter: 'list',
});
