import { AuthForm } from "@/components/hosted/auth-form";
import { authCapabilities } from "@/lib/hosted/config";
export const dynamic = "force-dynamic";
export default async function MfaPage() {
  return <AuthForm mode="mfa" capabilities={await authCapabilities()} />;
}
