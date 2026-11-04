from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import date


class VendaBase(BaseModel):
    nome_cliente: str = Field(min_length=1)
    tipo_produto: str = Field(min_length=1)
    quantidade:   int = Field(gt=0)
    valor_unit:   float = Field(gt=0)
    data_venda:   date
    observacoes:  Optional[str] = None


class VendaCreate(VendaBase):
    pass


class VendaUpdate(VendaBase):
    pass


class Venda(VendaBase):
    model_config = ConfigDict(from_attributes=True)

    id:          str
    valor_total: float
    created_at:  Optional[str] = None
