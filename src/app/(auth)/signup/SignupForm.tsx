"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerUser } from "@/app/actions/auth";
import { Button, Input, Label, Select, FormError } from "@/components/ui";
import { CURRENCIES } from "@/lib/currency";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(registerUser, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormError>{state?.error}</FormError>
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required placeholder="Your name" autoComplete="name" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required placeholder="At least 6 characters" />
      </div>
      <div>
        <Label htmlFor="currency">Currency</Label>
        <Select id="currency" name="currency" defaultValue="INR">
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} {c.label} ({c.code})
            </option>
          ))}
        </Select>
      </div>
      <SubmitButton />
      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-emerald-700 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
