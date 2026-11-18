\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text) returns void
language plpgsql as $$
begin
  if value is distinct from true then raise exception 'Assertion failed: %', message; end if;
end;
$$;

create function pg_temp.assert_denied(statement text, message text) returns void
language plpgsql as $$
begin
  begin
    execute statement;
  exception when insufficient_privilege or check_violation then
    return;
  end;
  raise exception 'Expected access to be denied: %', message;
end;
$$;

insert into auth.users (id, aud, role, email, created_at, updated_at) values
 ('30000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'policy-1@example.invalid', now(), now()),
 ('30000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'policy-2@example.invalid', now(), now()),
 ('30000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'policy-3@example.invalid', now(), now()),
 ('30000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'policy-4@example.invalid', now(), now()),
 ('30000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'policy-5@example.invalid', now(), now());
insert into public.profiles (id, role, display_name) values
 ('30000000-0000-4000-8000-000000000001', 'patient', 'Synthetic patient'),
 ('30000000-0000-4000-8000-000000000002', 'patient', 'Synthetic other patient'),
 ('30000000-0000-4000-8000-000000000003', 'clinician', 'Synthetic assigned clinician'),
 ('30000000-0000-4000-8000-000000000004', 'clinician', 'Synthetic unassigned clinician'),
 ('30000000-0000-4000-8000-000000000005', 'caregiver', 'Synthetic caregiver');

select pg_temp.assert_denied(
  $$insert into public.profiles (id, role, display_name) values ('30000000-0000-4000-8000-000000000001', 'employer', 'forbidden')$$,
  'employer role is not permitted');
select pg_temp.assert_denied(
  $$insert into public.profiles (id, role, display_name) values ('30000000-0000-4000-8000-000000000001', 'insurer', 'forbidden')$$,
  'insurer role is not permitted');

insert into public.patients (id, user_id, clinician_id, pseudonym, dx, regimen, cycle_start, baseline_weight_kg, budget) values
 ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 'Synthetic 1', 'placeholder', 'placeholder', '2026-01-01', 60, 1),
 ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000004', 'Synthetic 2', 'placeholder', 'placeholder', '2026-01-01', 70, 1);
insert into public.checkins (patient_id, day, appetite, intake_pct) values
 ('40000000-0000-4000-8000-000000000001', 1, 3, 50),
 ('40000000-0000-4000-8000-000000000002', 1, 4, 75);
insert into public.consents (patient_id, purpose, granted) values
 ('40000000-0000-4000-8000-000000000001', 'share_with_care_team', true),
 ('40000000-0000-4000-8000-000000000001', 'caregiver_access', false),
 ('40000000-0000-4000-8000-000000000002', 'share_with_care_team', true);
insert into public.caregiver_links (patient_id, caregiver_user_id, active)
values ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000005', true);

insert into auth.users (id, aud, role, email, created_at, updated_at)
select ('50000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'authenticated', 'authenticated', 'measurement-' || n || '@example.invalid', now(), now()
from generate_series(1, 5) n;
insert into public.profiles (id, role, display_name)
select ('50000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 'patient', 'Synthetic measurement'
from generate_series(1, 5) n;
insert into public.patients (id, user_id, pseudonym, dx, regimen, cycle_start, baseline_weight_kg, budget)
select ('60000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  ('50000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'Synthetic measurement', 'placeholder', 'placeholder', '2026-01-01', 60, 1
from generate_series(1, 5) n;
insert into public.consents (patient_id, purpose, granted)
select ('60000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 'share_with_care_team', true
from generate_series(1, 5) n;
insert into public.checkins (patient_id, day, appetite, intake_pct)
select ('60000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 99, 3, 50
from generate_series(1, 5) n;

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true((select count(*) = 1 from public.checkins), 'patient sees only own checkin');
select pg_temp.assert_denied(
  $$update public.profiles set role = 'clinician' where id = auth.uid()$$, 'role escalation');
select pg_temp.assert_denied(
  $$update public.patients set clinician_id = auth.uid() where id = '40000000-0000-4000-8000-000000000001'$$, 'assignment change');
select pg_temp.assert_denied(
  $$update public.patients set user_id = '30000000-0000-4000-8000-000000000002' where id = '40000000-0000-4000-8000-000000000001'$$, 'ownership change');
select pg_temp.assert_denied(
  $$insert into public.checkins (patient_id, day, appetite, intake_pct) values ('40000000-0000-4000-8000-000000000002', 2, 3, 50)$$, 'cross-patient insert');
select pg_temp.assert_denied(
  $$insert into public.checkins (patient_id, day, symptoms, appetite, intake_pct) values ('40000000-0000-4000-8000-000000000001', 2, array['private free text'], 3, 50)$$, 'free text in symptom field');
select pg_temp.assert_denied(
  $$delete from public.checkins where patient_id = '40000000-0000-4000-8000-000000000001'$$, 'deleting checkins');
insert into public.audit_log (actor, patient_id, event)
values (auth.uid(), '40000000-0000-4000-8000-000000000001', 'synthetic_test');
select pg_temp.assert_denied(
  $$insert into public.audit_log (actor, patient_id, event) values ('30000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001', 'spoofed')$$, 'audit actor spoofing');
select pg_temp.assert_denied($$update public.audit_log set event = 'altered'$$, 'audit update');
select pg_temp.assert_denied($$delete from public.audit_log$$, 'audit deletion');

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000005', true);
select pg_temp.assert_true((select count(*) = 0 from public.checkins), 'caregiver without consent is denied');
reset role;
update public.consents set granted = true where patient_id = '40000000-0000-4000-8000-000000000001' and purpose = 'caregiver_access';
update public.caregiver_links set active = false where patient_id = '40000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.assert_true((select count(*) = 0 from public.checkins), 'caregiver without active link is denied');
reset role;
update public.caregiver_links set active = true where patient_id = '40000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.assert_true((select count(*) = 1 from public.checkins), 'caregiver with link and consent sees only linked patient');
select pg_temp.assert_denied(
  $$insert into public.checkins (patient_id, day, appetite, intake_pct) values ('40000000-0000-4000-8000-000000000001', 2, 3, 50)$$, 'caregiver cannot write checkins');

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', true);
select pg_temp.assert_true((select count(*) = 1 from public.checkins), 'assigned clinician sees only assigned patient');
select pg_temp.assert_denied($$select user_id from public.patients$$, 'clinician cannot read patient user IDs');
select pg_temp.assert_true((select count(*) = 0 from public.barrier_events), 'clinician cannot read patient barrier text');
insert into public.plans (patient_id, version, items, status, approved_by, approved_at)
values ('40000000-0000-4000-8000-000000000001', 1, '["liquid"]', 'approved', auth.uid(), now());
select pg_temp.assert_denied(
  $$insert into public.plans (patient_id, version, items, status, approved_by, approved_at) values ('40000000-0000-4000-8000-000000000001', 3, '[]', 'approved', auth.uid(), now())$$,
  'plan versions cannot skip');
select pg_temp.assert_denied(
  $$insert into public.plans (patient_id, version, items, status, approved_by, approved_at) values ('40000000-0000-4000-8000-000000000001', 2, '["free text"]', 'approved', auth.uid(), now())$$,
  'plan items must be known action IDs');
select pg_temp.assert_true(
  (select checkin_count = 5 and mean_intake_pct = 50 from public.measurement_summary where day = 99),
  'measurement view returns an aggregate without individual records');
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000004', true);
select pg_temp.assert_true((select count(*) = 0 from public.checkins where patient_id = '40000000-0000-4000-8000-000000000001'), 'unassigned clinician denied');
select pg_temp.assert_denied(
  $$insert into public.plans (patient_id, version, items, status, approved_by, approved_at) values ('40000000-0000-4000-8000-000000000001', 1, '[]', 'approved', auth.uid(), now())$$, 'unassigned clinician cannot approve');

reset role;
update public.consents set granted = false where patient_id = '40000000-0000-4000-8000-000000000001' and purpose = 'share_with_care_team';
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', true);
select pg_temp.assert_true((select count(*) = 0 from public.checkins), 'care-team consent revocation blocks assigned clinician');
select pg_temp.assert_true(
  (select array_agg(column_name::text order by ordinal_position) = array['day', 'checkin_count', 'mean_intake_pct']
   from information_schema.columns where table_schema = 'public' and table_name = 'measurement_summary'),
  'measurement view has no identifying columns');
rollback;
