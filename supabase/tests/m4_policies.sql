\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text) returns void language plpgsql as $$
begin
  if value is distinct from true then raise exception 'Assertion failed: %', message; end if;
end;
$$;

insert into auth.users (id, aud, role, email, created_at, updated_at)
select ('60000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated',
  'm4-' || n || '@example.invalid', now(), now()
from generate_series(1, 4) n;
insert into public.profiles (id, role, display_name) values
 ('60000000-0000-4000-8000-000000000001', 'patient', 'Synthetic owner'),
 ('60000000-0000-4000-8000-000000000002', 'clinician', 'Synthetic assigned clinician'),
 ('60000000-0000-4000-8000-000000000003', 'clinician', 'Synthetic unassigned clinician'),
 ('60000000-0000-4000-8000-000000000004', 'caregiver', 'Synthetic caregiver');
insert into public.patients (id, user_id, clinician_id, pseudonym, dx, regimen, cycle_start, baseline_weight_kg, budget)
values ('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000002', 'Synthetic patient', 'placeholder', 'placeholder', '2026-01-01', 60, 1);
insert into public.consents (patient_id, purpose, granted)
values
 ('70000000-0000-4000-8000-000000000001', 'share_with_care_team', true),
 ('70000000-0000-4000-8000-000000000001', 'caregiver_access', false);
insert into public.caregiver_links (patient_id, caregiver_user_id, active)
values ('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000004', true);

select pg_temp.assert_true(to_regprocedure('public.is_patient_owner(uuid)') is null
  and to_regprocedure('public.is_assigned_clinician(uuid)') is null
  and to_regprocedure('public.is_authorized_caregiver(uuid)') is null, 'helpers are outside the exposed schema');
select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.measurement_summary', 'SELECT')
  and not has_table_privilege('anon', 'public.measurement_summary', 'SELECT'), 'measurement access quarantined');
select pg_temp.assert_true(not has_function_privilege('authenticated',
  'public.record_engine_checkin(uuid,uuid,jsonb,jsonb,jsonb)', 'EXECUTE'), 'writer is not callable by authenticated API role');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.checkins', 'INSERT,UPDATE')
  and not has_table_privilege('authenticated', 'public.audit_log', 'INSERT'), 'direct writes are disabled');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.caregiver_links', 'INSERT,UPDATE'),
  'caregiver links are managed outside patient clients');

set local role service_role;
select pg_temp.assert_true((select count(*) = 1 from public.record_engine_checkin(
  '70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '[]',
  '{"day":9,"symptoms":[],"red_flags":["red_fever"],"appetite":2,"intake_pct":50,"weight_kg":59}',
  '[{"kind":"red_flag","severity":"urgent","evidence":{"day":9,"flags":["red_fever"]}}]'
)), 'writer records check-in and returns the alert');
do $$
begin
  begin
    perform public.record_engine_checkin(
      '70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002',
      '[]', '{}', '[]');
    raise exception 'Expected owner mismatch';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.record_engine_checkin(
      '70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001',
      '[]', '{}', '[]');
    raise exception 'Expected stale history rejection';
  exception when serialization_failure then null;
  end;
end;
$$;
reset role;
select pg_temp.assert_true((select count(*) = 1 from public.audit_log
  where patient_id = '70000000-0000-4000-8000-000000000001' and payload = '{"day":9,"alertKinds":["red_flag"]}'),
  'audit contains only day and alert IDs');

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into public.ramadan_requests (patient_id) values ('70000000-0000-4000-8000-000000000001');
with changed as (update public.ramadan_requests set status = 'cleared', decided_by = auth.uid(), decided_at = now()
  where patient_id = '70000000-0000-4000-8000-000000000001' returning id)
select pg_temp.assert_true((select count(*) = 0 from changed), 'owner cannot clear');
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
select pg_temp.assert_true((select count(*) = 1 from public.alerts
  where patient_id = '70000000-0000-4000-8000-000000000001'), 'assigned clinician can read evidence');
insert into public.plans (patient_id, version, items, status, approved_by, approved_at)
values ('70000000-0000-4000-8000-000000000001', 1, '["liquid"]', 'approved', auth.uid(), now());
with changed as (update public.ramadan_requests set status = 'cleared', decided_by = auth.uid(), decided_at = now()
  where patient_id = '70000000-0000-4000-8000-000000000001' returning id)
select pg_temp.assert_true((select count(*) = 1 from changed), 'assigned clinician can clear');
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true((select count(*) = 1 from public.plans
  where patient_id = '70000000-0000-4000-8000-000000000001' and version = 1), 'owner can read approved plan');
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000003', true);
select pg_temp.assert_true((select count(*) = 0 from public.alerts
  where patient_id = '70000000-0000-4000-8000-000000000001'), 'unassigned clinician denied');
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000004', true);
select pg_temp.assert_true((select count(*) = 0 from public.checkins
  where patient_id = '70000000-0000-4000-8000-000000000001')
  and (select count(*) = 0 from public.caregiver_links
    where patient_id = '70000000-0000-4000-8000-000000000001'), 'caregiver without consent is denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
update public.consents set granted = true
  where patient_id = '70000000-0000-4000-8000-000000000001' and purpose = 'caregiver_access';
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000004', true);
select pg_temp.assert_true((select count(*) = 1 from public.checkins
  where patient_id = '70000000-0000-4000-8000-000000000001')
  and (select count(*) = 1 from public.caregiver_links
    where patient_id = '70000000-0000-4000-8000-000000000001'), 'caregiver with link and consent can read shared check-ins');
select pg_temp.assert_true((select count(*) = 0 from public.patients
  where id = '70000000-0000-4000-8000-000000000001'), 'caregiver cannot read patient profile details');
update public.consents set granted = false
  where patient_id = '70000000-0000-4000-8000-000000000001' and purpose = 'caregiver_access';
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
select pg_temp.assert_true((select count(*) = 0 from public.alerts
  where patient_id = '70000000-0000-4000-8000-000000000001'), 'revocation blocks previously assigned clinician');
rollback;
