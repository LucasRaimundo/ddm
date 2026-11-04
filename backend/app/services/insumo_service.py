from fastapi import HTTPException

from app.core.database import get_supabase
from app.models.precificacao import InsumoCreate, InsumoUpdate

TABLE = "insumos"


def listar() -> list:
    from app.services.compra_service import ultimas_por_insumo  # evita import circular

    insumos = get_supabase().table(TABLE).select("*").order("nome").execute().data
    extras = ultimas_por_insumo()
    return [{**i, **extras.get(i["id"], {})} for i in insumos]


def buscar(id: str) -> dict:
    resultado = get_supabase().table(TABLE).select("*").eq("id", id).limit(1).execute()
    if not resultado.data:
        raise HTTPException(status_code=404, detail="Insumo não encontrado")
    return resultado.data[0]


def criar(dados: InsumoCreate) -> dict:
    return get_supabase().table(TABLE).insert(dados.model_dump(mode="json")).execute().data[0]


def atualizar(id: str, dados: InsumoUpdate) -> dict:
    buscar(id)
    resultado = get_supabase().table(TABLE).update(dados.model_dump(mode="json")).eq("id", id).execute()
    return resultado.data[0]


def excluir(id: str) -> None:
    buscar(id)
    db = get_supabase()
    usos = db.table("receita_itens").select("receita_id").eq("insumo_id", id).execute().data
    if usos:
        raise HTTPException(
            status_code=409,
            detail=f"Insumo usado em {len(usos)} receita(s). Remova das receitas antes de excluir.",
        )
    compras = db.table("compra_itens").select("compra_id").eq("insumo_id", id).execute().data
    if compras:
        raise HTTPException(
            status_code=409,
            detail=f"Insumo aparece em {len(compras)} compra(s) registrada(s) e não pode ser excluído.",
        )
    db.table(TABLE).delete().eq("id", id).execute()
