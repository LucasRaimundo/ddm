export type UnidadeMedida = 'g' | 'ml' | 'un';
export type CategoriaInsumo = 'ingrediente' | 'embalagem';
export type StatusPreco = 'prejuizo' | 'abaixo' | 'ok' | 'sem_preco';

export const UNIDADE_LABEL: Record<UnidadeMedida, string> = {
  g: 'gramas (g)',
  ml: 'mililitros (ml)',
  un: 'unidades',
};

export const STATUS_PRECO_LABEL: Record<StatusPreco, string> = {
  prejuizo: 'Prejuízo',
  abaixo: 'Abaixo do ideal',
  ok: 'Preço saudável',
  sem_preco: 'Sem preço informado',
};

export interface InsumoForm {
  nome: string;
  categoria: CategoriaInsumo;
  unidade: UnidadeMedida;
  preco_embalagem: number;
  quantidade_embalagem: number;
}

export interface Insumo extends InsumoForm {
  id: string;
  created_at?: string;
  updated_at?: string;
  ultima_compra?: string | null;
  variacao_pct?: number | null;
}

export interface ReceitaItem {
  insumo_id: string;
  quantidade: number;
}

export interface ReceitaForm {
  nome: string;
  rendimento: number;
  tempo_preparo_min: number;
  perda_percentual: number;
  preco_venda_unidade: number | null;
  preco_venda_cento: number | null;
  observacoes?: string | null;
  itens: ReceitaItem[];
}

export interface Receita extends ReceitaForm {
  id: string;
  created_at?: string;
}

export interface ConfigPrecificacaoForm {
  salario_desejado: number;
  horas_mes: number;
  custos_fixos_mes: number;
  producao_mes: number;
  lucro_percentual: number;
  taxas_percentual: number;
  desconto_cento_percentual: number;
}

export interface ConfigPrecificacao extends ConfigPrecificacaoForm {
  configurado: boolean;
}

export interface AnalisePrecoAtual {
  preco_atual: number | null;
  preco_sugerido: number;
  lucro_real: number | null;
  margem_real_pct: number | null;
  status: StatusPreco;
}

export interface ItemCusto {
  insumo_id: string;
  nome: string;
  categoria: CategoriaInsumo;
  quantidade: number;
  unidade: UnidadeMedida;
  custo: number;
}

export interface ResultadoPreco {
  receita_id: string;
  nome: string;
  rendimento: number;
  unidades_aproveitadas: number;
  itens: ItemCusto[];
  custo_insumos_receita: number;
  custo_insumos_un: number;
  mao_obra_un: number;
  custos_fixos_un: number;
  custo_total_un: number;
  lucro_un: number;
  taxas_un: number;
  preco_sugerido_un: number;
  preco_sugerido_cento: number;
  analise_unidade: AnalisePrecoAtual;
  analise_cento: AnalisePrecoAtual;
  alertas: string[];
}
