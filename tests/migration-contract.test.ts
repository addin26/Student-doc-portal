import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(new URL('../supabase/migrations/20260803130000_resource_lifecycle_and_search_v2.sql', import.meta.url), 'utf8');
const privateDataMigration = readFileSync(new URL('../supabase/migrations/20260803140000_private_data_account_state.sql', import.meta.url), 'utf8');

test('lifecycle migration retains security-definer and explicit grant boundaries', () => {
  assert.match(migration, /security definer/i);
  assert.match(migration, /revoke all on function public\.consume_api_rate_limit_v2/i);
  assert.match(migration, /grant execute on function public\.consume_api_rate_limit_v2[^;]+ to authenticated/i);
  assert.match(migration, /grant execute on function public\.claim_account_erasure_job[^;]+ to service_role/i);
});

test('lifecycle migration includes account erasure and combined rate limits', () => {
  assert.match(migration, /create table if not exists public\.account_erasure_jobs/i);
  assert.match(migration, /interval '30 days'/i);
  assert.match(migration, /grant select on table public\.account_erasure_jobs to authenticated/i);
  assert.match(migration, /create table if not exists public\.api_ip_rate_limit_buckets/i);
  assert.match(migration, /on delete set null/i);
});

test('private data remains readable while suspended and is hidden after deletion', () => {
  assert.match(privateDataMigration, /create or replace function public\.can_read_private_account_data\(\)/i);
  assert.match(privateDataMigration, /account_status in \('active'::public\.account_status, 'suspended'::public\.account_status\)/i);
  assert.match(privateDataMigration, /create policy "select_own_study_notes"[\s\S]+?can_read_private_account_data\(\)/i);
  assert.match(privateDataMigration, /create policy "owner_read_resources"[\s\S]+?can_read_private_account_data\(\)/i);
});

test('suspended resource owners cannot mutate uploads', () => {
  assert.match(privateDataMigration, /create policy "update_own_resources"[\s\S]+?is_active_user\(\)/i);
});
