export type StatusEncomenda =
  | 'pendente'
  | 'confirmado'
  | 'em_producao'
  | 'entregue'
  | 'cancelado';

export const STATUS_LABEL: Record<StatusEncomenda, string> = {
  pendente:    'Pendente',
  confirmado:  'Confirmado',
  em_producao: 'Em Produção',
  entregue:    'Entregue',
  cancelado:   'Cancelado',
};

export const STATUS_TRANSITIONS: Record<StatusEncomenda, StatusEncomenda[]> = {
  pendente:    ['confirmado', 'cancelado'],
  confirmado:  ['em_producao', 'cancelado'],
  em_producao: ['entregue'],
  entregue:    [],
  cancelado:   [],
};

export const STATUS_ACTION_LABEL: Partial<Record<StatusEncomenda, string>> = {
  confirmado:  'Confirmar',
  em_producao: 'Iniciar Produção',
  entregue:    'Marcar Entregue',
  cancelado:   'Cancelar',
};

export interface Encomenda {
  id: string;
  nome_cliente: string;
  tipo_encomenda: string;
  valor: number;
  data_pedido: string;
  data_entrega: string;
  observacoes?: string;
  status: StatusEncomenda;
  created_at?: string;
}

export interface EncomendaForm {
  nome_cliente: string;
  tipo_encomenda: string;
  valor: number;
  data_pedido: string;
  data_entrega: string;
  observacoes?: string;
}
