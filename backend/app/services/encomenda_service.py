from fastapi import HTTPException

from app.core.database import get_supabase
from app.models.encomenda import EncomendaCreate, EncomendaUpdate, StatusEncomenda, STATUS_TRANSITIONS
from app.services.filtros import intervalo_mes


TABLE = "encomendas"


def listar(mes: int | None = None, ano: int | None = None) -> list:
    db = get_supabase()
    query = db.table(TABLE).select("*")

    if mes and ano:
        inicio, fim = intervalo_mes(mes, ano)
        query = query.gte("data_pedido", inicio).lt("data_pedido", fim)

    resultado = query.order("created_at", desc=True).execute()
    return resultado.data


def buscar(id: str) -> dict:
    db = get_supabase()
    # .single() lança APIError quando não acha a linha (virava 500);
    # com limit(1) a lista vem vazia e conseguimos devolver 404.
    resultado = db.table(TABLE).select("*").eq("id", id).limit(1).execute()
    if not resultado.data:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    return resultado.data[0]


def criar(dados: EncomendaCreate) -> dict:
    db = get_supabase()
    payload = dados.model_dump(mode="json")
    payload["status"] = StatusEncomenda.pendente.value
    resultado = db.table(TABLE).insert(payload).execute()
    return resultado.data[0]


def atualizar(id: str, dados: EncomendaUpdate) -> dict:
    buscar(id)  # garante que existe
    db = get_supabase()
    payload = dados.model_dump(mode="json")
    resultado = db.table(TABLE).update(payload).eq("id", id).execute()
    return resultado.data[0]


def avancar_status(id: str, novo_status: StatusEncomenda) -> dict:
    encomenda = buscar(id)
    status_atual = StatusEncomenda(encomenda["status"])
    permitidos = STATUS_TRANSITIONS[status_atual]

    if novo_status not in permitidos:
        raise HTTPException(
            status_code=400,
            detail=f"Transição inválida: {status_atual.value} → {novo_status.value}. "
                   f"Permitidos: {[s.value for s in permitidos]}",
        )

    db = get_supabase()
    resultado = db.table(TABLE).update({"status": novo_status.value}).eq("id", id).execute()
    return resultado.data[0]


def excluir(id: str) -> None:
    buscar(id)  # garante que existe
    db = get_supabase()
    db.table(TABLE).delete().eq("id", id).execute()
