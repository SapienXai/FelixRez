-- Expand admin_profiles.role to support readonly role

alter table public.admin_profiles
  drop constraint if exists admin_profiles_role_check;

alter table public.admin_profiles
  add constraint admin_profiles_role_check
  check (role in ('admin', 'manager', 'staff', 'readonly'));
