from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


# ───────────────────────── Insumos ─────────────────────────

class UnidadeMedida(str, Enum):
    g  = "g"
    ml = "ml"
    un = "un"


class CategoriaInsumo(str, Enum):
    ingrediente = "ingrediente"
    embalagem   = "embalagem"


class InsumoBase(BaseModel):
    nome:                 str = Field(min_length=1)
    categoria:            CategoriaInsumo = CategoriaInsumo.ingrediente
    unidade:              UnidadeMedida
    preco_embalagem:      float = Field(gt=0, description="Quanto pagou pela embalagem (R$)")
    quantidade_embalagem: float = Field(gt=0, description="Quanto vem na embalagem, na unidade escolhida")


class InsumoCreate(InsumoBase):
    pass


class InsumoUpdate(InsumoBase):
    pass


class Insumo(InsumoBase):
    model_config = ConfigDict(from_attributes=True)

    id:         str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ───────────────────────── Receitas ─────────────────────────

class ReceitaItem(BaseModel):
    insumo_id:  str
    quantidade: float = Field(gt=0, description="Quantidade usada na receita inteira, na unidade do insumo")


class ReceitaBase(BaseModel):
    nome:                str = Field(min_length=1)
    rendimento:          int = Field(gt=0, description="Unidades que a receita rende")
    tempo_preparo_min:   int = Field(ge=0, description="Tempo total de trabalho (cozinhar, enrolar, embalar)")
    perda_percentual:    float = Field(5, ge=0, lt=100)
    preco_venda_unidade: Optional[float] = Field(None, gt=0, description="Preço praticado hoje na unidade")
    preco_venda_cento:   Optional[float] = Field(None, gt=0, description="Preço praticado hoje no cento")
    observacoes:         Optional[str] = None
    itens:               list[ReceitaItem] = Field(default_factory=list)

    @model_validator(mode="after")
    def validar_itens(self):
        ids = [i.insumo_id for i in self.itens]
        if len(ids) != len(set(ids)):
            raise ValueError("O mesmo insumo aparece mais de uma vez na receita")
        return self


class ReceitaCreate(ReceitaBase):
    pass


class ReceitaUpdate(ReceitaBase):
    pass


class Receita(ReceitaBase):
    model_config = ConfigDict(from_attributes=True)

    id:         str
    created_at: Optional[str] = None


# ───────────────────────── Configuração ─────────────────────────

class ConfigPrecificacaoBase(BaseModel):
    salario_desejado:     float = Field(2000, ge=0, description="Quanto ela quer tirar por mês (R$)")
    horas_mes:            float = Field(120, gt=0, description="Horas trabalhadas na produção por mês")
    custos_fixos_mes:     float = Field(300, ge=0, description="Gás, luz, água, internet, DAS MEI, anúncios...")
    producao_mes:         int   = Field(2000, gt=0, description="Unidades produzidas por mês (média)")
    lucro_percentual:     float = Field(15, ge=0, lt=100)
    taxas_percentual:     float = Field(5, ge=0, lt=100, description="Maquininha, apps de entrega...")
    desconto_cento_percentual: float = Field(10, ge=0, lt=100)

    @model_validator(mode="after")
    def validar_percentuais(self):
        if self.lucro_percentual + self.taxas_percentual >= 90:
            raise ValueError("Lucro + taxas precisa ser menor que 90%")
        return self


class ConfigPrecificacao(ConfigPrecificacaoBase):
    configurado: bool = False


# ───────────────────────── Resultado do cálculo ─────────────────────────

class StatusPreco(str, Enum):
    prejuizo  = "prejuizo"   # nem cobre o custo
    abaixo    = "abaixo"     # cobre o custo, mas lucra menos que o desejado
    ok        = "ok"
    sem_preco = "sem_preco"  # preço atual não informado


class AnalisePrecoAtual(BaseModel):
    preco_atual:        Optional[float]
    preco_sugerido:     float
    lucro_real:         Optional[float]       # R$ que sobra de verdade
    margem_real_pct:    Optional[float]       # % do preço que é lucro
    status:             StatusPreco


class ItemCusto(BaseModel):
    insumo_id:  str
    nome:       str
    categoria:  CategoriaInsumo
    quantidade: float
    unidade:    UnidadeMedida
    custo:      float


class ResultadoPreco(BaseModel):
    receita_id:            str
    nome:                  str
    rendimento:            int
    unidades_aproveitadas: float
    itens:                 list[ItemCusto]
    custo_insumos_receita: float
    custo_insumos_un:      float
    mao_obra_un:           float
    custos_fixos_un:       float
    custo_total_un:        float
    lucro_un:              float
    taxas_un:              float
    preco_sugerido_un:     float
    preco_sugerido_cento:  float
    analise_unidade:       AnalisePrecoAtual
    analise_cento:         AnalisePrecoAtual
    alertas:               list[str]
