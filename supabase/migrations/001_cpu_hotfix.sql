-- Hotfix não destrutivo para projetos OrbiCore já em produção.
-- Mantém todas as linhas de app_data e altera somente a função de gravação.
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

  -- -1 sinaliza concorrência ao cliente sem exception/rollback no PostgreSQL.
  return coalesce(next_revision, -1);
end;
$$;

-- Índice redundante: a constraint UNIQUE de user_id já cria um índice
-- (app_data_user_id_key). O idx_app_data_user_id é duplicado e só adiciona
-- custo em cada escrita. Remover é seguro e não afeta as buscas.
drop index if exists public.idx_app_data_user_id;
