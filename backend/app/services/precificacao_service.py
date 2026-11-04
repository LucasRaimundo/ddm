from fastapi import HTTPException

from app.core.database import get_supabase
from app.models.precificacao import ConfigPrecificacao, ConfigPrecificacaoBase, ResultadoPreco
from app.services import canal_service, receita_service
from app.services.precificacao_calc import calcular

TABLE_CONFIG = "config_precificacao"
CONFIG_ID = 1  # tabela de uma linha só


def obter_config() -> ConfigPrecificacao:
    linhas = get_supabase().table(TABLE_CONFIG).select("*").eq("id", CONFIG_ID).limit(1).execute().data
    if not linhas:
        return ConfigPrecificacao(configurado=False)  # valores padrão
    campos = {k: v for k, v in linhas[0].items() if k in ConfigPrecificacaoBase.model_fields}
    return ConfigPrecificacao(**campos, configurado=True)


def salvar_config(dados: ConfigPrecificacaoBase) -> ConfigPrecificacao:
    for canal in canal_service.listar():
        if dados.lucro_percentual + canal["taxa_percentual"] >= 90:
            raise HTTPException(
                status_code=422,
                detail=f"Lucro ({dados.lucro_percentual:g}%) + taxa do canal \"{canal['nome']}\" "
                       f"({canal['taxa_percentual']:g}%) precisa ser menor que 90%.",
            )
    payload = {"id": CONFIG_ID, **dados.model_dump()}
    get_supabase().table(TABLE_CONFIG).upsert(payload).execute()
    return ConfigPrecificacao(**dados.model_dump(), configurado=True)


def _insumos_por_id() -> dict[str, dict]:
    return {i["id"]: i for i in get_supabase().table("insumos").select("*").execute().data}


def calcular_receita(id: str) -> ResultadoPreco:
    receita = receita_service.buscar(id)
    return calcular(receita, receita["itens"], _insumos_por_id(), obter_config(), canal_service.listar())


def calcular_todas() -> list[ResultadoPreco]:
    config = obter_config()
    insumos = _insumos_por_id()
    canais = canal_service.listar()
    return [calcular(r, r["itens"], insumos, config, canais) for r in receita_service.listar()]
