export interface VendaUnitaria {
  id: string;
  nome_cliente: string;
  tipo_produto: string;
  quantidade: number;
  valor_unit: number;
  valor_total: number;
  data_venda: string;
  observacoes?: string;
  created_at?: string;
}

export interface VendaUnitariaForm {
  nome_cliente: string;
  tipo_produto: string;
  quantidade: number;
  valor_unit: number;
  data_venda: string;
  observacoes?: string;
}