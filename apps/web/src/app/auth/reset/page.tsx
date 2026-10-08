import { AuthForm } from "@/components/hosted/auth-form";
import { authCapabilities } from "@/lib/hosted/config";
export const dynamic = "force-dynamic";
export default async function ResetPage() {
  return <AuthForm mode="reset" capabilities={await authCapabilities()} />;
}
