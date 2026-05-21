from app.core.database import get_supabase
from app.models.venda import VendaCreate, VendaUpdate
from fastapi import HTTPException


TABLE = "vendas_unitarias"


def listar(mes: int | None = None, ano: int | None = None) -> list:
    db = get_supabase()
    query = db.table(TABLE).select("*")

    if mes and ano:
        inicio = f"{ano}-{mes:02d}-01"
        if mes == 12:
            fim = f"{ano + 1}-01-01"
        else:
            fim = f"{ano}-{mes + 1:02d}-01"
        query = query.gte("data_venda", inicio).lt("data_venda", fim)

    resultado = query.order("created_at", desc=True).execute()
    return resultado.data


def buscar(id: str) -> dict:
    db = get_supabase()
    resultado = db.table(TABLE).select("*").eq("id", id).single().execute()
    if not resultado.data:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    return resultado.data


def criar(dados: VendaCreate) -> dict:
    db = get_supabase()
    payload = dados.model_dump()
    payload["data_venda"]   = str(payload["data_venda"])
    payload["valor_total"]  = payload["quantidade"] * payload["valor_unit"]
    resultado = db.table(TABLE).insert(payload).execute()
    return resultado.data[0]


def atualizar(id: str, dados: VendaUpdate) -> dict:
    buscar(id)  # garante que existe
    db = get_supabase()
    payload = dados.model_dump()
    payload["data_venda"]  = str(payload["data_venda"])
    payload["valor_total"] = payload["quantidade"] * payload["valor_unit"]
    resultado = db.table(TABLE).update(payload).eq("id", id).execute()
    return resultado.data[0]


def excluir(id: str) -> None:
    buscar(id)  # garante que existe
    db = get_supabase()
    db.table(TABLE).delete().eq("id", id).execute()