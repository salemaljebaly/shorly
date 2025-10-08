import { useParams } from 'next/navigation';

/**
 * Builds a locale-aware path by inserting the current locale into the path
 * @param path - The path without locale (e.g., '/dashboard/links')
 * @returns Full path with locale (e.g., '/en/dashboard/links')
 */
export function useLocalePath() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const buildPath = (path: string) => {
    // Remove leading slash and ensure clean path
    const cleanPath = path.replace(/^\//, '');
    return `/${locale}/${cleanPath}`;
  };

  return {
    locale,
    buildPath,
    buildAbsolutePath: (path: string) => {
      // For external URLs or already absolute paths
      if (path.startsWith('http') || path.startsWith('//')) {
        return path;
      }
      return buildPath(path);
    },
  };
}

/**
 * Helper function to build locale paths outside of React components
 * @param path - The path without locale
 * @param locale - The locale to use
 * @returns Full path with locale
 */
export function buildLocalePath(path: string, locale: string = 'en'): string {
  const cleanPath = path.replace(/^\//, '');
  return `/${locale}/${cleanPath}`;
}

/**
 * Extracts the current locale from a pathname
 * @param pathname - Full pathname including locale
 * @returns The locale string or 'en' as default
 */
export function extractLocaleFromPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  // Return 'en' as default if no valid locale found
  if (firstSegment === 'en' || firstSegment === 'ar') {
    return firstSegment;
  }

  return 'en';
}
