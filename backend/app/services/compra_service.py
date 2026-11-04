"""Compras de insumos.

Regra principal: o preço de um insumo é sempre o da compra MAIS RECENTE dele
(custo de reposição). Toda vez que uma compra é criada, editada ou apagada,
os insumos afetados são ressincronizados.
"""
from fastapi import HTTPException

from app.core.database import get_supabase
from app.models.compra import CompraCreate, CompraUpdate, GastoInsumo, PontoHistorico, ResumoCompras
from app.services.filtros import intervalo_mes

TABLE = "compras"
TABLE_ITENS = "compra_itens"


# ───────────────────────── helpers ─────────────────────────

def _r(v: float, casas: int = 2) -> float:
    return round(v, casas)


def _item_resposta(item: dict) -> dict:
    preco_emb = item["valor_total"] / item["quantidade"]
    return {
        "insumo_id":         item["insumo_id"],
        "quantidade":        item["quantidade"],
        "tamanho_embalagem": item["tamanho_embalagem"],
        "valor_total":       item["valor_total"],
        "preco_embalagem":   _r(preco_emb),
        "preco_por_medida":  _r(preco_emb / item["tamanho_embalagem"], 4),
    }


def _com_itens(compra: dict, itens: list[dict]) -> dict:
    return {**compra, "itens": [_item_resposta(i) for i in itens if i["compra_id"] == compra["id"]]}


def _insumos_por_id() -> dict[str, dict]:
    return {i["id"]: i for i in get_supabase().table("insumos").select("*").execute().data}


def _montar_itens(compra_id: str, dados: CompraCreate | CompraUpdate) -> list[dict]:
    insumos = _insumos_por_id()
    faltando = [i.insumo_id for i in dados.itens if i.insumo_id not in insumos]
    if faltando:
        raise HTTPException(status_code=422, detail=f"Insumo(s) não encontrado(s): {faltando}")
    return [
        {
            "compra_id":         compra_id,
            "insumo_id":         i.insumo_id,
            "quantidade":        i.quantidade,
            "tamanho_embalagem": i.tamanho_embalagem or insumos[i.insumo_id]["quantidade_embalagem"],
            "valor_total":       i.valor_total,
        }
        for i in dados.itens
    ]


def _cabecalho(dados: CompraCreate | CompraUpdate) -> dict:
    return {
        "data_compra": dados.data_compra.isoformat(),
        "local":       dados.local or None,
        "observacoes": dados.observacoes or None,
        "valor_total": _r(sum(i.valor_total for i in dados.itens)),
    }


def _historico_bruto(insumo_id: str) -> list[tuple[dict, dict]]:
    """[(item, compra)] do insumo, da compra mais antiga para a mais recente."""
    db = get_supabase()
    itens = db.table(TABLE_ITENS).select("*").eq("insumo_id", insumo_id).execute().data
    if not itens:
        return []
    ids = list({i["compra_id"] for i in itens})
    compras = {c["id"]: c for c in db.table(TABLE).select("*").in_("id", ids).execute().data}
    pares = [(i, compras[i["compra_id"]]) for i in itens if i["compra_id"] in compras]
    return sorted(pares, key=lambda p: (p[1]["data_compra"], p[1].get("created_at") or ""))


def sincronizar_preco(insumo_id: str) -> None:
    """Atualiza o preço do insumo com a compra mais recente. Sem compras, mantém o preço manual."""
    historico = _historico_bruto(insumo_id)
    if not historico:
        return
    item, _ = historico[-1]
    get_supabase().table("insumos").update({
        "preco_embalagem":      _r(item["valor_total"] / item["quantidade"]),
        "quantidade_embalagem": item["tamanho_embalagem"],
    }).eq("id", insumo_id).execute()


# ───────────────────────── CRUD ─────────────────────────

def listar(mes: int | None = None, ano: int | None = None) -> list:
    db = get_supabase()
    query = db.table(TABLE).select("*")
    if mes and ano:
        inicio, fim = intervalo_mes(mes, ano)
        query = query.gte("data_compra", inicio).lt("data_compra", fim)
    compras = query.order("data_compra", desc=True).execute().data
    if not compras:
        return []
    itens = db.table(TABLE_ITENS).select("*").in_("compra_id", [c["id"] for c in compras]).execute().data
    return [_com_itens(c, itens) for c in compras]


def buscar(id: str) -> dict:
    db = get_supabase()
    resultado = db.table(TABLE).select("*").eq("id", id).limit(1).execute()
    if not resultado.data:
        raise HTTPException(status_code=404, detail="Compra não encontrada")
    itens = db.table(TABLE_ITENS).select("*").eq("compra_id", id).execute().data
    return _com_itens(resultado.data[0], itens)


def criar(dados: CompraCreate) -> dict:
    db = get_supabase()
    _montar_itens("validacao", dados)  # valida insumos antes de gravar qualquer coisa
    compra = db.table(TABLE).insert(_cabecalho(dados)).execute().data[0]
    itens = db.table(TABLE_ITENS).insert(_montar_itens(compra["id"], dados)).execute().data
    for i in dados.itens:
        sincronizar_preco(i.insumo_id)
    return _com_itens(compra, itens)


def atualizar(id: str, dados: CompraUpdate) -> dict:
    antiga = buscar(id)
    novos_itens = _montar_itens(id, dados)
    db = get_supabase()
    compra = db.table(TABLE).update(_cabecalho(dados)).eq("id", id).execute().data[0]
    db.table(TABLE_ITENS).delete().eq("compra_id", id).execute()
    itens = db.table(TABLE_ITENS).insert(novos_itens).execute().data
    afetados = {i["insumo_id"] for i in antiga["itens"]} | {i.insumo_id for i in dados.itens}
    for insumo_id in afetados:
        sincronizar_preco(insumo_id)
    return _com_itens(compra, itens)


def excluir(id: str) -> None:
    compra = buscar(id)
    db = get_supabase()
    db.table(TABLE_ITENS).delete().eq("compra_id", id).execute()
    db.table(TABLE).delete().eq("id", id).execute()
    for i in compra["itens"]:
        sincronizar_preco(i["insumo_id"])


# ───────────────────────── relatórios ─────────────────────────

def resumo(mes: int, ano: int) -> ResumoCompras:
    compras = listar(mes, ano)
    insumos = _insumos_por_id()
    por_insumo: dict[str, float] = {}
    for c in compras:
        for i in c["itens"]:
            por_insumo[i["insumo_id"]] = por_insumo.get(i["insumo_id"], 0) + i["valor_total"]
    gastos = sorted(
        (GastoInsumo(insumo_id=k, nome=insumos.get(k, {}).get("nome", "(apagado)"), total=_r(v))
         for k, v in por_insumo.items()),
        key=lambda g: g.total, reverse=True,
    )
    return ResumoCompras(
        mes=mes, ano=ano, total=_r(sum(c["valor_total"] for c in compras)),
        quantidade=len(compras), por_insumo=gastos,
    )


def historico(insumo_id: str) -> list[PontoHistorico]:
    pontos: list[PontoHistorico] = []
    anterior: float | None = None
    for item, compra in _historico_bruto(insumo_id):
        r = _item_resposta(item)
        exato = item["valor_total"] / item["quantidade"] / item["tamanho_embalagem"]
        variacao = None if anterior is None else _r((exato / anterior - 1) * 100, 1)
        pontos.append(PontoHistorico(
            compra_id=compra["id"], data_compra=compra["data_compra"], local=compra.get("local"),
            quantidade=item["quantidade"], tamanho_embalagem=item["tamanho_embalagem"],
            valor_total=item["valor_total"], preco_embalagem=r["preco_embalagem"],
            preco_por_medida=r["preco_por_medida"], variacao_pct=variacao,
        ))
        anterior = exato
    return pontos


def ultimas_por_insumo() -> dict[str, dict]:
    """{insumo_id: {ultima_compra, variacao_pct}} para enriquecer a lista de insumos."""
    db = get_supabase()
    itens = db.table(TABLE_ITENS).select("*").execute().data
    if not itens:
        return {}
    compras = {c["id"]: c for c in db.table(TABLE).select("id, data_compra, created_at").execute().data}
    por_insumo: dict[str, list[tuple[str, str, float]]] = {}
    for i in itens:
        c = compras.get(i["compra_id"])
        if c:
            preco = i["valor_total"] / i["quantidade"] / i["tamanho_embalagem"]
            por_insumo.setdefault(i["insumo_id"], []).append((c["data_compra"], c.get("created_at") or "", preco))
    resultado = {}
    for insumo_id, lista in por_insumo.items():
        lista.sort()
        variacao = None
        if len(lista) >= 2 and lista[-2][2] > 0:
            variacao = _r((lista[-1][2] / lista[-2][2] - 1) * 100, 1)
        resultado[insumo_id] = {"ultima_compra": lista[-1][0], "variacao_pct": variacao}
    return resultado
