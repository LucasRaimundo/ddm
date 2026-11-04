from fastapi import HTTPException

from app.core.database import get_supabase
from app.models.precificacao import ReceitaCreate, ReceitaUpdate

TABLE = "receitas"
TABLE_ITENS = "receita_itens"


def _validar_insumos(dados: ReceitaCreate | ReceitaUpdate) -> None:
    if not dados.itens:
        return
    existentes = {i["id"] for i in get_supabase().table("insumos").select("id").execute().data}
    faltando = [i.insumo_id for i in dados.itens if i.insumo_id not in existentes]
    if faltando:
        raise HTTPException(status_code=422, detail=f"Insumo(s) não encontrado(s): {faltando}")


def _com_itens(receita: dict, itens: list[dict]) -> dict:
    return {
        **receita,
        "itens": [{"insumo_id": i["insumo_id"], "quantidade": i["quantidade"]}
                  for i in itens if i["receita_id"] == receita["id"]],
    }


def _gravar_itens(receita_id: str, dados: ReceitaCreate | ReceitaUpdate) -> list[dict]:
    if not dados.itens:
        return []
    linhas = [{"receita_id": receita_id, **i.model_dump()} for i in dados.itens]
    return get_supabase().table(TABLE_ITENS).insert(linhas).execute().data


def listar() -> list:
    db = get_supabase()
    receitas = db.table(TABLE).select("*").order("nome").execute().data
    itens = db.table(TABLE_ITENS).select("*").execute().data
    return [_com_itens(r, itens) for r in receitas]


def buscar(id: str) -> dict:
    db = get_supabase()
    resultado = db.table(TABLE).select("*").eq("id", id).limit(1).execute()
    if not resultado.data:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    itens = db.table(TABLE_ITENS).select("*").eq("receita_id", id).execute().data
    return _com_itens(resultado.data[0], itens)


def criar(dados: ReceitaCreate) -> dict:
    _validar_insumos(dados)
    payload = dados.model_dump(mode="json", exclude={"itens"})
    receita = get_supabase().table(TABLE).insert(payload).execute().data[0]
    itens = _gravar_itens(receita["id"], dados)
    return _com_itens(receita, itens)


def atualizar(id: str, dados: ReceitaUpdate) -> dict:
    buscar(id)
    _validar_insumos(dados)
    db = get_supabase()
    payload = dados.model_dump(mode="json", exclude={"itens"})
    receita = db.table(TABLE).update(payload).eq("id", id).execute().data[0]
    db.table(TABLE_ITENS).delete().eq("receita_id", id).execute()
    itens = _gravar_itens(id, dados)
    return _com_itens(receita, itens)


def excluir(id: str) -> None:
    buscar(id)
    db = get_supabase()
    db.table(TABLE_ITENS).delete().eq("receita_id", id).execute()
    db.table(TABLE).delete().eq("id", id).execute()
