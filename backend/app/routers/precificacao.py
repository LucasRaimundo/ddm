from fastapi import APIRouter

from app.models.precificacao import ConfigPrecificacao, ConfigPrecificacaoBase, ResultadoPreco
from app.services import precificacao_service

router = APIRouter(prefix="/precificacao", tags=["precificação"])


@router.get("", response_model=list[ResultadoPreco])
def tabela_de_precos():
    """Preço sugerido de todas as receitas."""
    return precificacao_service.calcular_todas()


@router.get("/config", response_model=ConfigPrecificacao)
def obter_config():
    return precificacao_service.obter_config()


@router.put("/config", response_model=ConfigPrecificacao)
def salvar_config(dados: ConfigPrecificacaoBase):
    return precificacao_service.salvar_config(dados)
