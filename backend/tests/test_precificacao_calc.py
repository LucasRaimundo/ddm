import pytest

from app.models.precificacao import ConfigPrecificacaoBase
from app.services.precificacao_calc import calcular

INSUMOS = {
    "lc":  {"id": "lc",  "nome": "Leite condensado", "categoria": "ingrediente", "unidade": "g",
            "preco_embalagem": 7.0, "quantidade_embalagem": 395},
    "fm":  {"id": "fm",  "nome": "Forminha", "categoria": "embalagem", "unidade": "un",
            "preco_embalagem": 6.0, "quantidade_embalagem": 100},
}
CONFIG = ConfigPrecificacaoBase(
    salario_desejado=3000, horas_mes=120, custos_fixos_mes=300, producao_mes=2000,
    lucro_percentual=15, taxas_percentual=5, desconto_cento_percentual=10,
)


def receita(**kw):
    base = {"id": "r1", "nome": "Brigadeiro", "rendimento": 25, "tempo_preparo_min": 60,
            "perda_percentual": 0, "preco_venda_unidade": None, "preco_venda_cento": None}
    return {**base, **kw}


ITENS = [{"insumo_id": "lc", "quantidade": 395}, {"insumo_id": "fm", "quantidade": 25}]


def test_exemplo_do_guia():
    r = calcular(receita(), ITENS, INSUMOS, CONFIG)
    assert r.custo_insumos_receita == pytest.approx(8.50)   # 7,00 + 25 × 0,06
    assert r.custo_insumos_un == pytest.approx(0.34)
    assert r.mao_obra_un == pytest.approx(1.00)             # 1h × R$25/h ÷ 25
    assert r.custos_fixos_un == pytest.approx(0.15)
    assert r.custo_total_un == pytest.approx(1.49)
    assert r.preco_sugerido_un == pytest.approx(1.86)       # 1,49 ÷ 0,80
    assert r.preco_sugerido_cento == pytest.approx(167.62, abs=0.01)  # 186,25 × 0,90


def test_perda_reduz_unidades_e_aumenta_custo():
    sem = calcular(receita(), ITENS, INSUMOS, CONFIG)
    com = calcular(receita(perda_percentual=20), ITENS, INSUMOS, CONFIG)
    assert com.unidades_aproveitadas == 20
    assert com.custo_insumos_un > sem.custo_insumos_un


def test_cento_abaixo_do_custo_e_prejuizo():
    r = calcular(receita(preco_venda_cento=100), ITENS, INSUMOS, CONFIG)
    assert r.analise_cento.status == "prejuizo"
    assert r.analise_cento.lucro_real < 0


def test_preco_sugerido_conta_como_ok():
    base = calcular(receita(), ITENS, INSUMOS, CONFIG)
    r = calcular(receita(preco_venda_unidade=base.preco_sugerido_un,
                         preco_venda_cento=base.preco_sugerido_cento), ITENS, INSUMOS, CONFIG)
    assert r.analise_unidade.status == "ok"
    assert r.analise_unidade.margem_real_pct == pytest.approx(15, abs=0.5)
    assert r.analise_cento.status == "ok"


def test_preco_abaixo_mas_com_lucro():
    r = calcular(receita(preco_venda_unidade=1.70), ITENS, INSUMOS, CONFIG)
    assert r.analise_unidade.status == "abaixo"
    assert r.analise_unidade.lucro_real > 0


def test_sem_preco_atual():
    r = calcular(receita(), ITENS, INSUMOS, CONFIG)
    assert r.analise_unidade.status == "sem_preco"


def test_alertas():
    cfg = CONFIG.model_copy(update={"desconto_cento_percentual": 20})
    r = calcular(receita(tempo_preparo_min=0), [ITENS[0]], INSUMOS, cfg)
    textos = " ".join(r.alertas)
    assert "embalagem" in textos
    assert "Tempo de preparo zerado" in textos
    assert "desconto do cento" in textos


def test_config_rejeita_lucro_mais_taxas_absurdo():
    with pytest.raises(ValueError):
        ConfigPrecificacaoBase(lucro_percentual=60, taxas_percentual=40)
