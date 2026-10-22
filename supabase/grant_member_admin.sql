-- Who may run this: Faris, in the rizqey-admin SQL editor.
-- It needs Faris's go. If he has not said yes, stop.
-- Someone else may run it only after Faris has told them to.
--
-- Gives one email the admin role in makan_members.
-- Replace PUT_EMAIL_HERE with that person's address. Do not commit the filled-in file.
-- The address must already have one row (an invite or a sign-up). This does not create an office.
-- Safe to run again: if that email is already the admin on its single row, nothing changes.
-- Table shape from supabase/makan_migration_2.sql:
--   id, office_id, email, name, role, user_id, invited_by, created_at.
-- Only role is written. email stays lowercase, which is what the table check requires.

do $$
declare
  v_email text := lower(btrim('PUT_EMAIL_HERE'));
  n int;
begin
  if v_email = 'put_email_here' then
    raise exception 'Replace PUT_EMAIL_HERE before running. This needs Faris''s go.';
  end if;
  if length(v_email) > 254 or v_email not like '_%@_%._%' then
    raise exception 'That email does not fit makan_members (lowercase, 254 characters or fewer, shaped like name@company.my).';
  end if;

  select count(*) into n from public.makan_members where email = v_email;
  if n = 0 then
    raise exception 'No makan_members row for %. Invite this email to the office first, then run this again.', v_email;
  end if;
  if n > 1 then
    raise exception 'This email is on more than one office. Stop, and ask Faris which office should become admin.';
  end if;

  update public.makan_members
     set role = 'admin'
   where email = v_email
     and role is distinct from 'admin';
end $$;
