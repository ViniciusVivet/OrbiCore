-- =============================================
-- OrbiCore - Schema Supabase
-- Execute esse SQL no SQL Editor do Supabase
-- =============================================

-- Tabela principal: dados do app (1 row por usuario)
create table if not exists public.app_data (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  data jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

alter table public.app_data
  add column if not exists revision bigint not null default 0;

-- Index para busca rapida por user_id
create index if not exists idx_app_data_user_id on public.app_data(user_id);

-- RLS: cada usuario so ve/edita seus proprios dados
alter table public.app_data enable row level security;

drop policy if exists "Users can view own data" on public.app_data;
create policy "Users can view own data"
  on public.app_data for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own data" on public.app_data;
create policy "Users can insert own data"
  on public.app_data for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own data" on public.app_data;
create policy "Users can update own data"
  on public.app_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own data" on public.app_data;
create policy "Users can delete own data"
  on public.app_data for delete
  using (auth.uid() = user_id);

-- Funcao para atualizar updated_at automaticamente
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_app_data_updated on public.app_data;
create trigger on_app_data_updated
  before update on public.app_data
  for each row execute function public.handle_updated_at();

create or replace function public.save_app_data(
  new_data jsonb,
  expected_revision bigint
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_revision bigint;
begin
  update public.app_data
  set data = new_data, revision = revision + 1
  where user_id = auth.uid() and revision = expected_revision
  returning revision into next_revision;

  if next_revision is null then
    raise exception 'APP_DATA_CONFLICT' using errcode = '40001';
  end if;

  return next_revision;
end;
$$;

-- Tabela de keep-alive pra cron (evitar cold start)
create table if not exists public.keep_alive (
  id int primary key default 1,
  pinged_at timestamptz default now()
);

insert into public.keep_alive (id, pinged_at)
values (1, now())
on conflict (id) do nothing;

-- Permitir que o cron acesse (via service role, sem RLS)
alter table public.keep_alive enable row level security;

drop policy if exists "Allow anon read keep_alive" on public.keep_alive;
drop policy if exists "Allow anon update keep_alive" on public.keep_alive;

-- Imagem do perfil: bucket público para exibição de foto ou logo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images',
  'profile-images',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own profile images" on storage.objects;
create policy "Users upload own profile images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own profile images" on storage.objects;
create policy "Users update own profile images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own profile images" on storage.objects;
create policy "Users delete own profile images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Fotos dos produtos: até 3 referências por produto, sempre otimizadas no cliente.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  6291456,
  array['image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own product images" on storage.objects;
create policy "Users upload own product images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own product images" on storage.objects;
create policy "Users update own product images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own product images" on storage.objects;
create policy "Users delete own product images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Papel de parede do dashboard: imagens otimizadas no cliente (webp), até 8 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'background-images',
  'background-images',
  true,
  8388608,
  array['image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own background images" on storage.objects;
create policy "Users upload own background images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'background-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own background images" on storage.objects;
create policy "Users update own background images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'background-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own background images" on storage.objects;
create policy "Users delete own background images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'background-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
