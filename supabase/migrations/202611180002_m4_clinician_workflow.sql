-- Review before application: the intended cohort access scope is not yet agreed.
begin;
alter view public.measurement_summary set (security_invoker = true);
revoke all on public.measurement_summary from public, anon, authenticated, service_role;

-- Existing RLS expressions retain their function dependencies (OIDs).
create schema onconourish_private;
revoke all on schema onconourish_private from public, anon, authenticated;
alter function public.is_patient_owner(uuid) set schema onconourish_private;
alter function public.is_assigned_clinician(uuid) set schema onconourish_private;
alter function public.is_authorized_caregiver(uuid) set schema onconourish_private;
alter function public.require_next_plan_version() set schema onconourish_private;
revoke execute on function onconourish_private.is_patient_owner(uuid),
  onconourish_private.is_assigned_clinician(uuid), onconourish_private.is_authorized_caregiver(uuid)
  from public, anon;
revoke execute on function onconourish_private.require_next_plan_version() from public, anon, authenticated;

create unique index alerts_one_open_per_kind on public.alerts(patient_id, kind) where state = 'open';
create unique index ramadan_one_active_request on public.ramadan_requests(patient_id) where status in ('pending', 'cleared');

-- User reads still use RLS; only the trusted engine writer may mutate these tables.
revoke insert, update on public.checkins from authenticated, anon, public;
revoke insert on public.audit_log from authenticated, anon, public;
grant select on public.patients, public.profiles to service_role;
grant select, insert, update on public.checkins, public.alerts to service_role;
grant insert on public.audit_log to service_role;

create function public.record_engine_checkin(target uuid, owner_id uuid, expected jsonb, entry jsonb, signals jsonb)
returns setof public.alerts
language plpgsql security invoker set search_path = ''
as $$
declare
  actual jsonb;
  item jsonb;
  saved public.alerts;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target::text, 1));
  if not exists (
    select 1 from public.patients p join public.profiles pr on pr.id = p.user_id
    where p.id = target and p.user_id = owner_id and pr.role = 'patient'
  ) then
    raise insufficient_privilege using message = 'Not the patient owner';
  end if;

  select coalesce(jsonb_agg(to_jsonb(c) - 'patient_id' order by c.day), '[]'::jsonb)
  into actual from public.checkins c where c.patient_id = target;
  if actual is distinct from expected then
    raise serialization_failure using message = 'Check-in history changed';
  end if;

  insert into public.checkins (patient_id, day, symptoms, red_flags, appetite, intake_pct, weight_kg)
  select target, v.day, v.symptoms, v.red_flags, v.appetite, v.intake_pct, v.weight_kg
  from jsonb_to_record(entry) as v(day integer, symptoms text[], red_flags text[], appetite integer, intake_pct numeric, weight_kg numeric)
  on conflict (patient_id, day) do update set symptoms = excluded.symptoms, red_flags = excluded.red_flags,
    appetite = excluded.appetite, intake_pct = excluded.intake_pct, weight_kg = excluded.weight_kg;

  for item in select value from jsonb_array_elements(signals) loop
    insert into public.alerts (patient_id, kind, severity, state, evidence)
    values (target, item->>'kind', item->>'severity', 'open', item->'evidence')
    on conflict (patient_id, kind) where state = 'open' do update set
      severity = excluded.severity, evidence = excluded.evidence
    returning * into saved;
    return next saved;
  end loop;

  insert into public.audit_log (actor, patient_id, event, payload)
  values (owner_id, target, 'checkin_recorded', jsonb_build_object(
    'day', (entry->>'day')::integer,
    'alertKinds', coalesce((select jsonb_agg(value->>'kind') from jsonb_array_elements(signals)), '[]'::jsonb)
  ));
end;
$$;
revoke all on function public.record_engine_checkin(uuid, uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.record_engine_checkin(uuid, uuid, jsonb, jsonb, jsonb) to service_role;
commit;
