-- =====================================================
-- Quadro de Vagas: schema para Supabase
-- Cole tudo no SQL Editor do Supabase e clique em Run.
-- =====================================================

-- Tabela de administradores (quem pode publicar vagas)
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Tabela de vagas
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  company text not null check (char_length(company) between 2 and 120),
  location text check (char_length(location) <= 120),
  modality text not null default 'presencial'
    check (modality in ('presencial', 'hibrido', 'remoto')),
  job_type text not null default 'clt'
    check (job_type in ('clt', 'pj', 'estagio', 'temporario', 'freelancer')),
  category text check (char_length(category) <= 60),
  salary text check (char_length(salary) <= 80),
  description text check (char_length(description) <= 10000),
  apply_url text not null check (apply_url ~* '^(https?://|mailto:)'),
  status text not null default 'published'
    check (status in ('draft', 'published', 'closed')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_status_created_idx
  on public.jobs (status, created_at desc);

-- Atualiza updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- Função que verifica se o usuário logado é admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- =====================================================
-- Segurança (Row Level Security)
-- =====================================================
alter table public.jobs enable row level security;
alter table public.admins enable row level security;

-- Qualquer pessoa vê apenas vagas publicadas e não expiradas
drop policy if exists "Public can read published jobs" on public.jobs;
create policy "Public can read published jobs"
  on public.jobs for select
  to anon, authenticated
  using (
    status = 'published'
    and (expires_at is null or expires_at > now())
  );

-- Admins veem todas as vagas (inclusive rascunhos e encerradas)
drop policy if exists "Admins can read all jobs" on public.jobs;
create policy "Admins can read all jobs"
  on public.jobs for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can insert jobs" on public.jobs;
create policy "Admins can insert jobs"
  on public.jobs for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update jobs" on public.jobs;
create policy "Admins can update jobs"
  on public.jobs for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete jobs" on public.jobs;
create policy "Admins can delete jobs"
  on public.jobs for delete
  to authenticated
  using (public.is_admin());

-- Cada usuário só consegue ver a própria linha em admins
drop policy if exists "Users can read own admin row" on public.admins;
create policy "Users can read own admin row"
  on public.admins for select
  to authenticated
  using (user_id = auth.uid());

-- =====================================================
-- Depois de criar seu usuário em Authentication > Users,
-- rode o comando abaixo trocando pelo seu e-mail:
--
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'seu@email.com';
-- =====================================================

-- (Opcional) vagas de exemplo para testar
insert into public.jobs (title, company, location, modality, job_type, category, salary, description, apply_url)
values
  ('Desenvolvedor(a) Front-end', 'Studio Aurora', 'São Paulo, SP', 'hibrido', 'clt', 'Tecnologia', 'R$ 7.000 a R$ 9.000',
   E'Atuação em produtos web com React e TypeScript.\n\nRequisitos: 2+ anos de experiência, boa base em HTML, CSS e JavaScript.', 'https://exemplo.com/candidatura/frontend'),
  ('Analista de Atendimento', 'Casa Verde', 'Remoto', 'remoto', 'clt', 'Atendimento', 'R$ 2.800',
   E'Atendimento a clientes por chat e e-mail.\n\nRequisitos: boa escrita e organização.', 'mailto:rh@exemplo.com');
