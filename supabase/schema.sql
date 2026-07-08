-- Tabla única del onboarding (sección 7 del CLAUDE.md).
-- Córrelo en el SQL Editor de tu proyecto Supabase.
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  nombre text,
  correo text,
  telefono text,
  current_step int default 0,
  answers jsonb default '{}',                 -- voz + texto fusionados
  doc_url text,
  estado text default 'en_proceso',            -- en_proceso | voz_completa | doc_generado | agendado | incompleto
  reunion_at timestamptz,
  retell_call_id text,                         -- vincula el webhook a la sesión
  tareas jsonb default '{"twilio": false, "academia": false}',
  created_at timestamptz default now()
);

create index if not exists sessions_retell_call_id_idx on sessions (retell_call_id);
