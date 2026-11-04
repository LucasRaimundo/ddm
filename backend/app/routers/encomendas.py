from fastapi import APIRouter, Query, status

from app.models.encomenda import Encomenda, EncomendaCreate, EncomendaUpdate, EncomendaStatusUpdate
from app.services import encomenda_service

router = APIRouter(prefix="/encomendas", tags=["encomendas"])


@router.get("", response_model=list[Encomenda])
def listar(
    mes: int | None = Query(None, ge=1, le=12, description="Mês (1-12) da data_pedido"),
    ano: int | None = Query(None, ge=2000, le=2100),
):
    return encomenda_service.listar(mes, ano)


@router.get("/{id}", response_model=Encomenda)
def buscar(id: str):
    return encomenda_service.buscar(id)


@router.post("", response_model=Encomenda, status_code=status.HTTP_201_CREATED)
def criar(dados: EncomendaCreate):
    return encomenda_service.criar(dados)


@router.put("/{id}", response_model=Encomenda)
def atualizar(id: str, dados: EncomendaUpdate):
    return encomenda_service.atualizar(id, dados)


@router.patch("/{id}/status", response_model=Encomenda)
def avancar_status(id: str, dados: EncomendaStatusUpdate):
    return encomenda_service.avancar_status(id, dados.status)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(id: str):
    encomenda_service.excluir(id)
