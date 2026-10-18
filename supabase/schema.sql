-- =====================================================================
-- FinanzasApp — Esquema completo de base de datos (Fase 1)
--
-- Cómo usarlo: Supabase > SQL Editor > "New query" > pegar TODO > "Run".
-- Es re-ejecutable: si lo corres dos veces no borra ni duplica datos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Esquema privado (funciones internas que NO se exponen por la API)
-- ---------------------------------------------------------------------
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- Token único por usuario para su dirección de reenvío de correos
-- (ej. tuapp+a1b2c3d4e5f6@gmail.com).
create or replace function private.generate_inbound_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
$$;

create or replace function private.is_valid_timezone(tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = tz);
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. Perfiles (1 fila por usuario de Supabase Auth)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text check (char_length(full_name) <= 120),

  -- WhatsApp: número en formato internacional SIN "+" (así lo envía Meta), ej. 573001234567
  whatsapp_phone text unique check (whatsapp_phone ~ '^[1-9][0-9]{7,14}$'),
  whatsapp_linked_at timestamptz,
  whatsapp_link_code text unique check (whatsapp_link_code ~ '^[0-9]{6}$'),
  whatsapp_link_code_expires_at timestamptz,
  whatsapp_last_inbound_at timestamptz, -- para saber si la ventana gratuita de 24h está abierta

  -- Correo: el usuario reenvía los correos del banco a <buzon>+<inbound_token>@gmail.com
  inbound_token text not null unique default private.generate_inbound_token(),

  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'America/Lima' check (private.is_valid_timezone(timezone)),

  -- Paywall
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  stripe_customer_id text unique,

  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Valores por defecto (Perú). Se repiten aquí para actualizar bases creadas con una versión anterior.
alter table public.profiles alter column currency set default 'USD';
alter table public.profiles alter column timezone set default 'America/Lima';

-- Fase 2: estado de la conexión de correo
alter table public.profiles add column if not exists last_email_received_at timestamptz;
-- Código que Gmail envía para confirmar el reenvío automático (se muestra al usuario)
alter table public.profiles add column if not exists gmail_forwarding_code text;
alter table public.profiles add column if not exists gmail_forwarding_code_at timestamptz;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. Categorías (cada usuario tiene las suyas; se crean por defecto al registrarse)
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  emoji text check (char_length(emoji) <= 8),
  color text not null default '#64748b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  kind text not null default 'expense' check (kind in ('expense', 'income')),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, user_id) -- permite FKs compuestas que garantizan que la categoría es del mismo usuario
);

create unique index if not exists categories_user_name_key
  on public.categories (user_id, lower(name));

-- ---------------------------------------------------------------------
-- 3. Transacciones
-- ---------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid,
  type text not null default 'expense' check (type in ('expense', 'income')),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  merchant text check (char_length(merchant) <= 200),
  description text check (char_length(description) <= 500),
  occurred_at timestamptz not null default now(),

  -- pending: esperando que el usuario responda por WhatsApp
  -- categorized: ya tiene categoría
  -- ignored: el usuario indicó que no la cuente (ej. transferencia entre cuentas propias)
  status text not null default 'pending' check (status in ('pending', 'categorized', 'ignored')),
  source text not null default 'manual' check (source in ('email', 'whatsapp', 'manual')),

  bank_name text check (char_length(bank_name) <= 80),
  card_last4 text check (card_last4 ~ '^[0-9]{4}$'),
  email_message_id text,
  categorized_by text check (categorized_by in ('ai', 'user')),
  ai_confidence numeric(3, 2) check (ai_confidence between 0 and 1),
  user_note text check (char_length(user_note) <= 500),
  notified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint transactions_category_fk
    foreign key (category_id, user_id)
    references public.categories (id, user_id)
    on delete set null (category_id),
  constraint transactions_email_unique unique (user_id, email_message_id)
);

create index if not exists transactions_user_occurred_idx
  on public.transactions (user_id, occurred_at desc);
create index if not exists transactions_user_status_idx
  on public.transactions (user_id, status, created_at desc);
create index if not exists transactions_category_idx
  on public.transactions (category_id);

-- Si no se envía moneda, usa la del perfil del usuario.
create or replace function private.transactions_default_currency()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.currency is null then
    select p.currency into new.currency from public.profiles p where p.id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_default_currency on public.transactions;
create trigger transactions_default_currency
  before insert on public.transactions
  for each row execute function private.transactions_default_currency();

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- 4. Presupuestos mensuales (category_id NULL = presupuesto total del mes)
-- ---------------------------------------------------------------------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid,
  amount numeric(14, 2) not null check (amount > 0),
  alert_threshold numeric(3, 2) not null default 0.80 check (alert_threshold between 0.10 and 1.00),
  last_alert_month date, -- evita enviar la misma alerta de WhatsApp dos veces en un mes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint budgets_category_fk
    foreign key (category_id, user_id)
    references public.categories (id, user_id)
    on delete cascade,
  constraint budgets_user_category_unique unique nulls not distinct (user_id, category_id)
);

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. Suscripciones de Stripe (las escribe SOLO el webhook de Stripe)
-- ---------------------------------------------------------------------
create table if not exists public.subscriptions (
  id text primary key, -- id de Stripe: sub_...
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in (
    'trialing', 'active', 'past_due', 'canceled',
    'incomplete', 'incomplete_expired', 'unpaid', 'paused'
  )),
  price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_idx on public.subscriptions (user_id);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function private.set_updated_at();

-- Idempotencia del webhook: Stripe puede reenviar el mismo evento varias veces.
create table if not exists public.stripe_events (
  id text primary key, -- evt_...
  type text not null,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. Registro de correos procesados (evita procesar el mismo correo dos veces)
-- ---------------------------------------------------------------------
create table if not exists public.inbound_emails (
  id uuid primary key default gen_random_uuid(),
  message_id text not null unique,
  user_id uuid references public.profiles (id) on delete set null,
  from_address text,
  subject text,
  received_at timestamptz,
  status text not null check (status in ('processing', 'parsed', 'ignored', 'unmatched_user', 'error')),
  transaction_id uuid references public.transactions (id) on delete set null,
  error text,
  created_at timestamptz not null default now()
);

-- 'processing' marca un correo "reservado" por una ejecución, para que dos ejecuciones
-- simultáneas no lo procesen dos veces.
alter table public.inbound_emails drop constraint if exists inbound_emails_status_check;
alter table public.inbound_emails add constraint inbound_emails_status_check
  check (status in ('processing', 'parsed', 'ignored', 'unmatched_user', 'error'));

create index if not exists inbound_emails_user_idx on public.inbound_emails (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 7. Registro de mensajes de WhatsApp (entrantes y salientes)
-- ---------------------------------------------------------------------
create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  transaction_id uuid references public.transactions (id) on delete set null,
  wa_message_id text unique,
  direction text not null check (direction in ('inbound', 'outbound')),
  phone text not null,
  message_type text not null, -- text, audio, interactive, template, ...
  body text,
  status text, -- received, sent, delivered, read, failed
  error text,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_user_idx on public.whatsapp_messages (user_id, created_at desc);
create index if not exists whatsapp_messages_transaction_idx on public.whatsapp_messages (transaction_id);

-- ---------------------------------------------------------------------
-- 8. Paywall: ¿el usuario tiene acceso? (prueba vigente o suscripción activa)
-- ---------------------------------------------------------------------
create or replace function private.has_access(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.profiles p
      where p.id = p_user_id and p.trial_ends_at > now()
    )
    or exists (
      select 1 from public.subscriptions s
      where s.user_id = p_user_id
        and s.status in ('active', 'trialing', 'past_due') -- past_due: Stripe sigue reintentando el cobro
    );
$$;

-- Lo que consulta el frontend para decidir si muestra el dashboard o el paywall.
create or replace function public.get_my_access()
returns table (
  has_access boolean,
  trial_active boolean,
  trial_ends_at timestamptz,
  subscription_status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_access(p.id),
    p.trial_ends_at > now(),
    p.trial_ends_at,
    s.status,
    s.current_period_end,
    coalesce(s.cancel_at_period_end, false)
  from public.profiles p
  left join lateral (
    select sub.status, sub.current_period_end, sub.cancel_at_period_end
    from public.subscriptions sub
    where sub.user_id = p.id
    order by (sub.status in ('active', 'trialing', 'past_due')) desc, sub.created_at desc
    limit 1
  ) s on true
  where p.id = (select auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 9. Alta automática: al registrarse se crea el perfil y las categorías por defecto
-- ---------------------------------------------------------------------
create or replace function private.seed_default_categories(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.categories (user_id, name, emoji, color, kind)
  values
    (p_user_id, 'Supermercado',      '🛒', '#16a34a', 'expense'),
    (p_user_id, 'Restaurantes',      '🍽️', '#ea580c', 'expense'),
    (p_user_id, 'Transporte',        '🚗', '#2563eb', 'expense'),
    (p_user_id, 'Vivienda',          '🏠', '#7c3aed', 'expense'),
    (p_user_id, 'Servicios',         '💡', '#ca8a04', 'expense'),
    (p_user_id, 'Salud',             '💊', '#dc2626', 'expense'),
    (p_user_id, 'Educación',         '📚', '#0891b2', 'expense'),
    (p_user_id, 'Entretenimiento',   '🎬', '#db2777', 'expense'),
    (p_user_id, 'Compras',           '🛍️', '#9333ea', 'expense'),
    (p_user_id, 'Suscripciones',     '📱', '#4f46e5', 'expense'),
    (p_user_id, 'Viajes',            '✈️', '#0d9488', 'expense'),
    (p_user_id, 'Mascotas',          '🐾', '#a16207', 'expense'),
    (p_user_id, 'Regalos',           '🎁', '#e11d48', 'expense'),
    (p_user_id, 'Otros gastos',      '📦', '#64748b', 'expense'),
    (p_user_id, 'Salario',           '💼', '#15803d', 'income'),
    (p_user_id, 'Transferencias',    '💸', '#0369a1', 'income'),
    (p_user_id, 'Otros ingresos',    '💰', '#65a30d', 'income')
  on conflict do nothing;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), '')
  )
  on conflict (id) do nothing;

  perform private.seed_default_categories(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Mantiene el email del perfil sincronizado si el usuario lo cambia.
create or replace function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.handle_user_email_change();

-- Usuarios que ya existían antes de correr este script.
insert into public.profiles (id, email, full_name)
select
  u.id,
  coalesce(u.email, ''),
  nullif(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'), '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

select private.seed_default_categories(p.id)
from public.profiles p
where not exists (select 1 from public.categories c where c.user_id = p.id);

-- ---------------------------------------------------------------------
-- 10. Vista de progreso de presupuestos del mes actual (en la zona horaria del usuario)
--     Los presupuestos están en la moneda principal del perfil; solo suman gastos en esa moneda.
-- ---------------------------------------------------------------------
drop view if exists public.budget_progress;
create view public.budget_progress
with (security_invoker = true)
as
select
  b.id as budget_id,
  b.user_id,
  b.category_id,
  c.name as category_name,
  c.emoji as category_emoji,
  c.color as category_color,
  b.amount as budget_amount,
  p.currency,
  b.alert_threshold,
  b.last_alert_month,
  coalesce(sum(t.amount), 0)::numeric(14, 2) as spent,
  (b.amount - coalesce(sum(t.amount), 0))::numeric(14, 2) as remaining,
  round(coalesce(sum(t.amount), 0) / b.amount, 4) as ratio
from public.budgets b
join public.profiles p on p.id = b.user_id
left join public.categories c on c.id = b.category_id
left join public.transactions t
  on t.user_id = b.user_id
  and t.type = 'expense'
  and t.status <> 'ignored'
  and t.currency = p.currency
  and (b.category_id is null or t.category_id = b.category_id)
  and t.occurred_at >= (date_trunc('month', now() at time zone p.timezone) at time zone p.timezone)
  and t.occurred_at < ((date_trunc('month', now() at time zone p.timezone) + interval '1 month') at time zone p.timezone)
group by b.id, b.user_id, b.category_id, c.name, c.emoji, c.color, b.amount, p.currency, b.alert_threshold, b.last_alert_month;

-- ---------------------------------------------------------------------
-- 11. Seguridad: Row Level Security + permisos por columna
-- ---------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.transactions      enable row level security;
alter table public.budgets           enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.stripe_events     enable row level security;
alter table public.inbound_emails    enable row level security;
alter table public.whatsapp_messages enable row level security;

-- Visitantes sin sesión no ven nada.
revoke all on all tables in schema public from anon;

-- Tablas internas: solo el servidor (service_role) puede tocarlas.
revoke all on public.stripe_events, public.inbound_emails, public.whatsapp_messages from authenticated;

-- Perfil: el usuario lo lee, pero solo puede editar estos campos.
-- (WhatsApp, prueba gratuita y Stripe los cambia únicamente el servidor.)
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, currency, timezone, onboarding_completed) on public.profiles to authenticated;

-- Suscripciones: solo lectura para el usuario.
revoke all on public.subscriptions from authenticated;
grant select on public.subscriptions to authenticated;

-- Categorías y presupuestos: CRUD completo (filtrado por RLS).
grant select, insert, update, delete on public.categories, public.budgets to authenticated;

-- Transacciones: el usuario no puede modificar campos de origen (correo, IA, notificación).
revoke all on public.transactions from authenticated;
grant select, insert, delete on public.transactions to authenticated;
grant update (category_id, type, amount, merchant, description, occurred_at, status, user_note, categorized_by)
  on public.transactions to authenticated;

grant select on public.budget_progress to authenticated;

-- Funciones: nadie las ejecuta salvo quien debe.
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to service_role;
grant execute on function private.has_access(uuid) to authenticated;
grant execute on function private.is_valid_timezone(text) to authenticated;
revoke execute on function public.get_my_access() from public, anon;
grant execute on function public.get_my_access() to authenticated;

-- --- Políticas: profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- --- Políticas: categories
drop policy if exists "categories_select_own" on public.categories;
create policy "categories_select_own" on public.categories
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own" on public.categories
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "categories_update_own" on public.categories;
create policy "categories_update_own" on public.categories
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_delete_own" on public.categories
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- --- Políticas: transactions (bloqueadas si no hay acceso = paywall a nivel de base de datos)
drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions
  for select to authenticated
  using (user_id = (select auth.uid()) and (select private.has_access((select auth.uid()))));

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own" on public.transactions
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.has_access((select auth.uid()))));

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own" on public.transactions
  for update to authenticated
  using (user_id = (select auth.uid()) and (select private.has_access((select auth.uid()))))
  with check (user_id = (select auth.uid()));

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own" on public.transactions
  for delete to authenticated
  using (user_id = (select auth.uid()) and (select private.has_access((select auth.uid()))));

-- --- Políticas: budgets
drop policy if exists "budgets_select_own" on public.budgets;
create policy "budgets_select_own" on public.budgets
  for select to authenticated
  using (user_id = (select auth.uid()) and (select private.has_access((select auth.uid()))));

drop policy if exists "budgets_insert_own" on public.budgets;
create policy "budgets_insert_own" on public.budgets
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.has_access((select auth.uid()))));

drop policy if exists "budgets_update_own" on public.budgets;
create policy "budgets_update_own" on public.budgets
  for update to authenticated
  using (user_id = (select auth.uid()) and (select private.has_access((select auth.uid()))))
  with check (user_id = (select auth.uid()));

drop policy if exists "budgets_delete_own" on public.budgets;
create policy "budgets_delete_own" on public.budgets
  for delete to authenticated
  using (user_id = (select auth.uid()) and (select private.has_access((select auth.uid()))));

-- --- Políticas: subscriptions
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 12. Realtime: el dashboard se actualiza solo cuando entra una transacción
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transactions'
     ) then
    alter publication supabase_realtime add table public.transactions;
  end if;
end;
$$;

-- =====================================================================
-- Fin. Deberías ver "Success. No rows returned".
-- =====================================================================
