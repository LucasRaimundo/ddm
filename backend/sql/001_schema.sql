-- Schema completo do Delícias de Marias (Supabase / Postgres)
-- Rodar no SQL Editor do Supabase. Pode rodar de novo sem quebrar (if not exists).

create extension if not exists pgcrypto;

-- ───────────── Encomendas ─────────────
create table if not exists encomendas (
  id             uuid primary key default gen_random_uuid(),
  nome_cliente   text not null,
  tipo_encomenda text not null,
  valor          numeric(10,2) not null check (valor > 0),
  data_pedido    date not null,
  data_entrega   date not null,
  observacoes    text,
  status         text not null default 'pendente'
                 check (status in ('pendente','confirmado','em_producao','entregue','cancelado')),
  created_at     timestamptz not null default now(),
  check (data_entrega >= data_pedido)
);

-- ───────────── Vendas unitárias ─────────────
create table if not exists vendas_unitarias (
  id           uuid primary key default gen_random_uuid(),
  nome_cliente text not null,
  tipo_produto text not null,
  quantidade   integer not null check (quantidade > 0),
  valor_unit   numeric(10,2) not null check (valor_unit > 0),
  valor_total  numeric(10,2) not null,
  data_venda   date not null,
  observacoes  text,
  created_at   timestamptz not null default now()
);

-- ───────────── Precificação ─────────────
create table if not exists insumos (
  id                   uuid primary key default gen_random_uuid(),
  nome                 text not null,
  categoria            text not null default 'ingrediente'
                       check (categoria in ('ingrediente','embalagem')),
  unidade              text not null check (unidade in ('g','ml','un')),
  preco_embalagem      numeric(10,2) not null check (preco_embalagem > 0),
  quantidade_embalagem numeric(10,3) not null check (quantidade_embalagem > 0),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists receitas (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null,
  rendimento          integer not null check (rendimento > 0),
  tempo_preparo_min   integer not null default 0 check (tempo_preparo_min >= 0),
  perda_percentual    numeric(5,2) not null default 5 check (perda_percentual >= 0 and perda_percentual < 100),
  preco_venda_unidade numeric(10,2),
  preco_venda_cento   numeric(10,2),
  observacoes         text,
  created_at          timestamptz not null default now()
);

create table if not exists receita_itens (
  id         uuid primary key default gen_random_uuid(),
  receita_id uuid not null references receitas(id) on delete cascade,
  insumo_id  uuid not null references insumos(id) on delete restrict,
  quantidade numeric(10,3) not null check (quantidade > 0),
  unique (receita_id, insumo_id)
);
create index if not exists receita_itens_receita_idx on receita_itens(receita_id);
create index if not exists receita_itens_insumo_idx  on receita_itens(insumo_id);

-- Tabela de uma linha só (id = 1)
create table if not exists config_precificacao (
  id                        integer primary key default 1 check (id = 1),
  salario_desejado          numeric(10,2) not null default 2000,
  horas_mes                 numeric(6,1)  not null default 120 check (horas_mes > 0),
  custos_fixos_mes          numeric(10,2) not null default 300,
  producao_mes              integer       not null default 2000 check (producao_mes > 0),
  lucro_percentual          numeric(5,2)  not null default 15,
  taxas_percentual          numeric(5,2)  not null default 5,
  desconto_cento_percentual numeric(5,2)  not null default 10
);

-- Mantém updated_at dos insumos em dia
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists insumos_updated_at on insumos;
create trigger insumos_updated_at before update on insumos
  for each row execute function set_updated_at();
