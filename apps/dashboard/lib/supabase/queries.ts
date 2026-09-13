import { createClient } from "@/lib/supabase/server";
import type {
  AgentPolicy, ChannelPerformance, Commitment, CommitmentListItem, ConversationResult, CohortImpact, CollectionRule, ConversationEvent, ConversationRow, ConversationSummary, ConversationTimelineEvent,
  CustomerOverview, DailyMetric, EvaluationCriterion, FactDefinition, Intervention, Kpis, LiveConversation, Message, ModelCost, ModelPerformance, Offer,
  OfferPerformance, OpenEscalation, OutcomeDefinition, PaymentLink, PendingCommitment, Playbook, PlaybookStage, PlaybookStageFull, RiskBand, RiskDistributionRow,
  RuleOffer, RulePerformance, SentimentShift, SignalDefinition, StageFunnel, TurnEvaluation,
} from "@/lib/types";

export async function getKpis(): Promise<Kpis | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_kpis").select("*").single();
  if (error) return null;
  return data as Kpis;
}

export async function getCustomerOverview(): Promise<CustomerOverview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_customer_overview").select("*");
  if (error) return [];
  return (data ?? []) as CustomerOverview[];
}

export async function getRiskDistribution(): Promise<RiskDistributionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_risk_distribution").select("*");
  if (error) return [];
  return (data ?? []) as RiskDistributionRow[];
}

export async function getLiveConversations(): Promise<LiveConversation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_live_conversations").select("*").order("started_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as LiveConversation[];
}

export async function getCustomerById(customerId: string): Promise<CustomerOverview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_customer_overview").select("*").eq("customer_id", customerId).maybeSingle();
  if (error) return null;
  return data as CustomerOverview | null;
}

export async function getLatestIntervention(customerId: string): Promise<Intervention | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("interventions").select("*").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return null;
  return data as Intervention | null;
}

export async function getConversationsForCustomer(customerId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("conversations").select("id, channel, status, outcome, outcome_reason, summary, started_at, ended_at, risk_before, risk_after, escalated").eq("customer_id", customerId).order("started_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as ConversationSummary[];
}

export async function getConversationTimeline(conversationId: string): Promise<ConversationTimelineEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_conversation_timeline").select("*").eq("conversation_id", conversationId).order("at", { ascending: true });
  if (error) return [];
  return (data ?? []) as ConversationTimelineEvent[];
}

export async function getConversation(conversationId: string): Promise<ConversationRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("conversations").select("id, customer_id, playbook_id, channel, status, current_stage, turn_count, outcome, outcome_reason, summary, commitment_id, terms_presented, risk_before, risk_after, cost_usd, duration_ms, avg_latency_ms, p95_latency_ms, interruption_count, started_at, ended_at").eq("id", conversationId).maybeSingle();
  if (error) return null;
  return data as ConversationRow | null;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("messages").select("id, conversation_id, seq, role, content, stage_key, latency_ms, interrupted, heard_text, is_backchannel, meta, created_at").eq("conversation_id", conversationId).order("seq", { ascending: true });
  if (error) return [];
  return (data ?? []) as Message[];
}

export async function getTurnEvaluations(conversationId: string): Promise<TurnEvaluation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("turn_evaluations").select("id, conversation_id, message_id, seq, stage_key, intent, sentiment, sentiment_score, confidence, decision, from_stage, to_stage, rule_id, rule_label, pace, commitment_signal, created_at").eq("conversation_id", conversationId).order("seq", { ascending: true });
  if (error) return [];
  return (data ?? []) as TurnEvaluation[];
}

export async function getConversationEvents(conversationId: string): Promise<ConversationEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("conversation_events").select("id, conversation_id, customer_id, event_type, severity, payload, created_at").eq("conversation_id", conversationId).order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as ConversationEvent[];
}

export async function getPlaybookStages(playbookId: string | null): Promise<PlaybookStage[]> {
  if (!playbookId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("playbook_stages").select("id, stage_key, position, name, objective, is_terminal").eq("playbook_id", playbookId).order("position", { ascending: true });
  if (error) return [];
  return (data ?? []) as PlaybookStage[];
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}

async function selectAll<T>(table: string, columns = "*", build?: (query: any) => any): Promise<T[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const supabase = await createClient();
  let query = supabase.from(table).select(columns);
  if (build) query = build(query);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as T[];
}

export async function getImpactData() {
  const [kpis, cohorts, channels, rules, offers, stages, daily, sentiment, models, outcomes, conversations, customers] = await Promise.all([
    getKpis(),
    selectAll<CohortImpact>("v_prevention_impact"),
    selectAll<ChannelPerformance>("v_channel_performance"),
    selectAll<RulePerformance>("v_rule_performance", "*", query => query.order("conversations", { ascending: false })),
    selectAll<OfferPerformance>("v_offer_performance", "*", query => query.order("times_allowed", { ascending: false })),
    selectAll<StageFunnel>("v_stage_funnel", "*", query => query.order("playbook_key").order("position")),
    selectAll<DailyMetric>("v_daily_metrics", "*", query => query.order("day", { ascending: true })),
    selectAll<SentimentShift>("v_sentiment_shift", "*", query => query.order("conversations", { ascending: false })),
    selectAll<ModelPerformance>("v_model_performance", "*", query => query.order("role")),
    selectAll<OutcomeDefinition>("outcome_definitions", "*", query => query.order("sort_order")),
    selectAll<{ customer_id: string; channel: string; outcome: string | null }>("conversations", "customer_id, channel, outcome"),
    selectAll<{ customer_id: string; risk_band: RiskBand | null }>("v_customer_overview", "customer_id, risk_band"),
  ]);
  return { kpis, cohorts, channels, rules, offers, stages, daily, sentiment, models, outcomes, conversations, customers };
}

export async function getSignalDefinitions() {
  return selectAll<SignalDefinition>("signal_definitions");
}

export async function getOutcomeDefinitions() {
  return selectAll<OutcomeDefinition>("outcome_definitions", "*", query => query.order("sort_order"));
}

export async function getRulesConfig() {
  const [rules, facts, offers, ruleOffers, customers] = await Promise.all([
    selectAll<CollectionRule>("collection_rules", "*", query => query.order("priority", { ascending: false })),
    selectAll<FactDefinition>("rule_fact_definitions", "*", query => query.order("sort_order")),
    selectAll<Offer>("offers", "id, code, name, offer_type, description, params, requires_approval, generates_payment_link, is_active", query => query.order("name")),
    selectAll<RuleOffer>("rule_offers", "*", query => query.order("position")),
    selectAll<{ customer_id: string; full_name: string; customer_code: string; risk_band: RiskBand | null }>("v_customer_overview", "customer_id, full_name, customer_code, risk_band", query => query.order("full_name")),
  ]);
  return { rules, facts, offers, ruleOffers, customers };
}

export async function getOffers() {
  return selectAll<Offer>("offers", "id, code, name, offer_type, description, params, requires_approval, generates_payment_link, is_active", query => query.order("name"));
}

export async function getPlaybooksConfig() {
  const [playbooks, stages, criteria] = await Promise.all([
    selectAll<Playbook>("playbooks", "id, key, name, description, channel_scope, is_active", query => query.order("name")),
    selectAll<PlaybookStageFull>("playbook_stages", "id, playbook_id, stage_key, position, name, objective, agent_instructions, criteria, max_turns, allows_offers, is_terminal, suggested_outcome", query => query.order("position")),
    selectAll<EvaluationCriterion>("evaluation_criteria", "key, label", query => query.order("sort_order")),
  ]);
  return { playbooks, stages, criteria };
}

export async function getActivePolicy(): Promise<AgentPolicy | null> {
  const rows = await selectAll<AgentPolicy>("agent_policies", "*", query => query.eq("is_active", true).limit(1));
  return rows[0] ?? null;
}

async function customerNames(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const rows = await selectAll<{ id: string; full_name: string }>("customers", "id, full_name", query => query.in("id", ids));
  return new Map(rows.map(row => [row.id, row.full_name]));
}

export async function getPendingCommitments(): Promise<PendingCommitment[]> {
  const rows = await selectAll<Omit<PendingCommitment, "customer_name">>("commitments", "id, customer_id, offer_code, commitment_type, amount, committed_date, terms_text, status, created_at", query => query.eq("status", "pending_approval").order("created_at", { ascending: false }));
  const names = await customerNames([...new Set(rows.map(row => row.customer_id))]);
  return rows.map(row => ({ ...row, customer_name: names.get(row.customer_id) ?? "Cliente" }));
}

export async function getEscalations(): Promise<OpenEscalation[]> {
  const rows = await selectAll<Omit<OpenEscalation, "customer_name">>("escalations", "id, conversation_id, customer_id, reason, trigger, priority, status, assigned_to, notes, sla_due_at, created_at, resolved_at", query => query.order("created_at", { ascending: false }).limit(50));
  const names = await customerNames([...new Set(rows.map(row => row.customer_id))]);
  return rows.map(row => ({ ...row, customer_name: names.get(row.customer_id) ?? "Cliente" }));
}

const COMMITMENT_COLUMNS = "id, conversation_id, customer_id, offer_code, commitment_type, amount, committed_date, original_due_date, terms_text, status, requires_approval, customer_confirmed, policy_validated, receipt_code, created_at, resolved_at";

export async function getConversationCommitments(conversationId: string) {
  const [commitments, paymentLinks, costs] = await Promise.all([
    selectAll<Commitment>("commitments", COMMITMENT_COLUMNS, query => query.eq("conversation_id", conversationId).order("created_at", { ascending: true })),
    selectAll<PaymentLink>("payment_links", "id, conversation_id, commitment_id, token, url, amount, status, expires_at, paid_at, created_at", query => query.eq("conversation_id", conversationId).order("created_at", { ascending: true })),
    selectAll<ModelCost>("model_usage", "role, provider, cost_usd", query => query.eq("conversation_id", conversationId)),
  ]);
  return { commitments, paymentLinks, costs };
}

export async function getCustomerCommitments(customerId: string) {
  return selectAll<Commitment>("commitments", COMMITMENT_COLUMNS, query => query.eq("customer_id", customerId).order("created_at", { ascending: false }));
}

export async function getCommitmentList(): Promise<CommitmentListItem[]> {
  const [rows, offers] = await Promise.all([
    selectAll<Commitment>("commitments", COMMITMENT_COLUMNS, query => query.order("created_at", { ascending: false }).limit(1000)),
    selectAll<{ code: string; name: string }>("offers", "code, name"),
  ]);
  const ids = [...new Set(rows.map(row => row.customer_id))];
  const customers = ids.length ? await selectAll<{ id: string; full_name: string; customer_code: string | null }>("customers", "id, full_name, customer_code", query => query.in("id", ids)) : [];
  const byId = new Map(customers.map(row => [row.id, row]));
  const offerNames = new Map(offers.map(offer => [offer.code, offer.name]));
  return rows.map(row => ({ ...row, customer_name: byId.get(row.customer_id)?.full_name ?? "Cliente", customer_code: byId.get(row.customer_id)?.customer_code ?? null, offer_name: offerNames.get(row.offer_code) ?? null }));
}

export async function getOfferNames() {
  const rows = await selectAll<{ code: string; name: string }>("offers", "code, name");
  return Object.fromEntries(rows.map(row => [row.code, row.name])) as Record<string, string>;
}

/** v_conversation_results (migración 20260913000100). null si la vista aún no existe (42P01) o no hay fila. */
export async function getConversationResult(conversationId: string): Promise<ConversationResult | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_conversation_results").select("bank_result, turns_under_2s_pct, guardrail_events").eq("conversation_id", conversationId).maybeSingle();
  if (error) return null;
  return data as ConversationResult | null;
}

export async function getPromiseKpiData() {
  const supabase = await createClient();
  const [commitments, results] = await Promise.all([
    selectAll<{ status: string; amount: number | null; created_at: string }>("commitments", "status, amount, created_at"),
    // Llamadas de voz terminadas: base para "% con resultado claro".
    supabase.from("v_conversation_results").select("bank_result").eq("channel", "voice").not("ended_at", "is", null),
  ]);
  if (!results.error) return { commitments, voiceCalls: (results.data ?? []) as { bank_result: string }[], fromView: true };
  const fallback = await selectAll<{ outcome: string | null; commitment_id: string | null }>("conversations", "outcome, commitment_id", query => query.eq("channel", "voice").not("ended_at", "is", null));
  return { commitments, voiceCalls: fallback.map(row => ({ bank_result: null, ...row })), fromView: false };
}
