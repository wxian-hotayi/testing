import { getProfile } from '@/features/account/queries';
import { ProfileForm } from '@/features/account/components/profile-form';

export default async function ProfilePage() {
  const profile = await getProfile();
  return (
    <div>
      <h2 className="mb-4 text-lg font-bold">Profile</h2>
      <ProfileForm profile={profile} />
    </div>
  );
}
