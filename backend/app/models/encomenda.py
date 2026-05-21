from pydantic import BaseModel
from typing import Optional
from datetime import date
from enum import Enum


class StatusEncomenda(str, Enum):
    pendente    = "pendente"
    confirmado  = "confirmado"
    em_producao = "em_producao"
    entregue    = "entregue"
    cancelado   = "cancelado"


STATUS_TRANSITIONS: dict[StatusEncomenda, list[StatusEncomenda]] = {
    StatusEncomenda.pendente:    [StatusEncomenda.confirmado, StatusEncomenda.cancelado],
    StatusEncomenda.confirmado:  [StatusEncomenda.em_producao, StatusEncomenda.cancelado],
    StatusEncomenda.em_producao: [StatusEncomenda.entregue],
    StatusEncomenda.entregue:    [],
    StatusEncomenda.cancelado:   [],
}


class EncomendaBase(BaseModel):
    nome_cliente:   str
    tipo_encomenda: str
    valor:          float
    data_pedido:    date
    data_entrega:   date
    observacoes:    Optional[str] = None


class EncomendaCreate(EncomendaBase):
    pass


class EncomendaUpdate(EncomendaBase):
    pass


class EncomendaStatusUpdate(BaseModel):
    status: StatusEncomenda


class Encomenda(EncomendaBase):
    id:         str
    status:     StatusEncomenda
    created_at: Optional[str] = None

    class Config:
        from_attributes = True