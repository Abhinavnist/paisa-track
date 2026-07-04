import { Card } from "@/components/ui";
import { GoogleButton } from "@/components/GoogleButton";
import { googleEnabled } from "@/auth.config";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Card className="p-6">
      <h2 className="mb-5 text-lg font-bold text-slate-900 dark:text-white">Welcome back</h2>
      <LoginForm />
      {googleEnabled && (
        <>
          <Divider />
          <GoogleButton />
        </>
      )}
    </Card>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
      <span className="h-px flex-1 bg-slate-200" />
      or
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
