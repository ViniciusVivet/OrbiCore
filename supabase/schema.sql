-- =============================================
-- OrbiCore - Schema Supabase
-- Execute esse SQL no SQL Editor do Supabase
-- =============================================

-- Tabela principal: dados do app (1 row por usuario)
create table if not exists public.app_data (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

-- Index para busca rapida por user_id
create index if not exists idx_app_data_user_id on public.app_data(user_id);

-- RLS: cada usuario so ve/edita seus proprios dados
alter table public.app_data enable row level security;

create policy "Users can view own data"
  on public.app_data for select
  using (auth.uid() = user_id);

create policy "Users can insert own data"
  on public.app_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update own data"
  on public.app_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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

create trigger on_app_data_updated
  before update on public.app_data
  for each row execute function public.handle_updated_at();

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

create policy "Allow anon read keep_alive"
  on public.keep_alive for select
  using (true);

create policy "Allow anon update keep_alive"
  on public.keep_alive for update
  using (true);
