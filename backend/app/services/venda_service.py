from fastapi import HTTPException

from app.core.database import get_supabase
from app.models.venda import VendaCreate, VendaUpdate
from app.services.filtros import intervalo_mes


TABLE = "vendas_unitarias"


def listar(mes: int | None = None, ano: int | None = None) -> list:
    db = get_supabase()
    query = db.table(TABLE).select("*")

    if mes and ano:
        inicio, fim = intervalo_mes(mes, ano)
        query = query.gte("data_venda", inicio).lt("data_venda", fim)

    resultado = query.order("created_at", desc=True).execute()
    return resultado.data


def buscar(id: str) -> dict:
    db = get_supabase()
    resultado = db.table(TABLE).select("*").eq("id", id).limit(1).execute()
    if not resultado.data:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    return resultado.data[0]


def _payload(dados: VendaCreate | VendaUpdate) -> dict:
    payload = dados.model_dump(mode="json")
    payload["valor_total"] = round(payload["quantidade"] * payload["valor_unit"], 2)
    return payload


def criar(dados: VendaCreate) -> dict:
    db = get_supabase()
    resultado = db.table(TABLE).insert(_payload(dados)).execute()
    return resultado.data[0]


def atualizar(id: str, dados: VendaUpdate) -> dict:
    buscar(id)  # garante que existe
    db = get_supabase()
    resultado = db.table(TABLE).update(_payload(dados)).eq("id", id).execute()
    return resultado.data[0]


def excluir(id: str) -> None:
    buscar(id)  # garante que existe
    db = get_supabase()
    db.table(TABLE).delete().eq("id", id).execute()
