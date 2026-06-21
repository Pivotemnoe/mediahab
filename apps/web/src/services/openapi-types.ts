export type JsonObject = Record<string, unknown>;

export interface MeWorkspaceOut {
  id: string;
  name: string;
  role: string;
  slug: string;
}

export interface MeResponse {
  user: {
    display_name: string;
    email: string;
    email_verified: boolean;
    id: string;
  };
  workspaces: MeWorkspaceOut[];
}

export interface SessionOut {
  current: boolean;
  expires_at: string;
  id: string;
  last_seen_at: string;
  revoked_at: string | null;
  user_agent: string | null;
}

export interface SessionsResponse {
  sessions: SessionOut[];
}

export interface WorkspaceOut {
  default_locale: string;
  id: string;
  name: string;
  role: string;
  slug: string;
  status: string;
  timezone: string;
}

export interface WorkspaceListResponse {
  workspaces: WorkspaceOut[];
}

export interface MemberOut {
  accepted: boolean;
  display_name: string;
  email: string;
  publication_permission: string;
  role: string;
  user_id: string;
}

export interface MembersResponse {
  members: MemberOut[];
}

export interface ProjectOut {
  active_version_id: string;
  active_version_number: number;
  content_domain: string | null;
  description: string | null;
  id: string;
  language: string;
  name: string;
  preset_key: string | null;
  rubric_count?: number;
  slug: string;
  status: string;
  workspace_id: string;
}

export interface ProjectListResponse {
  projects: ProjectOut[];
}

export interface RubricOut {
  active_version_id: string;
  active_version_number: number;
  ai_mode: string;
  description: string | null;
  editorial_max_chars: number | null;
  editorial_min_chars: number | null;
  generated_fields: string[];
  id: string;
  input_schema_id: string;
  name: string;
  project_id: string;
  slug: string;
  sort_order: number;
  status: string;
  workspace_id: string;
}

export interface RubricListResponse {
  rubrics: RubricOut[];
}

export interface ContentItemOut {
  created_at: string;
  id: string;
  project_id: string;
  project_version_id: string;
  rubric_id: string;
  rubric_version_id: string;
  status: string;
  title_internal: string;
  updated_at: string;
  version: number;
  workspace_id: string;
}

export interface ContentListResponse {
  content_items: ContentItemOut[];
}

export interface ExampleOut {
  character_count: number;
  created_at: string;
  id: string;
  labels: string[];
  manual_quality_score: number | null;
  project_id: string;
  rubric_id: string | null;
  source_external_id: string | null;
  source_type: string;
  status: string;
  text: string;
  title: string | null;
  workspace_id: string;
}

export interface ExampleListResponse {
  examples: ExampleOut[];
}

export interface ContentMediaOut {
  caption: string | null;
  content_item_id: string;
  id: string;
  media_asset_id: string;
  role: string;
  sort_order: number;
}

export interface ContentMediaResponse {
  media: ContentMediaOut[];
}

export interface BlockOut {
  content_item_id: string;
  field_key: string;
  group_index: number | null;
  group_key: string | null;
  id: string;
  is_locked: boolean;
  revision_number: number;
  source_media_id: string | null;
  source_type: string;
  transcript_text: string | null;
  updated_at: string;
  value_json: unknown;
}

export interface BlocksResponse {
  blocks: BlockOut[];
}

export interface GenerationRunOut {
  completed_at: string | null;
  content_item_id: string;
  created_at: string;
  error_code: string | null;
  error_message: string | null;
  id: string;
  input_characters: number | null;
  input_tokens: number | null;
  latency_ms: number | null;
  model_id: string;
  output_characters: number | null;
  output_tokens: number | null;
  project_id: string;
  provider_key: string;
  response_json: JsonObject | null;
  retrieved_example_ids: string[];
  retry_count: number;
  rubric_id: string;
  status: string;
  task_type: string;
  workspace_id: string;
}

export interface PlatformVariantOut {
  approved_at: string | null;
  character_count: number;
  content_item_id: string;
  created_at: string;
  id: string;
  master_revision_id: string;
  parent_variant_id: string | null;
  payload: JsonObject;
  platform_key: string;
  rendered_text: string;
  revision_number: number;
  status: string;
  superseded_by_variant_id: string | null;
  text: string;
  updated_at: string;
  validation: JsonObject;
  workspace_id: string;
}

export interface PlatformVariantsResponse {
  variants: PlatformVariantOut[];
}

export interface UsageLimitOut {
  key?: string;
  label?: string;
  limit?: number;
  status?: string;
  unit?: string;
  upgrade_plan_key?: string;
  used?: number;
}

export interface UsageResponse {
  entitlements: JsonObject;
  limits: UsageLimitOut[];
  usage: Record<string, number>;
  workspace_id: string;
}

export interface SubscriptionResponse {
  current_period_end: string | null;
  payment_captured: boolean;
  plan_key: string;
  plan_name: string;
  provider_key: string;
  status: string;
  workspace_id: string;
}

export interface PriceOut {
  amount_minor: number;
  currency: string;
  interval: string;
  provider_price_id: string | null;
}

export interface PlanOut {
  description: string;
  entitlements: JsonObject;
  id: string;
  is_active: boolean;
  key: string;
  name: string;
  prices: PriceOut[];
}

export interface PlansResponse {
  plans: PlanOut[];
}

export interface PaymentOut {
  amount_minor: number;
  created_at: string;
  currency: string;
  id: string;
  payment_captured: boolean;
  provider_key: string;
  provider_payment_id: string | null;
  status: string;
  workspace_id: string;
}

export interface PaymentsResponse {
  payments: PaymentOut[];
}

export interface DestinationOut {
  configuration: JsonObject;
  connector_key: string;
  created_at: string;
  id: string;
  name: string;
  platform_key: string;
  project_id: string;
  publication_mode: string;
  status: string;
  updated_at: string;
  version: number;
  workspace_id: string;
}

export interface DestinationsResponse {
  destinations: DestinationOut[];
}

export interface PublicationOut {
  cancelled_at: string | null;
  confirmation_evidence: JsonObject | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  content_item_id: string;
  created_at: string;
  destination_id: string;
  external_post_id: string | null;
  external_posts: JsonObject[];
  external_url: string | null;
  id: string;
  idempotency_key: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  platform_variant_id: string;
  project_id: string;
  publication_method: string | null;
  published_at: string | null;
  queued_at: string | null;
  scheduled_at: string | null;
  status: string;
  updated_at: string;
  version: number;
  workspace_id: string;
}

export interface PublicationsResponse {
  publications: PublicationOut[];
}

export interface AttemptOut {
  attempt_number: number;
  completed_at: string | null;
  connector_key: string;
  destination_id: string;
  error_code: string | null;
  error_message: string | null;
  id: string;
  publication_id: string;
  request_payload: JsonObject | null;
  response_payload: JsonObject | null;
  retryable: boolean;
  started_at: string;
  status: string;
}

export interface AttemptsResponse {
  attempts: AttemptOut[];
}
