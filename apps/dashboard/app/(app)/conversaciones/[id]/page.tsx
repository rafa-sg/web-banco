import { notFound } from "next/navigation";
import { LiveConversation } from "@/components/live/live-conversation";
import {
  getConversation, getConversationEvents, getCustomerById, getMessages, getPlaybookStages, getTurnEvaluations,
} from "@/lib/supabase/queries";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conversation = await getConversation(id);
  if (!conversation) notFound();

  const [customer, messages, evaluations, events, stages] = await Promise.all([
    getCustomerById(conversation.customer_id),
    getMessages(id),
    getTurnEvaluations(id),
    getConversationEvents(id),
    getPlaybookStages(conversation.playbook_id),
  ]);

  return <LiveConversation
    conversation={conversation}
    customer={customer}
    initialMessages={messages}
    initialEvaluations={evaluations}
    initialEvents={events}
    stages={stages}
  />;
}
