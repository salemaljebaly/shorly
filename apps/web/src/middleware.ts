import { NextRequest, NextResponse } from 'next/server';

const locales = ['en', 'ar'];
const defaultLocale = 'en';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if pathname already has a locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  // Get locale from Accept-Language header or use default
  const locale = request.headers
    .get('accept-language')
    ?.split(',')[0]
    ?.split('-')[0] || defaultLocale;

  const requestedLocale = locales.includes(locale) ? locale : defaultLocale;

  // Redirect to locale-prefixed URL
  request.nextUrl.pathname = `/${requestedLocale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    // Skip all internal paths (_next, api, static files)
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
