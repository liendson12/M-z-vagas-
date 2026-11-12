-- =====================================================
-- Migração para Moçambique
-- Cole no SQL Editor do Supabase e clique em Run.
-- =====================================================

-- 1) Remove as vagas de exemplo do Brasil
delete from public.jobs
where apply_url like 'https://exemplo.com/%'
   or apply_url = 'mailto:rh@exemplo.com';

-- 2) Troca os tipos de contrato para os usados em Moçambique
alter table public.jobs drop constraint if exists jobs_job_type_check;

update public.jobs
set job_type = case job_type
  when 'clt' then 'efectivo'
  when 'pj' then 'freelancer'
  when 'temporario' then 'termo'
  else job_type
end;

alter table public.jobs
  add constraint jobs_job_type_check
  check (job_type in ('efectivo', 'termo', 'parcial', 'estagio', 'freelancer'));

alter table public.jobs alter column job_type set default 'efectivo';
