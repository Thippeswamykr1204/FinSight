import { AuthForm } from "@/components/hosted/auth-form";
import { authCapabilities } from "@/lib/hosted/config";
export const dynamic = "force-dynamic";
export default function ResetPage() {
  return <AuthForm mode="reset" capabilities={authCapabilities()} />;
}
