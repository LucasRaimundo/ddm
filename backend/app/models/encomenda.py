from pydantic import BaseModel, ConfigDict, Field, model_validator
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
    nome_cliente:   str = Field(min_length=1)
    tipo_encomenda: str = Field(min_length=1)
    valor:          float = Field(gt=0)
    data_pedido:    date
    data_entrega:   date
    observacoes:    Optional[str] = None

    @model_validator(mode="after")
    def validar_datas(self):
        if self.data_entrega < self.data_pedido:
            raise ValueError("data_entrega não pode ser anterior a data_pedido")
        return self


class EncomendaCreate(EncomendaBase):
    pass


class EncomendaUpdate(EncomendaBase):
    pass


class EncomendaStatusUpdate(BaseModel):
    status: StatusEncomenda


class Encomenda(EncomendaBase):
    model_config = ConfigDict(from_attributes=True)

    id:         str
    status:     StatusEncomenda
    created_at: Optional[str] = None
