# Authentication Feature

## Overview

Complete authentication system with login, registration, and password recovery functionality.

## Pages

### 1. Login Page

**Location:** `src/app/(auth)/login/page.tsx`

**Route:** `/login`

**Features:**

- Email and password authentication
- Form validation with Zod
- Error handling with toast notifications
- Link to registration page
- Forgot password link
- Loading states during submission
- Auto-redirect to dashboard on success

**Form Fields:**

- Email (required, valid email format)
- Password (required, min 6 characters)

**Validation Rules:**

```typescript
{
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
}
```

**User Flow:**

1. User enters email and password
2. Form validates input
3. API call to `/auth/login`
4. On success: Store tokens in localStorage and redirect to `/dashboard`
5. On error: Display error toast

---

### 2. Register Page

**Location:** `src/app/(auth)/register/page.tsx`

**Route:** `/register`

**Features:**

- Full registration form
- Password confirmation validation
- Form validation with Zod
- Error handling with toast notifications
- Link to login page
- Loading states during submission
- Auto-redirect to dashboard on success

**Form Fields:**

- Name (required, min 2 characters)
- Email (required, valid email format)
- Password (required, min 6 characters)
- Confirm Password (required, must match password)

**Validation Rules:**

```typescript
{
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})
```

**User Flow:**

1. User enters name, email, password, and confirm password
2. Form validates input (including password match)
3. API call to `/auth/register`
4. On success: Store tokens in localStorage and redirect to `/dashboard`
5. On error: Display error toast

---

### 3. Forgot Password Page

**Location:** `src/app/(auth)/forgot-password/page.tsx`

**Route:** `/forgot-password`

**Features:**

- Email input for password reset
- Form validation with Zod
- Success state with confirmation message
- Try again functionality
- Back to login link
- Loading states during submission

**Form Fields:**

- Email (required, valid email format)

**States:**

1. **Initial State:** Email input form
2. **Email Sent State:** Confirmation message with email address
3. **Try Again:** Reset form to initial state

**User Flow:**

1. User enters email address
2. Form validates email
3. API call to `/auth/forgot-password`
4. On success: Show confirmation message
5. User can try again or go back to login

---

### 4. Reset Password Page

**Location:** `src/app/(auth)/reset-password/page.tsx`

**Route:** `/reset-password?token=xxx`

**Features:**

- New password input with confirmation
- Token validation from URL query params
- Password strength requirements
- Form validation with Zod
- Success state with auto-redirect
- Invalid token handling
- Loading states during submission

**Form Fields:**

- New Password (required, min 6 characters)
- Confirm New Password (required, must match password)

**Validation Rules:**

```typescript
{
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})
```

**States:**

1. **Invalid Token:** Error message with link to request new reset
2. **Reset Form:** New password input
3. **Success State:** Confirmation with auto-redirect to login

**User Flow:**

1. User clicks reset link from email (includes token in URL)
2. Page validates token exists
3. User enters new password and confirmation
4. Form validates password match
5. API call to `/auth/reset-password` with token
6. On success: Show success message and redirect to login after 3s
7. On error: Display error toast

---

## API Integration

### Auth API Methods

**Location:** `src/lib/api/auth.ts`

```typescript
authApi.login(data: LoginRequest): Promise<AuthResponse>
authApi.register(data: RegisterRequest): Promise<AuthResponse>
authApi.forgotPassword(data: ForgotPasswordRequest): Promise<void>
authApi.resetPassword(data: ResetPasswordRequest): Promise<void>
authApi.logout(): Promise<void>
authApi.getCurrentUser(): Promise<User>
```

### API Endpoints (Backend)

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/forgot-password` - Send password reset email
- `POST /auth/reset-password` - Reset password with token
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user info

### Token Management

- Access token stored in `localStorage` as `access_token`
- Refresh token stored in `localStorage` as `refresh_token`
- Tokens automatically included in API requests via interceptor
- Auto token refresh on 401 errors
- Auto redirect to login on refresh failure

---

## Components Used

### shadcn/ui Components

- `Card` - Container for auth forms
- `Form` - Form wrapper with validation
- `Input` - Text and password inputs
- `Button` - Submit buttons
- `Label` - Form labels
- `Alert` - Success/error messages
- `FormField` - Individual form fields
- `FormControl` - Form input wrapper
- `FormLabel` - Field labels
- `FormMessage` - Error messages
- `FormDescription` - Helper text

### Icons (lucide-react)

- `Link2` - Logo icon
- `ArrowLeft` - Back navigation
- `CheckCircle` - Success indicator

---

## Styling

### Layout

- Full-screen centered layout (`min-h-screen`)
- Responsive card container (`max-w-md`)
- Consistent spacing and padding
- Mobile-friendly design

### Color Scheme

- Primary color for links and buttons
- Destructive color for errors
- Muted colors for secondary text
- Card background for form containers

### Typography

- Logo: 2xl bold
- Titles: 2xl center-aligned
- Descriptions: Center-aligned muted
- Links: Primary color with hover underline

---

## Security Considerations

### Current Implementation (Development)

- Tokens stored in localStorage (easy for development)
- Client-side validation
- HTTPS not enforced in dev

### Production Recommendations

- Use httpOnly cookies for tokens
- Implement CSRF protection
- Enforce HTTPS
- Add rate limiting
- Implement email verification
- Add reCAPTCHA for registration
- Add 2FA option
- Implement account lockout after failed attempts

---

## User Experience

### Loading States

- Button text changes during submission
- Button disabled during loading
- Loading indicators prevent double-submission

### Error Handling

- Toast notifications for API errors
- Form validation errors inline
- Clear error messages
- Retry functionality

### Success Feedback

- Toast notifications for success
- Visual confirmation messages
- Auto-redirects after success
- Clear next steps

---

## File Structure

```
src/app/(auth)/
├── login/page.tsx              # Login page
├── register/page.tsx           # Registration page
├── forgot-password/page.tsx    # Forgot password page
└── reset-password/page.tsx     # Reset password page

src/lib/api/
└── auth.ts                     # Auth API methods
```

---

## Testing Checklist

### Login

- [ ] Valid credentials login successfully
- [ ] Invalid email shows validation error
- [ ] Short password shows validation error
- [ ] Wrong credentials show error toast
- [ ] Successful login redirects to dashboard
- [ ] Forgot password link works
- [ ] Register link works

### Register

- [ ] Valid registration creates account
- [ ] Invalid email shows validation error
- [ ] Short name shows validation error
- [ ] Short password shows validation error
- [ ] Mismatched passwords show error
- [ ] Successful registration redirects to dashboard
- [ ] Login link works

### Forgot Password

- [ ] Valid email sends reset link
- [ ] Invalid email shows validation error
- [ ] Success message shows email
- [ ] Try again resets form
- [ ] Back to login link works

### Reset Password

- [ ] Valid token shows reset form
- [ ] Invalid token shows error state
- [ ] Short password shows validation error
- [ ] Mismatched passwords show error
- [ ] Successful reset shows success
- [ ] Auto-redirect to login works
- [ ] Manual login link works

---

## Future Enhancements

### Planned Features

- [ ] Social OAuth (Google, GitHub)
- [ ] Email verification
- [ ] Two-factor authentication (2FA)
- [ ] Remember me checkbox
- [ ] Account recovery via security questions
- [ ] Magic link login
- [ ] Biometric authentication
- [ ] Session management page
- [ ] Login activity log

### UX Improvements

- [ ] Password strength indicator
- [ ] Show/hide password toggle
- [ ] Keyboard shortcuts (Enter to submit)
- [ ] Autofocus on first field
- [ ] Form persistence (save draft)
- [ ] Progressive disclosure for errors
- [ ] Animated transitions

---

**Created:** October 6, 2025
**Status:** ✅ Complete
**Next Feature:** Dashboard with Stats
