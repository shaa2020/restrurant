import { Alert } from "@/components/ui";
import { missingSupabaseEnv } from "@/lib/env";

export function ConfigNotice() {
  const missing = missingSupabaseEnv();
  return (
    <Alert tone="warning" title="Backend not configured">
      <p>
        This build is missing:{" "}
        {missing.map((name, i) => (
          <span key={name}>
            {i > 0 && ", "}
            <code className="font-mono text-xs">{name}</code>
          </span>
        ))}
        .
      </p>
      <p className="mt-1.5">
        Locally, add them to <code className="font-mono text-xs">.env.local</code>. On Vercel, add them for the Preview and Production
        environments, then <strong>redeploy</strong>: public variables are fixed when the app is built.
      </p>
    </Alert>
  );
}
