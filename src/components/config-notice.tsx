import { Alert } from "@/components/ui";

export function ConfigNotice() {
  return (
    <Alert tone="warning" title="Backend not configured">
      Set <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
      <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> in <code className="font-mono text-xs">.env.local</code>.
      See the README for setup steps.
    </Alert>
  );
}
