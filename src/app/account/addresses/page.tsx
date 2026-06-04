import { getMyAddresses } from '@/features/account/queries';
import { AddressManager } from '@/features/account/components/address-manager';

export default async function AddressesPage() {
  const addresses = await getMyAddresses();
  return (
    <div>
      <h2 className="mb-4 text-lg font-bold">Saved addresses</h2>
      <AddressManager addresses={addresses} />
    </div>
  );
}
