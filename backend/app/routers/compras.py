from fastapi import APIRouter, Query, status

from app.models.compra import Compra, CompraCreate, CompraUpdate, ResumoCompras
from app.services import compra_service

router = APIRouter(prefix="/compras", tags=["compras"])


@router.get("", response_model=list[Compra])
def listar(
    mes: int | None = Query(None, ge=1, le=12),
    ano: int | None = Query(None, ge=2000, le=2100),
):
    return compra_service.listar(mes, ano)


@router.get("/resumo", response_model=ResumoCompras)
def resumo(mes: int = Query(ge=1, le=12), ano: int = Query(ge=2000, le=2100)):
    """Quanto foi gasto em insumos no mês."""
    return compra_service.resumo(mes, ano)


@router.get("/{id}", response_model=Compra)
def buscar(id: str):
    return compra_service.buscar(id)


@router.post("", response_model=Compra, status_code=status.HTTP_201_CREATED)
def criar(dados: CompraCreate):
    return compra_service.criar(dados)


@router.put("/{id}", response_model=Compra)
def atualizar(id: str, dados: CompraUpdate):
    return compra_service.atualizar(id, dados)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(id: str):
    compra_service.excluir(id)
