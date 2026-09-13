export type RiskBand = "BAJO" | "MODERADO" | "PREVENTIVO" | "ALTO" | "CRITICO";
export type Grade = "A" | "B" | "C" | "D" | "E";

export type Kpis = {
  customers_total: number;
  customers_at_risk: number;
  interventions_scheduled: number;
  conversations_live: number;
  conversations_45d: number;
  customers_contacted: number;
  response_rate_pct: number | null;
  commitments_45d: number;
  commitment_rate_pct: number | null;
  commitment_kept_rate_pct: number | null;
  paid_via_links_usd: number;
  escalations_open: number;
  escalation_rate_pct: number | null;
  avg_latency_ms: number | null;
  p95_voice_latency_ms: number | null;
  voice_interruption_rate_pct: number | null;
  avg_cost_per_conversation_usd: number | null;
  positive_or_neutral_end_pct: number | null;
  failed_interactions: number;
  control_group_size: number;
};

export type CustomerOverview = {
  customer_id: string;
  customer_code: string;
  full_name: string;
  first_name: string;
  segment: string | null;
  department: string | null;
  city: string | null;
  income_type: string | null;
  preferred_channel: string | null;
  is_control_group: boolean;
  contact_enabled: boolean;
  is_demo_persona: boolean;
  opted_out: boolean;
  demo_notes: string | null;
  loan_id: string | null;
  product_type: string | null;
  balance: number | null;
  amount_due: number | null;
  next_due_date: string | null;
  days_to_due: number | null;
  days_past_due: number | null;
  risk_score: number | null;
  risk_band: RiskBand | null;
  probability_default: number | null;
  top_factors: { factor?: string; label?: string; weight?: number; points?: number; contribution?: number; detail?: string }[] | null;
  active_signals: string[] | null;
  last_contact_at: string | null;
  last_contact_channel: string | null;
  last_outcome: string | null;
  intervention_status: string | null;
  open_commitments: number;
};

export type RiskDistributionRow = { band: RiskBand; customers: number; avg_score: number | null };

export type LiveConversation = {
  conversation_id: string;
  channel: string;
  direction: string;
  started_at: string;
  seconds_elapsed: number;
  customer_code: string;
  full_name: string;
  playbook_key: string | null;
  current_stage: string | null;
  current_stage_name: string | null;
  turn_count: number;
  sentiment_start: string | null;
  sentiment_end: string | null;
  interruption_count: number;
  refusal_count: number;
  terms_interrupted: string[] | null;
  escalated: boolean;
  risk_before: number | null;
  matched_rules: unknown;
  allowed_offers: unknown;
  models: unknown;
  last_message_role: string | null;
  last_message: string | null;
  last_message_at: string | null;
  current_pace: string | null;
  last_decision: string | null;
  last_rule: string | null;
  last_intent: string | null;
};

export type ConversationTimelineEvent = {
  conversation_id: string;
  at: string;
  kind: string;
  role: string | null;
  stage_key: string | null;
  title: string | null;
  detail: string | null;
  data: unknown;
};

export type Intervention = {
  id: string;
  customer_id: string;
  loan_id: string | null;
  status: string;
  priority: number | null;
  risk_score: number | null;
  risk_band: RiskBand | null;
  matched_rules: unknown;
  block_reasons: unknown;
  offers: unknown;
  playbook_key: string | null;
  channel_sequence: string[] | null;
  recommended_channel: string | null;
  reason: string | null;
  scheduled_for: string | null;
  dispatched_at: string | null;
  completed_at: string | null;
  conversation_id: string | null;
  created_at: string;
};

export type ConversationSummary = {
  id: string;
  channel: string;
  status: string;
  outcome: string | null;
  outcome_reason: string | null;
  summary: string | null;
  started_at: string;
  ended_at: string | null;
  risk_before: number | null;
  risk_after: number | null;
  escalated: boolean;
};

export type Message = {
  id: string;
  conversation_id: string;
  seq: number;
  role: string;
  content: string | null;
  stage_key: string | null;
  latency_ms: number | null;
  interrupted: boolean;
  heard_text: string | null;
  is_backchannel: boolean;
  meta: unknown;
  created_at: string;
};

export type TurnEvaluation = {
  id: string;
  conversation_id: string;
  message_id: string | null;
  seq: number;
  stage_key: string | null;
  intent: string | null;
  sentiment: string | null;
  sentiment_score: number | null;
  confidence: number | null;
  decision: string | null;
  from_stage: string | null;
  to_stage: string | null;
  rule_id: string | null;
  rule_label: string | null;
  pace: string | null;
  commitment_signal: string | null;
  created_at: string;
};

export type ConversationEvent = {
  id: string;
  conversation_id: string;
  customer_id: string | null;
  event_type: string;
  severity: string | null;
  payload: unknown;
  created_at: string;
};

export type ConversationRow = {
  id: string;
  customer_id: string;
  playbook_id: string | null;
  channel: string;
  status: string;
  current_stage: string | null;
  turn_count: number;
  outcome: string | null;
  risk_before: number | null;
  risk_after: number | null;
  cost_usd: number | null;
  started_at: string;
  ended_at: string | null;
  outcome_reason: string | null;
  summary: string | null;
  commitment_id: string | null;
  terms_presented: string[] | null;
  duration_ms: number | null;
  avg_latency_ms: number | null;
  p95_latency_ms: number | null;
  interruption_count: number;
};

export type Commitment = {
  id: string;
  conversation_id: string | null;
  customer_id: string;
  offer_code: string;
  commitment_type: string;
  amount: number | null;
  committed_date: string | null;
  original_due_date: string | null;
  terms_text: string | null;
  status: string;
  requires_approval: boolean;
  customer_confirmed: boolean;
  policy_validated: boolean;
  receipt_code: string;
  created_at: string;
  resolved_at: string | null;
};

export type CommitmentListItem = Commitment & { customer_name: string; customer_code: string | null; offer_name: string | null };

export type PaymentLink = { id: string; conversation_id: string | null; commitment_id: string | null; token: string; url: string; amount: number; status: string; expires_at: string; paid_at: string | null; created_at: string };

export type ModelCost = { role: string | null; provider: string | null; cost_usd: number | null };

export type PlaybookStage = { id: string; stage_key: string; position: number; name: string; objective: string | null; is_terminal: boolean };

export type CohortImpact = { cohort: string; installments: number; on_time_or_commitment_kept: number; late: number; late_rate_pct: number | null };
export type ChannelPerformance = { channel: string; conversations: number; responded: number; response_rate_pct: number | null; commitments: number; commitment_rate_pct: number | null; kept_rate_pct: number | null; escalations: number; avg_duration_s: number | null; avg_latency_ms: number | null; avg_cost_usd: number | null };
export type RulePerformance = { rule_key: string; rule_name: string; conversations: number; commitments: number; commitment_rate_pct: number | null; kept_rate_pct: number | null; escalation_rate_pct: number | null; avg_risk_reduction: number | null };
export type OfferPerformance = { offer_code: string; offer_name: string; offer_type: string; times_allowed: number; times_accepted: number; kept: number; broken: number; kept_rate_pct: number | null; amount_committed: number | null };
export type StageFunnel = { playbook_key: string; stage_key: string; position: number; conversations_reached: number; agent_turns: number; interruptions: number; interruption_rate_pct: number | null; avg_latency_ms: number | null };
export type DailyMetric = { day: string; conversations: number; commitments: number; escalations: number; no_answer: number; avg_latency_ms: number | null; cost_usd: number | null };
export type SentimentShift = { sentiment_start: string | null; sentiment_end: string | null; conversations: number };
export type ModelPerformance = { model_profile_key: string; display_name: string; role: string; provider: string; status: string; conversations: number; avg_latency_ms: number | null; p95_latency_ms: number | null; cost_per_conversation_usd: number | null; commitment_rate_pct: number | null; avg_interruptions: number | null; avg_false_barge_ins: number | null; includes_synthetic_data: boolean };
export type OutcomeDefinition = { code: string; label: string; category: string; counts_as_contact: boolean; counts_as_commitment: boolean; description: string | null; sort_order: number };
export type SignalDefinition = { code: string; label: string; description: string | null; category: string | null; default_severity: string | null };

export type Condition = { fact: string; op: string; value?: unknown };
export type CollectionRule = { id: string; key: string; name: string; description: string | null; effect: string; priority: number; conditions: { all?: Condition[] } & Record<string, unknown>; playbook_key: string | null; channel_sequence: string[] | null; tone: string | null; constraints: Record<string, unknown> | null; max_attempts: number | null; is_active: boolean };
export type FactDefinition = { key: string; label: string; description: string | null; data_type: "number" | "enum" | "boolean" | "list" | "text"; operators: string[]; options: string[] | null; sort_order: number };
export type Offer = { id: string; code: string; name: string; offer_type: string; description: string | null; params: Record<string, unknown> | null; requires_approval: boolean; generates_payment_link: boolean; is_active: boolean };
export type RuleOffer = { rule_id: string; offer_id: string; position: number };
export type Playbook = { id: string; key: string; name: string; description: string | null; channel_scope: string[] | null; is_active: boolean };
export type PlaybookStageFull = PlaybookStage & { playbook_id: string; agent_instructions: string | null; criteria: string[] | null; max_turns: number | null; allows_offers: boolean; suggested_outcome: string | null };
export type EvaluationCriterion = { key: string; label: string };
export type AgentPolicy = {
  id: string; version: string; name: string; assistant_name: string | null; disclosure_text: string | null; default_playbook_key: string | null;
  default_models: Record<string, string> | null; max_offers_presented: number | null; max_turns_per_conversation: number | null;
  max_contacts_per_week: number | null; cooldown_hours: number | null; quiet_hours: { start?: string; end?: string } | null; forbidden_weekdays: number[] | null;
  live_contact_allowlist_only: boolean; payment_link_ttl_hours: number | null; risk_weights: Record<string, number> | null;
  risk_bands: Record<string, [number, number]> | null; global_transitions: { id?: string; label?: string; go_to?: string; instruction?: string }[] | null;
  prohibited_phrases: string[] | null; updated_at: string | null;
};
export type PendingCommitment = { id: string; customer_id: string; offer_code: string | null; commitment_type: string; amount: number | null; committed_date: string | null; terms_text: string | null; status: string; created_at: string; customer_name: string };
export type OpenEscalation = { id: string; conversation_id: string | null; customer_id: string; reason: string | null; trigger: string | null; priority: string | null; status: string; assigned_to: string | null; notes: string | null; sla_due_at: string | null; created_at: string; resolved_at: string | null; customer_name: string };
