from fastapi import APIRouter, Query, status

from app.models.venda import Venda, VendaCreate, VendaUpdate
from app.services import venda_service

router = APIRouter(prefix="/vendas", tags=["vendas"])


@router.get("", response_model=list[Venda])
def listar(
    mes: int | None = Query(None, ge=1, le=12, description="Mês (1-12) da data_venda"),
    ano: int | None = Query(None, ge=2000, le=2100),
):
    return venda_service.listar(mes, ano)


@router.get("/{id}", response_model=Venda)
def buscar(id: str):
    return venda_service.buscar(id)


@router.post("", response_model=Venda, status_code=status.HTTP_201_CREATED)
def criar(dados: VendaCreate):
    return venda_service.criar(dados)


@router.put("/{id}", response_model=Venda)
def atualizar(id: str, dados: VendaUpdate):
    return venda_service.atualizar(id, dados)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(id: str):
    venda_service.excluir(id)
