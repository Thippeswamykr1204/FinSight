import { AuthForm } from "@/components/hosted/auth-form";
import { authCapabilities } from "@/lib/hosted/config";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};
export default function SignUpPage() {
  return <AuthForm mode="sign-up" capabilities={authCapabilities()} />;
}
