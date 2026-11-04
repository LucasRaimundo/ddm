-- Compras de insumos. Rodar depois do 001_schema.sql (pode rodar de novo sem quebrar).
-- ───────────── Compras de insumos ─────────────
create table if not exists compras (
  id          uuid primary key default gen_random_uuid(),
  data_compra date not null,
  local       text,
  observacoes text,
  valor_total numeric(10,2) not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists compras_data_idx on compras(data_compra);

create table if not exists compra_itens (
  id                uuid primary key default gen_random_uuid(),
  compra_id         uuid not null references compras(id) on delete cascade,
  insumo_id         uuid not null references insumos(id) on delete restrict,
  quantidade        numeric(10,3) not null check (quantidade > 0),        -- nº de embalagens
  tamanho_embalagem numeric(10,3) not null check (tamanho_embalagem > 0), -- g/ml/un por embalagem
  valor_total       numeric(10,2) not null check (valor_total > 0),
  unique (compra_id, insumo_id)
);
create index if not exists compra_itens_compra_idx on compra_itens(compra_id);
create index if not exists compra_itens_insumo_idx on compra_itens(insumo_id);
