-- Caregiver journeys are read-only and require both an active link and patient consent.
begin;

drop policy if exists caregiver_link_owner on public.caregiver_links;
revoke insert, update on public.caregiver_links from authenticated;

create policy caregiver_link_owner_read on public.caregiver_links
  for select to authenticated
  using (onconourish_private.is_patient_owner(patient_id));

create policy caregiver_link_self_read on public.caregiver_links
  for select to authenticated
  using (
    caregiver_user_id = auth.uid()
    and active
    and onconourish_private.is_authorized_caregiver(patient_id)
  );

commit;
