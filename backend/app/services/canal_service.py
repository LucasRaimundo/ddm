from fastapi import HTTPException

from app.core.database import get_supabase
from app.models.precificacao import CanalVendaCreate, CanalVendaUpdate

TABLE = "canais_venda"


def listar() -> list:
    return get_supabase().table(TABLE).select("*").order("ordem").order("nome").execute().data


def buscar(id: str) -> dict:
    resultado = get_supabase().table(TABLE).select("*").eq("id", id).limit(1).execute()
    if not resultado.data:
        raise HTTPException(status_code=404, detail="Canal de venda não encontrado")
    return resultado.data[0]


def _validar_com_lucro(taxa: float) -> None:
    from app.services.precificacao_service import obter_config  # evita import circular

    lucro = obter_config().lucro_percentual
    if lucro + taxa >= 90:
        raise HTTPException(
            status_code=422,
            detail=f"Lucro ({lucro:g}%) + taxa do canal ({taxa:g}%) precisa ser menor que 90%.",
        )


def criar(dados: CanalVendaCreate) -> dict:
    _validar_com_lucro(dados.taxa_percentual)
    return get_supabase().table(TABLE).insert(dados.model_dump()).execute().data[0]


def atualizar(id: str, dados: CanalVendaUpdate) -> dict:
    buscar(id)
    _validar_com_lucro(dados.taxa_percentual)
    return get_supabase().table(TABLE).update(dados.model_dump()).eq("id", id).execute().data[0]


def excluir(id: str) -> None:
    buscar(id)
    if len(listar()) <= 1:
        raise HTTPException(status_code=409, detail="Precisa existir pelo menos um canal de venda.")
    get_supabase().table(TABLE).delete().eq("id", id).execute()
