from fastapi import APIRouter, status

from app.models.precificacao import CanalVenda, CanalVendaCreate, CanalVendaUpdate
from app.services import canal_service

router = APIRouter(prefix="/canais", tags=["precificação"])


@router.get("", response_model=list[CanalVenda])
def listar():
    return canal_service.listar()


@router.post("", response_model=CanalVenda, status_code=status.HTTP_201_CREATED)
def criar(dados: CanalVendaCreate):
    return canal_service.criar(dados)


@router.put("/{id}", response_model=CanalVenda)
def atualizar(id: str, dados: CanalVendaUpdate):
    return canal_service.atualizar(id, dados)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(id: str):
    canal_service.excluir(id)
