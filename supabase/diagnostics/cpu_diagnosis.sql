-- OrbiCore: diagnóstico de CPU do Supabase (somente leitura)
-- Não altera, remove ou bloqueia dados.
-- Execute cada bloco separadamente no SQL Editor e exporte/copiei o resultado.

-- 1. Resumo do período coberto pelas estatísticas.
select
  now() as collected_at,
  stats_reset,
  now() - stats_reset as statistics_window
from pg_stat_statements_info;

-- 2. Top 30 consultas por tempo total acumulado.
-- "calls" alto aponta tempestade; "mean_exec_time" alto aponta consulta cara.
select
  queryid,
  calls,
  round(total_exec_time::numeric, 2) as total_exec_ms,
  round(mean_exec_time::numeric, 2) as mean_exec_ms,
  round(max_exec_time::numeric, 2) as max_exec_ms,
  rows,
  shared_blks_hit,
  shared_blks_read,
  shared_blks_dirtied,
  shared_blks_written,
  temp_blks_read,
  temp_blks_written,
  left(regexp_replace(query, '\s+', ' ', 'g'), 500) as query
from pg_stat_statements
order by total_exec_time desc
limit 30;

-- 3. Consultas relacionadas ao OrbiCore/Auth, ordenadas por chamadas.
select
  queryid,
  calls,
  round(total_exec_time::numeric, 2) as total_exec_ms,
  round(mean_exec_time::numeric, 2) as mean_exec_ms,
  round(max_exec_time::numeric, 2) as max_exec_ms,
  rows,
  left(regexp_replace(query, '\s+', ' ', 'g'), 700) as query
from pg_stat_statements
where
  query ilike '%app_data%'
  or query ilike '%save_app_data%'
  or query ilike '%keep_alive%'
  or query ilike '%auth.users%'
  or query ilike '%auth.uid%'
  or query ilike '%gotrue%'
order by calls desc, total_exec_time desc;

-- 4. Atividade e esperas neste instante.
select
  pid,
  usename,
  application_name,
  state,
  wait_event_type,
  wait_event,
  now() - query_start as running_for,
  now() - xact_start as transaction_age,
  left(regexp_replace(query, '\s+', ' ', 'g'), 500) as query
from pg_stat_activity
where
  datname = current_database()
  and pid <> pg_backend_pid()
order by query_start nulls last;

-- 5. Locks não concedidos (resultado vazio é o esperado).
select
  a.pid,
  a.usename,
  a.application_name,
  a.state,
  l.locktype,
  l.mode,
  l.granted,
  now() - a.query_start as waiting_for,
  left(regexp_replace(a.query, '\s+', ' ', 'g'), 500) as query
from pg_locks l
join pg_stat_activity a on a.pid = l.pid
where not l.granted
order by a.query_start;

-- 6. Saúde, leituras e escritas das tabelas públicas.
select
  relname,
  n_live_tup,
  n_dead_tup,
  seq_scan,
  seq_tup_read,
  idx_scan,
  n_tup_ins,
  n_tup_upd,
  n_tup_hot_upd,
  n_tup_del,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
from pg_stat_user_tables
order by n_tup_upd desc, seq_tup_read desc;

-- 7. Tamanho das tabelas e índices.
select
  c.relname as table_name,
  pg_size_pretty(pg_relation_size(c.oid)) as table_size,
  pg_size_pretty(pg_indexes_size(c.oid)) as indexes_size,
  pg_size_pretty(pg_total_relation_size(c.oid)) as total_size
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by pg_total_relation_size(c.oid) desc;

-- 8. Volume real por usuário, sem expor UUID completo nem conteúdo comercial.
select
  left(user_id::text, 8) as user_prefix,
  revision,
  pg_column_size(data) as json_bytes,
  jsonb_array_length(coalesce(data -> 'contracts', '[]'::jsonb)) as contracts,
  jsonb_array_length(coalesce(data -> 'meetings', '[]'::jsonb)) as meetings,
  jsonb_array_length(coalesce(data -> 'products', '[]'::jsonb)) as products,
  jsonb_array_length(coalesce(data -> 'sales', '[]'::jsonb)) as sales,
  jsonb_array_length(coalesce(data -> 'stockMovements', '[]'::jsonb)) as stock_movements,
  updated_at,
  created_at
from public.app_data
order by json_bytes desc;

-- 9. Índices existentes em app_data (confirma índice duplicado).
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'app_data'
order by indexname;

-- 10. Políticas RLS atuais.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- 11. Frequência observável do keep-alive.
select id, pinged_at, now() - pinged_at as time_since_last_ping
from public.keep_alive;

-- 12. Estatísticas da função, quando track_functions estiver habilitado.
select
  schemaname,
  funcname,
  calls,
  round(total_time::numeric, 2) as total_ms,
  round(self_time::numeric, 2) as self_ms
from pg_stat_user_functions
order by total_time desc;
