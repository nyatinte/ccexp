/**
 * Comprehensive exclusion patterns for secure and performant file scanning
 */

// Security-sensitive directories that should NEVER be scanned
const SECURITY_EXCLUSIONS = [
  // SSH and encryption keys
  '.ssh',
  '.gnupg',
  '.gpg',
  '.pki',

  // Credentials and secrets
  '.aws',
  '.azure',
  '.gcp',
  '.kube',
  '.docker',
  'credentials',
  'secrets',

  // Browser data (may contain sensitive info)
  '.mozilla',
  '.chrome',
  '.chromium',
  'Library/Application Support/Google/Chrome',
  'Library/Application Support/Firefox',

  // Keychain and password managers
  'Library/Keychains',
  '.password-store',
  '.pass',

  // Certificate stores
  '.certificates',
  'cert',
  'certs',

  // VPN configurations
  '.openvpn',
  '.wireguard',
] as const;

// Development-related directories with large file counts
const DEVELOPMENT_EXCLUSIONS = [
  // Package managers and dependencies
  'node_modules',
  'vendor',
  'bower_components',
  'jspm_packages',
  '.pnpm',
  '.yarn',

  // Build outputs and caches
  'dist',
  'build',
  'out',
  'target', // Rust
  '.next', // Next.js
  '.nuxt', // Nuxt.js
  '.vuepress',
  '.docusaurus',
  '.cache',
  '.tmp',
  'tmp',
  'temp',

  // Version control
  '.git',
  '.svn',
  '.hg',
  '.bzr',

  // IDE and editor files
  '.vscode',
  '.idea',
  '.vs',
  '.eclipse',
  '.netbeans',

  // Language-specific build directories
  '__pycache__', // Python
  '.pytest_cache',
  'venv',
  '.venv',
  'env',
  '.env',
  'site-packages',

  // Ruby
  '.bundle',
  'gems',

  // Java
  'target', // Maven
  'gradle',
  '.gradle',

  // .NET
  'bin',
  'obj',
  'packages',

  // Go
  'vendor',

  // PHP
  'vendor',

  // Testing and coverage
  'coverage',
  '.nyc_output',
  '.coverage',
  'htmlcov',

  // Documentation builds
  '_site', // Jekyll
  'public', // Hugo/Gatsby (when build output)

  // OS-specific
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',
] as const;

// Large media and asset directories
const MEDIA_EXCLUSIONS = [
  // Images and media
  'images',
  'imgs',
  'photos',
  'videos',
  'movies',
  'music',
  'audio',
  'sounds',

  // Downloads and temporary files
  'Downloads',
  'Desktop', // May contain large files
  'Documents/VirtualMachines',
  'Library/Caches',
  'Library/Logs',

  // Application data
  'AppData',
  'Application Support',

  // Virtual machines
  'VirtualBox VMs',
  '.vagrant',
  'parallels',
  'vmware',

  // Cloud sync folders (can be huge)
  'Dropbox',
  'Google Drive',
  'OneDrive',
  'iCloud Drive',
] as const;

// Combined default exclusions for maximum performance and security
export const DEFAULT_EXCLUSIONS = [
  ...SECURITY_EXCLUSIONS,
  ...DEVELOPMENT_EXCLUSIONS,
] as const;

// All exclusions including media (for very conservative scanning)
const CONSERVATIVE_EXCLUSIONS = [
  ...DEFAULT_EXCLUSIONS,
  ...MEDIA_EXCLUSIONS,
] as const;

/**
 * Security-focused exclusions for paranoid users
 */
const PARANOID_EXCLUSIONS = [
  ...DEFAULT_EXCLUSIONS,
  ...MEDIA_EXCLUSIONS,

  // Additional paranoid exclusions
  'Mail', // Email data
  'Messages', // Chat history
  'Safari', // Browser data
  'Library/Mail',
  'Library/Messages',
  'Library/Safari',
  'Library/Cookies',
  'Library/Preferences',

  // System directories
  'System',
  'usr',
  'opt',
  'var',
  'etc',
  'proc',
  'dev',
  'sys',
] as const;

import { match } from 'ts-pattern';

/**
 * Get exclusion patterns based on security level
 */
const getExclusionPatterns = (
  level: 'default' | 'conservative' | 'paranoid' = 'default',
) => {
  return match(level)
    .with('conservative', () => CONSERVATIVE_EXCLUSIONS)
    .with('paranoid', () => PARANOID_EXCLUSIONS)
    .with('default', () => DEFAULT_EXCLUSIONS)
    .exhaustive();
};

/**
 * Check if a directory name should be excluded based on security patterns
 */
const isSecuritySensitive = (dirName: string): boolean => {
  return SECURITY_EXCLUSIONS.some(
    (pattern) => dirName === pattern || dirName.includes(pattern),
  );
};

/**
 * Check if a directory is development-related
 */
const isDevelopmentDirectory = (dirName: string): boolean => {
  return DEVELOPMENT_EXCLUSIONS.some(
    (pattern) => dirName === pattern || dirName.includes(pattern),
  );
};

// InSource tests
if (import.meta.vitest != null) {
  const { describe, test, expect } = import.meta.vitest;

  describe('Exclusion Patterns', () => {
    test('should identify security-sensitive directories', () => {
      expect(isSecuritySensitive('.ssh')).toBe(true);
      expect(isSecuritySensitive('.aws')).toBe(true);
      expect(isSecuritySensitive('safe-directory')).toBe(false);
    });

    test('should identify development directories', () => {
      expect(isDevelopmentDirectory('node_modules')).toBe(true);
      expect(isDevelopmentDirectory('.git')).toBe(true);
      expect(isDevelopmentDirectory('src')).toBe(false);
    });

    test('should return correct exclusion patterns by level', () => {
      const defaultExclusions = getExclusionPatterns('default');
      const conservativeExclusions = getExclusionPatterns('conservative');
      const paranoidExclusions = getExclusionPatterns('paranoid');

      expect(defaultExclusions.length).toBeLessThan(
        conservativeExclusions.length,
      );
      expect(conservativeExclusions.length).toBeLessThan(
        paranoidExclusions.length,
      );

      // Check specific inclusions
      expect(defaultExclusions).toContain('.ssh');
      expect(defaultExclusions).toContain('node_modules');
      expect(conservativeExclusions).toContain('Downloads');
      expect(paranoidExclusions).toContain('Mail');
    });

    test('should have non-empty exclusion lists', () => {
      expect(SECURITY_EXCLUSIONS.length).toBeGreaterThan(0);
      expect(DEVELOPMENT_EXCLUSIONS.length).toBeGreaterThan(0);
      expect(MEDIA_EXCLUSIONS.length).toBeGreaterThan(0);
    });
  });
}
