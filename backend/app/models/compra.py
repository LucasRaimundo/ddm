from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CompraItemBase(BaseModel):
    insumo_id:         str
    quantidade:        float = Field(gt=0, description="Quantas embalagens comprou (ex.: 6 latas)")
    tamanho_embalagem: Optional[float] = Field(
        None, gt=0,
        description="Quanto vem em cada embalagem, na unidade do insumo. Vazio = o tamanho já cadastrado no insumo",
    )
    valor_total:       float = Field(gt=0, description="Quanto pagou por esse item no total (R$)")


class CompraItem(CompraItemBase):
    tamanho_embalagem: float
    preco_embalagem:   float   # valor_total ÷ quantidade
    preco_por_medida:  float   # preço por g / ml / un


class CompraBase(BaseModel):
    data_compra: date
    local:       Optional[str] = None
    observacoes: Optional[str] = None
    itens:       list[CompraItemBase] = Field(min_length=1)

    @model_validator(mode="after")
    def validar_itens(self):
        ids = [i.insumo_id for i in self.itens]
        if len(ids) != len(set(ids)):
            raise ValueError("O mesmo insumo aparece mais de uma vez na compra")
        return self


class CompraCreate(CompraBase):
    pass


class CompraUpdate(CompraBase):
    pass


class Compra(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:          str
    data_compra: date
    local:       Optional[str] = None
    observacoes: Optional[str] = None
    valor_total: float
    itens:       list[CompraItem]
    created_at:  Optional[str] = None


class GastoInsumo(BaseModel):
    insumo_id: str
    nome:      str
    total:     float


class ResumoCompras(BaseModel):
    mes:             int
    ano:             int
    total:           float
    quantidade:      int
    por_insumo:      list[GastoInsumo]


class PontoHistorico(BaseModel):
    compra_id:         str
    data_compra:       date
    local:             Optional[str]
    quantidade:        float
    tamanho_embalagem: float
    valor_total:       float
    preco_embalagem:   float
    preco_por_medida:  float
    variacao_pct:      Optional[float]   # em relação à compra anterior
