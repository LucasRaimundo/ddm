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
    lucro_percentual=15, desconto_cento_percentual=10,
)
DIRETO = {"id": "direto", "nome": "Venda direta", "taxa_percentual": 5, "custo_extra_un": 0}
IFOOD  = {"id": "ifood", "nome": "iFood Entrega", "taxa_percentual": 26.5, "custo_extra_un": 0.20}
CANAIS = [DIRETO, IFOOD]


def receita(**kw):
    base = {"id": "r1", "nome": "Brigadeiro", "rendimento": 25, "tempo_preparo_min": 60,
            "perda_percentual": 0, "precos_atuais": {}}
    return {**base, **kw}


def calc(rec, itens=None, config=CONFIG, canais=CANAIS):
    return calcular(rec, ITENS if itens is None else itens, INSUMOS, config, canais)


def direto(r):
    return next(c for c in r.canais if c.canal_id == "direto")


def ifood(r):
    return next(c for c in r.canais if c.canal_id == "ifood")


ITENS = [{"insumo_id": "lc", "quantidade": 395}, {"insumo_id": "fm", "quantidade": 25}]


def test_exemplo_do_guia():
    r = calc(receita())
    assert r.custo_insumos_receita == pytest.approx(8.50)   # 7,00 + 25 × 0,06
    assert r.custo_insumos_un == pytest.approx(0.34)
    assert r.mao_obra_un == pytest.approx(1.00)             # 1h × R$25/h ÷ 25
    assert r.custos_fixos_un == pytest.approx(0.15)
    assert r.custo_total_un == pytest.approx(1.49)
    d = direto(r)
    assert d.preco_sugerido_un == pytest.approx(1.86)       # 1,49 ÷ 0,80
    assert d.preco_sugerido_cento == pytest.approx(167.62, abs=0.01)


def test_ifood_cobra_mais_e_soma_custo_extra():
    i = ifood(calc(receita()))
    assert i.custo_un == pytest.approx(1.69)                # 1,49 + 0,20 de embalagem delivery
    assert i.preco_sugerido_un == pytest.approx(2.89)       # 1,69 ÷ (1 − 0,415)
    assert i.taxas_un == pytest.approx(0.77)
    assert i.lucro_un == pytest.approx(0.43)


def test_mesmo_preco_nos_dois_canais_da_resultados_diferentes():
    r = calc(receita(precos_atuais={"direto": {"unidade": 2.0}, "ifood": {"unidade": 2.0}}))
    assert direto(r).analise_unidade.status == "ok"
    assert ifood(r).analise_unidade.status == "prejuizo"     # 2,00 × 0,735 = 1,47 < 1,69


def test_sem_canais_usa_padrao_sem_taxa():
    r = calc(receita(), canais=[])
    assert [c.canal_id for c in r.canais] == ["padrao"]
    assert r.canais[0].preco_sugerido_un == pytest.approx(1.75)   # 1,49 ÷ 0,85


def test_perda_reduz_unidades_e_aumenta_custo():
    sem = calc(receita())
    com = calc(receita(perda_percentual=20))
    assert com.unidades_aproveitadas == 20
    assert com.custo_insumos_un > sem.custo_insumos_un


def test_cento_abaixo_do_custo_e_prejuizo():
    d = direto(calc(receita(precos_atuais={"direto": {"cento": 100}})))
    assert d.analise_cento.status == "prejuizo"
    assert d.analise_cento.lucro_real < 0


def test_preco_sugerido_conta_como_ok():
    base = direto(calc(receita()))
    d = direto(calc(receita(precos_atuais={"direto": {
        "unidade": base.preco_sugerido_un, "cento": base.preco_sugerido_cento}})))
    assert d.analise_unidade.status == "ok"
    assert d.analise_unidade.margem_real_pct == pytest.approx(15, abs=0.5)
    assert d.analise_cento.status == "ok"


def test_preco_abaixo_mas_com_lucro():
    d = direto(calc(receita(precos_atuais={"direto": {"unidade": 1.70}})))
    assert d.analise_unidade.status == "abaixo"
    assert d.analise_unidade.lucro_real > 0


def test_sem_preco_atual():
    assert direto(calc(receita())).analise_unidade.status == "sem_preco"


def test_alertas():
    cfg = CONFIG.model_copy(update={"desconto_cento_percentual": 20})
    r = calc(receita(tempo_preparo_min=0), itens=[ITENS[0]], config=cfg)
    textos = " ".join(r.alertas)
    assert "embalagem" in textos
    assert "Tempo de preparo zerado" in textos
    assert "desconto do cento" in textos
