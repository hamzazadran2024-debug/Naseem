-- Run this in Supabase: SQL Editor > New query > Run

create table companies (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table drivers (
  id bigint generated always as identity primary key,
  name text not null,
  phone text,
  active boolean not null default true
);

create table records (
  id bigint generated always as identity primary key,
  record_date date not null default current_date,
  driver_id bigint not null references drivers(id),
  company_id bigint not null references companies(id),
  trip_no text not null,
  serial_no text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index records_date_idx on records (record_date desc);
create index records_driver_idx on records (driver_id);

create view records_view with (security_invoker = true) as
select r.id, r.record_date, r.driver_id, d.name as driver_name,
       r.company_id, c.name as company_name, r.trip_no, r.serial_no
from records r
join drivers d on d.id = r.driver_id
join companies c on c.id = r.company_id;

-- Only signed-in users (the company head) can read or write.
alter table companies enable row level security;
alter table drivers   enable row level security;
alter table records   enable row level security;

create policy "auth all" on companies for all to authenticated using (true) with check (true);
create policy "auth all" on drivers   for all to authenticated using (true) with check (true);
create policy "auth all" on records   for all to authenticated using (true) with check (true);

-- Sample data
insert into companies (name) values ('النقل الإسلامي');
insert into drivers (name) values ('أحمد محمد'), ('علي حسن'), ('محمد داود');
