import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Restores an anonymous cart from a recovery email by re-issuing the cart token
 * cookie, then redirects to /cart. The token is the cart's session_token (an
 * unguessable UUID), so only the recipient of the email can use it.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const { origin } = request.nextUrl;
  const response = NextResponse.redirect(`${origin}/cart`);
  if (token) {
    response.cookies.set('vitalis_cart', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}
