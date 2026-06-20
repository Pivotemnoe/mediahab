INSERT INTO roles (key, name, description, can_manage_billing, can_manage_members, can_publish, created_at)
VALUES
  ('owner', 'Owner', 'Full workspace and billing control.', true, true, true, now()),
  ('admin', 'Admin', 'Workspace settings, members except ownership, integrations, and content.', false, true, true, now()),
  ('editor', 'Editor', 'Content, media, examples, and publication preparation.', false, false, false, now()),
  ('viewer', 'Viewer', 'Read-only workspace access.', false, false, false, now())
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  can_manage_billing = EXCLUDED.can_manage_billing,
  can_manage_members = EXCLUDED.can_manage_members,
  can_publish = EXCLUDED.can_publish;

INSERT INTO plans (id, key, name, description, is_active, created_at, updated_at, version)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'free', 'Free', 'Editable free plan for local MVP usage.', true, now(), now(), 1),
  ('00000000-0000-0000-0000-000000000102', 'start', 'Start', 'Editable starter plan placeholder.', true, now(), now(), 1),
  ('00000000-0000-0000-0000-000000000103', 'pro', 'Pro', 'Editable professional plan placeholder.', true, now(), now(), 1),
  ('00000000-0000-0000-0000-000000000104', 'business', 'Business', 'Editable business plan placeholder.', true, now(), now(), 1)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO prices (id, plan_id, provider_key, currency, amount_minor, interval, is_active, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'mock', 'RUB', 0, 'month', true, now()),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000102', 'mock', 'RUB', 0, 'month', true, now()),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000103', 'mock', 'RUB', 0, 'month', true, now()),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000104', 'mock', 'RUB', 0, 'month', true, now())
ON CONFLICT (id) DO UPDATE SET
  provider_key = EXCLUDED.provider_key,
  currency = EXCLUDED.currency,
  amount_minor = EXCLUDED.amount_minor,
  interval = EXCLUDED.interval,
  is_active = EXCLUDED.is_active;

INSERT INTO entitlements (id, plan_id, key, value_json, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000001101', '00000000-0000-0000-0000-000000000101', 'team.seats.max', '1'::json, now(), now()),
  ('00000000-0000-0000-0000-000000001102', '00000000-0000-0000-0000-000000000101', 'projects.max', '1'::json, now(), now()),
  ('00000000-0000-0000-0000-000000001103', '00000000-0000-0000-0000-000000000101', 'ai.text_generations.monthly', '25'::json, now(), now()),
  ('00000000-0000-0000-0000-000000001104', '00000000-0000-0000-0000-000000000101', 'feature.instagram_publish', 'false'::json, now(), now()),

  ('00000000-0000-0000-0000-000000001201', '00000000-0000-0000-0000-000000000102', 'team.seats.max', '3'::json, now(), now()),
  ('00000000-0000-0000-0000-000000001202', '00000000-0000-0000-0000-000000000102', 'projects.max', '3'::json, now(), now()),
  ('00000000-0000-0000-0000-000000001203', '00000000-0000-0000-0000-000000000102', 'ai.text_generations.monthly', '250'::json, now(), now()),
  ('00000000-0000-0000-0000-000000001204', '00000000-0000-0000-0000-000000000102', 'feature.instagram_publish', 'false'::json, now(), now()),

  ('00000000-0000-0000-0000-000000001301', '00000000-0000-0000-0000-000000000103', 'team.seats.max', '10'::json, now(), now()),
  ('00000000-0000-0000-0000-000000001302', '00000000-0000-0000-0000-000000000103', 'projects.max', '15'::json, now(), now()),
  ('00000000-0000-0000-0000-000000001303', '00000000-0000-0000-0000-000000000103', 'ai.text_generations.monthly', '2000'::json, now(), now()),
  ('00000000-0000-0000-0000-000000001304', '00000000-0000-0000-0000-000000000103', 'feature.instagram_publish', 'true'::json, now(), now()),

  ('00000000-0000-0000-0000-000000001401', '00000000-0000-0000-0000-000000000104', 'team.seats.max', '30'::json, now(), now()),
  ('00000000-0000-0000-0000-000000001402', '00000000-0000-0000-0000-000000000104', 'projects.max', '100'::json, now(), now()),
  ('00000000-0000-0000-0000-000000001403', '00000000-0000-0000-0000-000000000104', 'ai.text_generations.monthly', '10000'::json, now(), now()),
  ('00000000-0000-0000-0000-000000001404', '00000000-0000-0000-0000-000000000104', 'feature.instagram_publish', 'true'::json, now(), now())
ON CONFLICT ON CONSTRAINT uq_entitlements_plan_key DO UPDATE SET
  value_json = EXCLUDED.value_json,
  updated_at = now();
