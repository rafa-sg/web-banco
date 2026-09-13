import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <div className="login-screen"><LoginForm next={next?.startsWith("/") ? next : "/"} /></div>;
}
