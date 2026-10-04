import { Invitation } from "@/components/hosted/invitation";
export default async function InvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return <Invitation token={(await searchParams).token ?? ""} />;
}
