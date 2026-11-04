-- Canais de venda (venda direta, iFood...) com taxa própria.
-- Rodar depois do 002_compras.sql. Pode rodar de novo sem quebrar.

create table if not exists canais_venda (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  taxa_percentual numeric(5,2) not null check (taxa_percentual >= 0 and taxa_percentual < 60),
  custo_extra_un  numeric(10,2) not null default 0 check (custo_extra_un >= 0),
  ordem           integer not null default 0
);

-- Canais iniciais (só se a tabela estiver vazia)
insert into canais_venda (nome, taxa_percentual, ordem)
select * from (values ('Venda direta', 5.0, 1), ('iFood Entrega', 26.5, 2)) v(nome, taxa, ordem)
where not exists (select 1 from canais_venda);

-- Preço praticado hoje passa a ser por canal: {"<canal_id>": {"unidade": 3.0, "cento": 150}}
alter table receitas add column if not exists precos_atuais jsonb not null default '{}'::jsonb;

-- Migra os preços antigos para o canal "Venda direta"
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name = 'receitas' and column_name = 'preco_venda_unidade') then
    update receitas r
       set precos_atuais = jsonb_build_object(
             (select id::text from canais_venda where nome = 'Venda direta' limit 1),
             jsonb_strip_nulls(jsonb_build_object('unidade', r.preco_venda_unidade, 'cento', r.preco_venda_cento)))
     where (r.preco_venda_unidade is not null or r.preco_venda_cento is not null)
       and r.precos_atuais = '{}'::jsonb;
    alter table receitas drop column preco_venda_unidade;
    alter table receitas drop column preco_venda_cento;
  end if;
end $$;

-- A taxa agora mora em cada canal
alter table config_precificacao drop column if exists taxas_percentual;
