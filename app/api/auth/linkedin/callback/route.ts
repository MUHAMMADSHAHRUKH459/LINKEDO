import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { encrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');
  const cookieState = request.cookies.get('linkedin_oauth_state')?.value;

  const redirectToSettings = new URL('/settings', request.url);

  if (errorParam || !code || !state || state !== cookieState) {
    const response = NextResponse.redirect(redirectToSettings);
    response.cookies.delete('linkedin_oauth_state');
    return response;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('linkedin_oauth_state');
    return response;
  }

  try {
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/linkedin/callback`,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    });

    const tokens = await tokenResponse.json();
    if (tokens.error) {
      throw new Error(tokens.error_description || tokens.error);
    }

    const encryptedToken = encrypt(JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000
    }));

    const serviceClient = createServiceRoleClient();
    const { error: dbError } = await serviceClient.from('integration_secrets').upsert({
      user_id: user.id,
      provider: 'linkedin',
      encrypted_access_token: encryptedToken,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id, provider'
    });

    if (dbError) {
      throw new Error(dbError.message);
    }

    const response = NextResponse.redirect(redirectToSettings);
    response.cookies.delete('linkedin_oauth_state');
    return response;
  } catch (error) {
    console.error('LinkedIn Callback Error:', error);
    const response = NextResponse.redirect(redirectToSettings);
    response.cookies.delete('linkedin_oauth_state');
    return response;
  }
}
