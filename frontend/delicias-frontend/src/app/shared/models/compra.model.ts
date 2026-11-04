export interface CompraItemForm {
  insumo_id: string;
  quantidade: number;
  tamanho_embalagem: number | null;
  valor_total: number;
}

export interface CompraItem extends CompraItemForm {
  tamanho_embalagem: number;
  preco_embalagem: number;
  preco_por_medida: number;
}

export interface CompraForm {
  data_compra: string;
  local?: string | null;
  observacoes?: string | null;
  itens: CompraItemForm[];
}

export interface Compra {
  id: string;
  data_compra: string;
  local?: string | null;
  observacoes?: string | null;
  valor_total: number;
  itens: CompraItem[];
  created_at?: string;
}

export interface ResumoCompras {
  mes: number;
  ano: number;
  total: number;
  quantidade: number;
  por_insumo: { insumo_id: string; nome: string; total: number }[];
}

export interface PontoHistorico {
  compra_id: string;
  data_compra: string;
  local?: string | null;
  quantidade: number;
  tamanho_embalagem: number;
  valor_total: number;
  preco_embalagem: number;
  preco_por_medida: number;
  variacao_pct: number | null;
}
