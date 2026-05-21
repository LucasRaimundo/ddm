from pydantic import BaseModel, computed_field
from typing import Optional
from datetime import date


class VendaBase(BaseModel):
    nome_cliente: str
    tipo_produto: str
    quantidade:   int
    valor_unit:   float
    data_venda:   date
    observacoes:  Optional[str] = None


class VendaCreate(VendaBase):
    pass


class VendaUpdate(VendaBase):
    pass


class Venda(VendaBase):
    id:          str
    valor_total: float
    created_at:  Optional[str] = None

    class Config:
        from_attributes = True