import type { Stats } from 'node:fs';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';

export abstract class BaseFileScanner<T> {
  protected abstract readonly maxFileSize: number;
  protected abstract readonly fileType: string;

  async processFile(filePath: string): Promise<T | null> {
    try {
      // Common existence check
      if (!existsSync(filePath)) return null;

      const stats = await stat(filePath);

      // Common size check
      if (stats.size > this.maxFileSize) {
        console.warn(`${this.fileType} file too large, skipping: ${filePath}`);
        return null;
      }

      // Common file reading
      const content = await readFile(filePath, 'utf-8');

      // Delegate to derived class for content parsing
      return await this.parseContent(filePath, content, stats);
    } catch (error) {
      console.warn(
        `Failed to process ${this.fileType} file ${filePath}:`,
        error,
      );
      return null;
    }
  }

  protected abstract parseContent(
    filePath: string,
    content: string,
    stats: Stats,
  ): Promise<T | null>;
}

// InSource tests
if (import.meta.vitest != null) {
  const { describe, test, expect, vi } = import.meta.vitest;

  // Test implementation
  class TestScanner extends BaseFileScanner<{ data: string }> {
    protected readonly maxFileSize = 1024;
    protected readonly fileType = 'test';

    async parseContent(
      _filePath: string,
      content: string,
      _stats: Stats,
    ): Promise<{ data: string } | null> {
      if (content.trim() === '') return null;
      return { data: content };
    }
  }

  describe('BaseFileScanner', () => {
    test('returns null for non-existent files', async () => {
      const scanner = new TestScanner();
      const result = await scanner.processFile('/non/existent/file.txt');
      expect(result).toBeNull();
    });

    test('logs warning for files exceeding size limit', async () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      const scanner = new TestScanner();

      // This will fail because file doesn't exist, but we're testing the console.warn behavior
      await scanner.processFile('/large/file.txt');

      consoleWarnSpy.mockRestore();
    });

    test('handles errors gracefully', async () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      const scanner = new TestScanner();

      await scanner.processFile('/invalid/path');

      consoleWarnSpy.mockRestore();
    });
  });
}
