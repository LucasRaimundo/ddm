"""Cálculo de preço — funções puras, sem banco, para poder testar fácil.

Método:
  custo base/un = insumos/un + mão de obra/un + custos fixos/un
  para cada canal de venda:
    custo/un = custo base + custo extra do canal (ex.: embalagem de delivery)
    preço    = custo/un ÷ (1 − (lucro% + taxa do canal%))     ← "markup divisor"
    cento    = preço/un × 100 × (1 − desconto do cento%)
"""
from app.models.precificacao import (
    AnalisePrecoAtual, ConfigPrecificacaoBase, ItemCusto, PrecoCanal, ResultadoPreco, StatusPreco,
)

TOLERANCIA_ABAIXO = 0.97   # até 3% abaixo do sugerido ainda conta como ok
DIVISOR_MINIMO    = 0.10   # lucro + taxa não pode passar de 90%

# usado só se nenhum canal estiver cadastrado
CANAL_PADRAO = {"id": "padrao", "nome": "Venda direta", "taxa_percentual": 0, "custo_extra_un": 0}


def _r(v: float) -> float:
    return round(v, 2)


def custo_por_medida(insumo: dict) -> float:
    return insumo["preco_embalagem"] / insumo["quantidade_embalagem"]


def analisar_preco(
    preco_atual: float | None,
    preco_sugerido: float,
    custo_un: float,
    taxas_pct: float,
    unidades: int = 1,
) -> AnalisePrecoAtual:
    """Compara o preço praticado com o custo. `unidades` = 100 para o cento."""
    if preco_atual is None:
        return AnalisePrecoAtual(
            preco_atual=None, preco_sugerido=_r(preco_sugerido),
            lucro_real=None, margem_real_pct=None, status=StatusPreco.sem_preco,
        )

    recebido = preco_atual * (1 - taxas_pct / 100)       # o que sobra depois das taxas
    lucro    = recebido - custo_un * unidades
    margem   = lucro / preco_atual * 100

    if lucro < 0:
        status = StatusPreco.prejuizo
    elif preco_atual < preco_sugerido * TOLERANCIA_ABAIXO:
        status = StatusPreco.abaixo
    else:
        status = StatusPreco.ok

    return AnalisePrecoAtual(
        preco_atual=_r(preco_atual), preco_sugerido=_r(preco_sugerido),
        lucro_real=_r(lucro), margem_real_pct=round(margem, 1), status=status,
    )


def preco_no_canal(custo_base_un: float, canal: dict, config: ConfigPrecificacaoBase,
                   precos_atuais: dict) -> PrecoCanal:
    custo_un = custo_base_un + (canal.get("custo_extra_un") or 0)
    taxa     = canal["taxa_percentual"]
    divisor  = max(1 - (config.lucro_percentual + taxa) / 100, DIVISOR_MINIMO)
    preco_un = custo_un / divisor
    preco_cento = preco_un * 100 * (1 - config.desconto_cento_percentual / 100)

    atual = precos_atuais.get(canal["id"]) or {}
    return PrecoCanal(
        canal_id=canal["id"], nome=canal["nome"], taxa_percentual=taxa,
        custo_extra_un=_r(canal.get("custo_extra_un") or 0), custo_un=_r(custo_un),
        taxas_un=_r(preco_un * taxa / 100), lucro_un=_r(preco_un * config.lucro_percentual / 100),
        preco_sugerido_un=_r(preco_un), preco_sugerido_cento=_r(preco_cento),
        analise_unidade=analisar_preco(atual.get("unidade"), preco_un, custo_un, taxa),
        analise_cento=analisar_preco(atual.get("cento"), preco_cento, custo_un, taxa, unidades=100),
    )


def calcular(receita: dict, itens: list[dict], insumos: dict[str, dict],
             config: ConfigPrecificacaoBase, canais: list[dict] | None = None) -> ResultadoPreco:
    alertas: list[str] = []
    canais = canais or [CANAL_PADRAO]

    # 1. Insumos
    itens_custo: list[ItemCusto] = []
    custo_receita = 0.0
    for item in itens:
        insumo = insumos.get(item["insumo_id"])
        if insumo is None:
            alertas.append("A receita usa um insumo que foi apagado.")
            continue
        custo = item["quantidade"] * custo_por_medida(insumo)
        custo_receita += custo
        itens_custo.append(ItemCusto(
            insumo_id=insumo["id"], nome=insumo["nome"], categoria=insumo["categoria"],
            quantidade=item["quantidade"], unidade=insumo["unidade"], custo=_r(custo),
        ))

    unidades = receita["rendimento"] * (1 - receita.get("perda_percentual", 0) / 100)
    insumos_un = custo_receita / unidades

    # 2. Mão de obra
    valor_hora  = config.salario_desejado / config.horas_mes
    mao_obra_un = (receita["tempo_preparo_min"] / 60 * valor_hora) / unidades

    # 3. Custos fixos rateados
    fixos_un = config.custos_fixos_mes / config.producao_mes

    custo_base_un = insumos_un + mao_obra_un + fixos_un

    # 4. Preço em cada canal
    precos_atuais = receita.get("precos_atuais") or {}
    precos = [preco_no_canal(custo_base_un, c, config, precos_atuais) for c in canais]

    # Alertas
    if not itens:
        alertas.append("Receita sem ingredientes cadastrados — o custo está incompleto.")
    if not any(i.categoria == "embalagem" for i in itens_custo):
        alertas.append("Nenhuma embalagem (forminha, caixa...) na receita. Ela entra no custo!")
    if receita["tempo_preparo_min"] == 0:
        alertas.append("Tempo de preparo zerado — o trabalho dela não está sendo cobrado.")
    if config.desconto_cento_percentual >= config.lucro_percentual:
        alertas.append(
            f"O desconto do cento ({config.desconto_cento_percentual:g}%) é igual ou maior que o "
            f"lucro ({config.lucro_percentual:g}%): no cento você só cobre custo, ou perde."
        )
    for c in canais:
        if config.lucro_percentual + c["taxa_percentual"] >= 90:
            alertas.append(f"Lucro + taxa do canal \"{c['nome']}\" passa de 90%: o preço calculado não é confiável.")

    return ResultadoPreco(
        receita_id=receita["id"], nome=receita["nome"], rendimento=receita["rendimento"],
        unidades_aproveitadas=round(unidades, 1), itens=itens_custo,
        custo_insumos_receita=_r(custo_receita),
        custo_insumos_un=_r(insumos_un), mao_obra_un=_r(mao_obra_un),
        custos_fixos_un=_r(fixos_un), custo_total_un=_r(custo_base_un),
        canais=precos, alertas=alertas,
    )
