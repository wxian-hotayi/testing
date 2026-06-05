import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSlugAvailable } from '@/features/stores/queries';
import { slugify } from '@/features/stores/policy';

/**
 * GET /api/stores/slug-available?slug=acme — live availability check for the
 * store-creation form. Requires authentication (only signed-in users create
 * stores). Returns { slug, available, reason? }.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const raw = new URL(request.url).searchParams.get('slug') ?? '';
  const slug = slugify(raw);
  if (!slug) return NextResponse.json({ slug: '', available: false, reason: 'empty' });

  const result = await isSlugAvailable(slug);
  return NextResponse.json({ slug, ...result });
}
