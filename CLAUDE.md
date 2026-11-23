# LinkedIn AI Studio Project - Claude Code Instructions

## Project Overview

LinkedIn AI Studio is a comprehensive dashboard for LinkedIn content management, automation, and analytics using AI. The project provides tools for content creation, engagement, networking, lead generation, and analytics.

## Architecture

### Technology Stack

- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS
- **UI Components**: Lucide React icons
- **Backend**: Supabase (PostgreSQL), Server-Side Rendering
- **AI Integration**: OpenRouter (Free Models Router)
- **Encryption**: AES-256-GCM for secure credential storage
- **Authentication**: Next.js 16.4.6 with Supabase SSR

### Key Directories

- `app/`: Next.js App Router routes
  - `app/(dashboard)/`: Main dashboard sections (overview, content-studio, calendar, engagement, networking, lead-gen, analytics, settings)
- `components/`: Reusable UI components
  - `components/shared/`: Shared components (Sidebar, Topbar)
  - `components/ui/`: UI primitives (Button, Card, Input, Modal, etc.)
- `lib/`: Library code
  - `lib/actions/`: Server actions (auth, secrets, AI generation)
  - `lib/supabase/`: Supabase client utilities
  - `lib/encryption.ts`: AES-256-GCM encryption utility
  - `lib/utils.ts`: Utility functions
- `supabase/`: Database migration files
  - `supabase/migrations/20261113000000_initial_schema.sql`
- `proxy.ts`: Next.js 16.4.6 request interceptor for session refresh and route protection

## Core Features

### 1. Authentication & Authorization

- **Supabase Auth**: Sign up, sign in, sign out, email verification, password reset
- **Session Management**: Next.js 16.4.6 proxy.ts intercepts requests to refresh tokens and protect dashboard routes
- **Row Level Security**: Tenant isolation via composite primary/foreign keys

### 2. Secure Credential Management

- **AES-256-GCM Encryption**: All integration credentials (e.g., OpenRouter API keys) are encrypted server-side
- **Service Role Client**: Server-side operations only, with user ownership verification
- **Zero Client Access**: Client roles have no table privileges or accessible policies on `integration_secrets`

### 3. AI Content Generation

- **OpenRouter Free Models Router**: Uses `openrouter/free` to generate LinkedIn posts
- **Server Actions**: `generatePostContent` verifies user authentication, decrypts API key, and calls OpenRouter API
- **Input Validation**: Topic and tone parameters are validated
- **Error Handling**: Comprehensive error handling with safe error messages to frontend

### 4. Database Schema

- **profiles**: User profiles linked 1:1 with Supabase Auth users
- **posts**: User-generated LinkedIn posts with composite ownership `(id, user_id)`
- **post_metrics**: Engagement metrics with composite foreign key
- **integration_secrets**: Encrypted storage for third-party API credentials
- **activity_logs**: Server-side audit trails

### 5. Security Principles

- **Column-Level Privileges**: `profiles` updates restricted to `full_name` and `avatar_url` only
- **Composite Constraints**: `(id, user_id)` primary keys ensure tenant isolation
- **No Hardcoded Secrets**: All credentials are environment variables or encrypted
- **Server-Only Execution**: `import 'server-only'` prevents client-side service role client usage

## Implementation Summary

### Phase 1: Authentication & Database Foundation

- Set up Supabase SSR client utilities (`client.ts`, `server.ts`, `service.ts`)
- Implement `proxy.ts` for session refresh and route protection
- Create `supabase/migrations/20261113000000_initial_schema.sql` with all tables, constraints, RLS, triggers
- Implement secure `handle_new_user()` trigger with metadata validation
- Add AES-256-GCM encryption utility (`lib/encryption.ts`)

### Phase 2: Secure Credential Management & AI Integration

- Implement `saveIntegrationSecret` server action for encrypted credential storage
- Implement `generatePostContent` server action for OpenRouter AI generation
- Update `app/(dashboard)/settings/page.tsx` and `app/(dashboard)/content-studio/page.tsx` to integrate server actions
- Change OpenRouter model to `openrouter/free` (free models only)

### Additional Enhancements

- Add `import 'server-only'` to `lib/supabase/service.ts`
- Implemented comprehensive error handling with safe diagnostics
- Improved README.md with detailed project documentation

## Files created/modified

- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/service.ts` (with `import 'server-only'`)
- `lib/supabase/proxy.ts`
- `lib/encryption.ts`
- `lib/actions/auth.ts`
- `lib/actions/secrets.ts`
- `lib/actions/ai.ts`
- `app/login/page.tsx`
- `app/signup/page.tsx`
- `app/(dashboard)/settings/page.tsx`
- `app/(dashboard)/content-studio/page.tsx`
- `components/shared/Sidebar.tsx`
- `proxy.ts`
- `supabase/migrations/20261113000000_initial_schema.sql`
- `.env.example`
- `README.md`

## Files Deleted

- `.next/` (Next.js build cache directory)

## Important Notes

- **Database Operations**: Never execute SQL migrations remotely. Only apply migrations locally as needed.
- **Security**: Do not expose API keys, passwords, tokens, or `.env` values.
- **Free Tier Only**: Uses OpenRouter's Free Models Router exclusively. Paid models would require additional configuration.
- **Frontend**: All eight dashboard modules preserved and enhanced with working server actions.
- **TypeScript**: All changes type-checked and compiled successfully.
- **Build**: `npm run build` passes without errors.

## Known Limitations

- Email verification workflow is handled by Supabase Auth.
- Advanced LinkedIn API integrations (beyond basic posting) require additional configuration.
- Free model limitations may affect advanced AI features.

## Future Enhancements

- Scheduled post publishing via LinkedIn API
- Real-time analytics dashboard
- Advanced content personalization
- Team collaboration features

## License

This project is part of the LinkedIn AI Studio initiative.

---

*Built with Next.js 16.4.6, React, TypeScript, Tailwind CSS, Supabase, and OpenRouter*
