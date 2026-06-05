import { NextResponse } from 'next/server';
import { getCurrentActor } from '@/lib/rbac/actor';
import { listMembers, type MemberFilters } from '@/features/members/queries';

/**
 * GET /api/admin/members — JSON list of the current store's members.
 * Permission-gated (members.manage). Provides an API-first surface alongside
 * the server actions used by the admin UI.
 *
 * Query params: ?search=&role=<role|all>&status=<status|all>
 */
export async function GET(request: Request): Promise<NextResponse> {
  const actor = await getCurrentActor();
  if (!actor || !actor.permissions.includes('members.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!actor.storeId) {
    return NextResponse.json({ error: 'No store resolved for this request.' }, { status: 400 });
  }

  const params = new URL(request.url).searchParams;
  const filters: MemberFilters = {
    search: params.get('search') ?? undefined,
    role: (params.get('role') as MemberFilters['role']) ?? undefined,
    status: (params.get('status') as MemberFilters['status']) ?? undefined,
  };

  const members = await listMembers(actor.storeId, filters);
  return NextResponse.json({ storeId: actor.storeId, count: members.length, members });
}
