-- Synthetic prototype only. Clinical values require review.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id),
  role text not null check (role in ('patient', 'caregiver', 'clinician')),
  display_name text not null,
  locale text not null default 'en' check (locale in ('en', 'ar'))
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id),
  clinician_id uuid references public.profiles(id),
  pseudonym text not null,
  dx text not null,
  regimen text not null,
  cycle_start date not null,
  baseline_weight_kg numeric not null check (baseline_weight_kg > 0),
  targets jsonb not null default '{}'::jsonb,
  likes text[] not null default '{}' check (likes <@ array[
    'laban', 'shake', 'muhal', 'lentil', 'khichdi', 'oats', 'eggs', 'hummus',
    'dates', 'ricepud', 'banana', 'icecream', 'mash', 'chsoup', 'labneh', 'yog',
    'plate', 'mujad', 'kebab', 'softegg', 'baladi', 'sprouts', 'deli'
  ]::text[]),
  budget integer not null check (budget between 1 and 3),
  locale text not null default 'en' check (locale in ('en', 'ar'))
);

create table public.consents (
  patient_id uuid not null references public.patients(id),
  purpose text not null check (purpose in ('share_with_care_team', 'caregiver_access', 'whatsapp_reminders')),
  granted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (patient_id, purpose)
);

create table public.caregiver_links (
  patient_id uuid not null references public.patients(id),
  caregiver_user_id uuid not null references public.profiles(id),
  active boolean not null default false,
  primary key (patient_id, caregiver_user_id)
);

create table public.checkins (
  patient_id uuid not null references public.patients(id),
  day integer not null check (day > 0),
  symptoms text[] not null default '{}' check (symptoms <@ array[
    'nausea', 'nausea_severe', 'metallic', 'mouth_sores', 'steroid_hunger',
    'low_immunity', 'fatigue'
  ]::text[]),
  red_flags text[] not null default '{}' check (red_flags <@ array['red_fluids', 'red_fever']::text[]),
  appetite integer not null check (appetite between 1 and 5),
  intake_pct numeric not null check (intake_pct between 0 and 100),
  weight_kg numeric check (weight_kg > 0),
  primary key (patient_id, day)
);

create table public.barrier_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  day integer not null check (day > 0),
  barrier text not null,
  response_id text not null
);

create table public.actions_offered (
  patient_id uuid not null references public.patients(id),
  day integer not null check (day > 0),
  action_type text not null,
  done boolean not null default false,
  primary key (patient_id, day, action_type)
);

create table public.plans (
  patient_id uuid not null references public.patients(id),
  version integer not null check (version > 0),
  items jsonb not null check (jsonb_typeof(items) = 'array'
    and items <@ '["liquid", "small", "fluids", "cold", "hot"]'::jsonb),
  note text,
  status text not null check (status in ('draft', 'approved')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  primary key (patient_id, version),
  check ((status = 'approved' and approved_by is not null and approved_at is not null)
    or (status = 'draft' and approved_by is null and approved_at is null))
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  kind text not null check (kind in ('nutrition_decline', 'engagement_drop', 'red_flag')),
  severity text not null,
  state text not null default 'open' check (state in ('open', 'reviewed')),
  evidence jsonb not null,
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz
);

create table public.ramadan_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  status text not null default 'pending' check (status in ('pending', 'cleared', 'declined')),
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  check ((status = 'pending' and decided_by is null and decided_at is null)
    or (status in ('cleared', 'declined') and decided_by is not null and decided_at is not null))
);

create table public.food_items (
  id text primary key,
  name_en text not null,
  name_ar text not null,
  serving text not null,
  kcal numeric not null check (kcal >= 0),
  protein_g numeric not null check (protein_g >= 0),
  temp text not null check (temp in ('cold', 'warm', 'room')),
  texture text not null check (texture in ('liquid', 'soft', 'solid')),
  tags text[] not null default '{}',
  cost integer not null check (cost between 1 and 3),
  fs_risk text,
  source text not null,
  reviewed_by text,
  reviewed_at timestamptz,
  placeholder boolean not null default true
);

create table public.rules (
  id text primary key,
  version integer not null,
  text text not null,
  owner text not null,
  status text not null default 'placeholder',
  reviewed_by text,
  reviewed_at timestamptz
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor uuid not null references public.profiles(id),
  patient_id uuid not null references public.patients(id),
  event text not null,
  payload jsonb not null default '{}'::jsonb
);

create index patients_clinician_idx on public.patients (clinician_id);
create index caregiver_links_caregiver_idx on public.caregiver_links (caregiver_user_id);
create index barrier_events_patient_idx on public.barrier_events (patient_id);
create index alerts_patient_idx on public.alerts (patient_id);
create index ramadan_requests_patient_idx on public.ramadan_requests (patient_id);
create index audit_log_patient_idx on public.audit_log (patient_id);

create function public.require_next_plan_version() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare expected integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.patient_id::text, 0));
  select coalesce(max(version), 0) + 1 into expected
    from public.plans where patient_id = new.patient_id;
  if new.version <> expected then
    raise exception 'Plan version must be the next version' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.require_next_plan_version() from public;
create trigger plans_next_version before insert on public.plans
  for each row execute function public.require_next_plan_version();

-- Definer helpers avoid recursive RLS. They only answer authorization questions
-- about the caller and use a fixed search path.
create function public.is_patient_owner(target uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.patients p join public.profiles pr on pr.id = p.user_id
    where p.id = target and p.user_id = auth.uid() and pr.role = 'patient'
  );
$$;

create function public.is_assigned_clinician(target uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.patients p join public.profiles pr on pr.id = p.clinician_id
    where p.id = target and p.clinician_id = auth.uid() and pr.role = 'clinician'
      and exists (select 1 from public.consents c where c.patient_id = p.id
        and c.purpose = 'share_with_care_team' and c.granted)
  );
$$;

create function public.is_authorized_caregiver(target uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.caregiver_links l
    join public.profiles pr on pr.id = l.caregiver_user_id
    join public.consents c on c.patient_id = l.patient_id
    where l.patient_id = target and l.caregiver_user_id = auth.uid()
      and pr.role = 'caregiver' and l.active
      and c.purpose = 'caregiver_access' and c.granted
  );
$$;

revoke all on function public.is_patient_owner(uuid), public.is_assigned_clinician(uuid),
  public.is_authorized_caregiver(uuid) from public;
grant execute on function public.is_patient_owner(uuid), public.is_assigned_clinician(uuid),
  public.is_authorized_caregiver(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.consents enable row level security;
alter table public.caregiver_links enable row level security;
alter table public.checkins enable row level security;
alter table public.barrier_events enable row level security;
alter table public.actions_offered enable row level security;
alter table public.plans enable row level security;
alter table public.alerts enable row level security;
alter table public.ramadan_requests enable row level security;
alter table public.food_items enable row level security;
alter table public.rules enable row level security;
alter table public.audit_log enable row level security;

revoke all on public.profiles, public.patients, public.consents, public.caregiver_links,
  public.checkins, public.barrier_events, public.actions_offered, public.plans,
  public.alerts, public.ramadan_requests, public.food_items, public.rules, public.audit_log
  from public, anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, locale) on public.profiles to authenticated;
create policy profile_self_read on public.profiles for select to authenticated using (id = auth.uid());
create policy profile_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Do not grant the ownership and assignment columns to authenticated clients.
grant select (id, pseudonym, dx, regimen, cycle_start, baseline_weight_kg, targets, likes, budget, locale)
  on public.patients to authenticated;
grant update (locale, likes, budget) on public.patients to authenticated;
create policy patient_read on public.patients for select to authenticated
  using (public.is_patient_owner(id) or public.is_assigned_clinician(id));
create policy patient_update on public.patients for update to authenticated
  using (public.is_patient_owner(id)) with check (public.is_patient_owner(id));

grant select, insert, update on public.consents to authenticated;
create policy consent_owner on public.consents for all to authenticated
  using (public.is_patient_owner(patient_id)) with check (public.is_patient_owner(patient_id));

grant select, insert, update on public.caregiver_links to authenticated;
create policy caregiver_link_owner on public.caregiver_links for all to authenticated
  using (public.is_patient_owner(patient_id)) with check (public.is_patient_owner(patient_id));

grant select, insert, update on public.checkins to authenticated;
create policy checkin_read on public.checkins for select to authenticated
  using (public.is_patient_owner(patient_id) or public.is_assigned_clinician(patient_id)
    or public.is_authorized_caregiver(patient_id));
create policy checkin_insert on public.checkins for insert to authenticated
  with check (public.is_patient_owner(patient_id));
create policy checkin_update on public.checkins for update to authenticated
  using (public.is_patient_owner(patient_id)) with check (public.is_patient_owner(patient_id));

grant select, insert, update on public.barrier_events, public.actions_offered to authenticated;
create policy barrier_owner on public.barrier_events for all to authenticated
  using (public.is_patient_owner(patient_id)) with check (public.is_patient_owner(patient_id));
create policy action_owner on public.actions_offered for all to authenticated
  using (public.is_patient_owner(patient_id)) with check (public.is_patient_owner(patient_id));

grant select on public.plans to authenticated;
grant insert on public.plans to authenticated;
create policy plan_read on public.plans for select to authenticated
  using (public.is_patient_owner(patient_id) or public.is_assigned_clinician(patient_id));
create policy plan_approve on public.plans for insert to authenticated
  with check (public.is_assigned_clinician(patient_id) and status = 'approved'
    and approved_by = auth.uid() and approved_at is not null);

grant select on public.alerts to authenticated;
grant update (state, reviewed_by, reviewed_at) on public.alerts to authenticated;
create policy alert_read on public.alerts for select to authenticated
  using (public.is_patient_owner(patient_id) or public.is_assigned_clinician(patient_id));
create policy alert_review on public.alerts for update to authenticated
  using (public.is_assigned_clinician(patient_id))
  with check (public.is_assigned_clinician(patient_id) and state = 'reviewed'
    and reviewed_by = auth.uid() and reviewed_at is not null);

grant select, insert on public.ramadan_requests to authenticated;
grant update (status, decided_by, decided_at) on public.ramadan_requests to authenticated;
create policy ramadan_read on public.ramadan_requests for select to authenticated
  using (public.is_patient_owner(patient_id) or public.is_assigned_clinician(patient_id));
create policy ramadan_request on public.ramadan_requests for insert to authenticated
  with check (public.is_patient_owner(patient_id) and status = 'pending'
    and decided_by is null and decided_at is null);
create policy ramadan_decide on public.ramadan_requests for update to authenticated
  using (public.is_assigned_clinician(patient_id) and status = 'pending')
  with check (public.is_assigned_clinician(patient_id) and status in ('cleared', 'declined')
    and decided_by = auth.uid() and decided_at is not null);

grant select on public.food_items, public.rules to authenticated;
create policy food_read on public.food_items for select to authenticated using (true);
create policy rule_read on public.rules for select to authenticated using (true);

grant insert on public.audit_log to authenticated;
create policy audit_insert on public.audit_log for insert to authenticated
  with check (actor = auth.uid() and (public.is_patient_owner(patient_id)
    or public.is_assigned_clinician(patient_id)));

-- No identifiers or individual records are exposed by this aggregate view.
create view public.measurement_summary as
  select c.day, count(*)::integer as checkin_count,
    avg(c.intake_pct)::numeric(5, 2) as mean_intake_pct
  from public.checkins c
  join public.consents s on s.patient_id = c.patient_id
    and s.purpose = 'share_with_care_team' and s.granted
  where exists (select 1 from public.profiles pr
    where pr.id = auth.uid() and pr.role = 'clinician')
  group by c.day having count(*) >= 5;
revoke all on public.measurement_summary from public, anon, authenticated;
grant select on public.measurement_summary to authenticated;
