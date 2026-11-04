from fastapi import APIRouter, status

from app.models.compra import PontoHistorico
from app.models.precificacao import Insumo, InsumoCreate, InsumoUpdate
from app.services import compra_service, insumo_service

router = APIRouter(prefix="/insumos", tags=["precificação"])


@router.get("", response_model=list[Insumo])
def listar():
    return insumo_service.listar()


@router.get("/{id}", response_model=Insumo)
def buscar(id: str):
    return insumo_service.buscar(id)


@router.get("/{id}/historico", response_model=list[PontoHistorico])
def historico(id: str):
    """Todas as compras do insumo, da mais antiga para a mais recente."""
    insumo_service.buscar(id)
    return compra_service.historico(id)


@router.post("", response_model=Insumo, status_code=status.HTTP_201_CREATED)
def criar(dados: InsumoCreate):
    return insumo_service.criar(dados)


@router.put("/{id}", response_model=Insumo)
def atualizar(id: str, dados: InsumoUpdate):
    return insumo_service.atualizar(id, dados)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(id: str):
    insumo_service.excluir(id)
