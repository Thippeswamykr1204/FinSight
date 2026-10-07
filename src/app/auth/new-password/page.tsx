import { AuthForm } from "@/components/hosted/auth-form";
import { authCapabilities } from "@/lib/hosted/config";
export const dynamic = "force-dynamic";
export default async function NewPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthForm
      mode="new-password"
      capabilities={authCapabilities()}
      token={params.token}
      initialError={params.error}
    />
  );
}
