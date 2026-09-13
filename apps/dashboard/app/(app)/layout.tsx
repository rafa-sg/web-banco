import { AppShell } from "@/components/app-shell";
import { getCurrentUserEmail, getLiveConversations } from "@/lib/supabase/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [userEmail, live] = await Promise.all([getCurrentUserEmail(), getLiveConversations()]);
  return <AppShell userEmail={userEmail} liveCount={live.length}>{children}</AppShell>;
}
