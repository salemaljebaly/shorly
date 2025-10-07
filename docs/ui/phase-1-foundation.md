# Phase 1: Foundation - UI Implementation

## Overview

Phase 1 establishes the core foundation for the Shorly dashboard UI using shadcn/ui v3.4.0 with Next.js 15 and Tailwind CSS v4.

## Components Installed

### Core UI Components (via shadcn CLI)

- ✅ **button** - Primary action component
- ✅ **card** - Container component for content
- ✅ **input** - Text input fields
- ✅ **label** - Form labels
- ✅ **textarea** - Multi-line text input
- ✅ **select** - Dropdown select component
- ✅ **checkbox** - Checkbox input
- ✅ **form** - Form wrapper with validation support
- ✅ **table** - Data table component
- ✅ **badge** - Status and label badges
- ✅ **separator** - Visual divider
- ✅ **dialog** - Modal dialog
- ✅ **sheet** - Slide-out panel
- ✅ **dropdown-menu** - Contextual menu
- ✅ **tabs** - Tab navigation
- ✅ **sonner** - Toast notifications
- ✅ **alert** - Alert messages
- ✅ **scroll-area** - Custom scrollbar
- ✅ **skeleton** - Loading placeholders
- ✅ **avatar** - User avatar component
- ✅ **switch** - Toggle switch
- ✅ **tooltip** - Hover tooltips

### Dependencies Added

```json
{
  "axios": "^1.12.2",
  "react-hook-form": "^7.64.0",
  "@hookform/resolvers": "^5.2.2",
  "zod": "^4.1.11",
  "sonner": "^2.0.7",
  "next-themes": "^0.4.6"
}
```

## API Client Setup

### File Structure

```
src/lib/api/
├── client.ts      # Axios instance with interceptors
├── auth.ts        # Authentication endpoints
├── links.ts       # Links management endpoints
└── index.ts       # Exports
```

### Features

- ✅ Axios instance with automatic token injection
- ✅ Request interceptor for auth headers
- ✅ Response interceptor for token refresh
- ✅ Automatic redirect on auth failure
- ✅ Type-safe API methods

### Authentication Flow

1. Login/Register returns `accessToken` and `refreshToken`
2. Tokens stored in `localStorage`
3. Access token sent in `Authorization` header
4. On 401 error, automatically refresh using refresh token
5. On refresh failure, clear tokens and redirect to login

## Dashboard Layout

### Layout Structure

```
apps/web/src/
├── app/
│   ├── layout.tsx              # Root layout with Toaster
│   ├── (auth)/
│   │   ├── login/page.tsx      # Login page
│   │   └── register/page.tsx   # Register page
│   └── dashboard/
│       ├── layout.tsx          # Dashboard layout with sidebar
│       └── page.tsx            # Dashboard home
└── components/
    └── dashboard/
        ├── sidebar.tsx         # Navigation sidebar
        └── header.tsx          # Top header with search & user menu
```

### Sidebar Component

**Location:** `src/components/dashboard/sidebar.tsx`

**Features:**

- Logo and branding
- Navigation menu with active state highlighting
- Icons from lucide-react
- Logout button at bottom
- Responsive design

**Routes:**

- `/dashboard` - Dashboard home
- `/dashboard/links` - Links management
- `/dashboard/analytics` - Analytics
- `/dashboard/qr` - QR Codes
- `/dashboard/settings` - Settings

### Header Component

**Location:** `src/components/dashboard/header.tsx`

**Features:**

- Global search input
- Notification bell (with indicator)
- User avatar with dropdown menu
- Profile and settings quick access
- Logout action

## Authentication Pages

### Login Page

**Location:** `src/app/(auth)/login/page.tsx`

**Features:**

- Email & password form
- Form validation with zod
- Error handling with toast notifications
- Link to register page
- Centered card layout

**Validation:**

- Email: Valid email format
- Password: Minimum 6 characters

### Register Page

**Location:** `src/app/(auth)/register/page.tsx`

**Features:**

- Name, email, password & confirm password form
- Password matching validation
- Form validation with zod
- Error handling with toast notifications
- Link to login page
- Centered card layout

**Validation:**

- Name: Minimum 2 characters
- Email: Valid email format
- Password: Minimum 6 characters
- Confirm Password: Must match password

## Styling Configuration

### Tailwind CSS v4

- Using OKLCH color space
- CSS-first configuration via `@theme`
- Dark mode support via `@custom-variant`
- shadcn color variables
- Sidebar-specific colors

### Color Palette

- Background: `oklch(100% 0 0)`
- Foreground: `oklch(9.8% 0.084 285.88)`
- Primary: `oklch(59.77% 0.196 264.14)`
- Destructive: `oklch(62.8% 0.257 29.23)`
- Border: `oklch(89.84% 0.005 286.37)`

## Next Steps (Phase 2+)

### Immediate Priorities

1. **Dashboard Home** - Stats cards and recent links
2. **Links Management** - CRUD interface with table
3. **OneLink Wizard** - Multi-step form for creating OneLinks
4. **Analytics Dashboard** - Charts with recharts
5. **Settings Page** - User profile and preferences

### Future Enhancements

- Dark mode toggle
- Mobile responsive sidebar (drawer on mobile)
- Real-time notifications
- Infinite scroll for links list
- Advanced filters and search
- Bulk operations
- Export functionality

## Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Development

### Run the dev server:

```bash
pnpm dev
```

### Access the UI:

- Login: http://localhost:3001/login
- Register: http://localhost:3001/register
- Dashboard: http://localhost:3001/dashboard

## Notes

- All components use shadcn/ui v3.4.0 patterns
- Forms use react-hook-form with zod validation
- Toast notifications via sonner
- Auth tokens in localStorage (consider httpOnly cookies for production)
- Client-side navigation with Next.js App Router
- TypeScript for type safety

---

**Created:** October 5, 2025
**Status:** ✅ Complete
**Next Phase:** Phase 2 - Dashboard Features
