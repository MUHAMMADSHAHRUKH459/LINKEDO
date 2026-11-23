import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const state = crypto.randomBytes(16).toString('hex');

  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', process.env.LINKEDIN_CLIENT_ID!);
  authUrl.searchParams.append('redirect_uri', `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/linkedin/callback`);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('scope', 'openid profile email w_member_social');

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set('linkedin_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10 // 10 minutes
  });

  return response;
}
