import { redirect } from "next/navigation";

// Root simply routes into the app; middleware bounces guests to /login.
export default function Home() {
  redirect("/dashboard");
}
