# Email Verification Setup Guide

## Issue
Email verification is not working - users don't receive confirmation emails after signup.

## What Was Fixed in Code

### 1. Updated AuthContext (`src/contexts/AuthContext.tsx`)
- Added `emailRedirectTo` option to signup configuration
- Modified return type to indicate when email confirmation is needed
- Only create user profile after email is confirmed

### 2. Updated Signup Page (`src/app/auth/signup/page.tsx`)
- Added email confirmation message display
- Better user feedback when verification email is sent
- Proper flow handling for confirmed vs unconfirmed users

### 3. Created Auth Callback Page (`src/app/auth/callback/page.tsx`)
- Handles the redirect from email confirmation links
- Shows loading, success, and error states
- Redirects to dashboard after successful confirmation

## Supabase Configuration Required

### 1. Enable Email Confirmation
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Settings**
3. Under **User Management**, enable **Enable email confirmations**
4. Set **Site URL** to your domain (e.g., `http://localhost:3000` for development)
5. Add redirect URLs under **Redirect URLs**:
   - `http://localhost:3000/auth/callback` (development)
   - `https://yourdomain.com/auth/callback` (production)

### 2. Configure Email Templates (Optional)
1. Go to **Authentication** → **Email Templates**
2. Customize the confirmation email template
3. Make sure the confirmation URL includes the correct redirect

### 3. SMTP Configuration (For Production)
If you're not receiving emails in production:
1. Go to **Settings** → **Project Settings**
2. Navigate to **SMTP Settings**
3. Configure your email provider (SendGrid, Mailgun, etc.)

## Environment Variables
Make sure these are set in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing the Flow

### Development Testing
1. Start your development server: `npm run dev`
2. Go to `/auth/signup`
3. Create a new account
4. Check your email (including spam folder)
5. Click the confirmation link
6. Should redirect to `/auth/callback` then to `/dashboard`

### Common Issues

1. **No email received**:
   - Check spam folder
   - Verify SMTP configuration in Supabase
   - Ensure email confirmation is enabled

2. **Callback fails**:
   - Check that redirect URLs are properly configured
   - Verify the callback page exists at `/auth/callback`

3. **Still redirected immediately**:
   - Clear browser cache/localStorage
   - Check Supabase settings for email confirmation

## Migration Note
Existing users who signed up before this fix may already be confirmed. New signups will now require email verification. 