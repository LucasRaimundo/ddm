from app.core.database import get_supabase
from app.models.encomenda import EncomendaCreate, EncomendaUpdate, StatusEncomenda, STATUS_TRANSITIONS
from fastapi import HTTPException


TABLE = "encomendas"


def listar(mes: int | None = None, ano: int | None = None) -> list:
    db = get_supabase()
    query = db.table(TABLE).select("*")

    if mes and ano:
        # filtra por data_pedido no mês/ano
        inicio = f"{ano}-{mes:02d}-01"
        if mes == 12:
            fim = f"{ano + 1}-01-01"
        else:
            fim = f"{ano}-{mes + 1:02d}-01"
        query = query.gte("data_pedido", inicio).lt("data_pedido", fim)

    resultado = query.order("created_at", desc=True).execute()
    return resultado.data


def buscar(id: str) -> dict:
    db = get_supabase()
    resultado = db.table(TABLE).select("*").eq("id", id).single().execute()
    if not resultado.data:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    return resultado.data


def criar(dados: EncomendaCreate) -> dict:
    db = get_supabase()
    payload = dados.model_dump()
    payload["data_pedido"]  = str(payload["data_pedido"])
    payload["data_entrega"] = str(payload["data_entrega"])
    payload["status"] = StatusEncomenda.pendente.value
    resultado = db.table(TABLE).insert(payload).execute()
    return resultado.data[0]


def atualizar(id: str, dados: EncomendaUpdate) -> dict:
    buscar(id)  # garante que existe
    db = get_supabase()
    payload = dados.model_dump()
    payload["data_pedido"]  = str(payload["data_pedido"])
    payload["data_entrega"] = str(payload["data_entrega"])
    resultado = db.table(TABLE).update(payload).eq("id", id).execute()
    return resultado.data[0]


def avancar_status(id: str, novo_status: StatusEncomenda) -> dict:
    encomenda = buscar(id)
    status_atual = StatusEncomenda(encomenda["status"])
    permitidos = STATUS_TRANSITIONS[status_atual]

    if novo_status not in permitidos:
        raise HTTPException(
            status_code=400,
            detail=f"Transição inválida: {status_atual} → {novo_status}. Permitidos: {[s.value for s in permitidos]}"
        )

    db = get_supabase()
    resultado = db.table(TABLE).update({"status": novo_status.value}).eq("id", id).execute()
    return resultado.data[0]


def excluir(id: str) -> None:
    buscar(id)  # garante que existe
    db = get_supabase()
    db.table(TABLE).delete().eq("id", id).execute()