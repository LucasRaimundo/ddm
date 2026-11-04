from fastapi import APIRouter, status

from app.models.precificacao import Receita, ReceitaCreate, ReceitaUpdate, ResultadoPreco
from app.services import precificacao_service, receita_service

router = APIRouter(prefix="/receitas", tags=["precificação"])


@router.get("", response_model=list[Receita])
def listar():
    return receita_service.listar()


@router.get("/{id}", response_model=Receita)
def buscar(id: str):
    return receita_service.buscar(id)


@router.get("/{id}/preco", response_model=ResultadoPreco)
def calcular_preco(id: str):
    return precificacao_service.calcular_receita(id)


@router.post("", response_model=Receita, status_code=status.HTTP_201_CREATED)
def criar(dados: ReceitaCreate):
    return receita_service.criar(dados)


@router.put("/{id}", response_model=Receita)
def atualizar(id: str, dados: ReceitaUpdate):
    return receita_service.atualizar(id, dados)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(id: str):
    receita_service.excluir(id)
