export interface DashboardResumo {
  total_receita: number;
  total_encomendas: number;
  total_unitarias: number;
  ticket_medio: number;
  receita_por_semana: { label: string; encomendas: number; unitarias: number }[];
  top_produtos: { tipo: string; percentual: number }[];
  encomendas_recentes: {
    id: string;
    nome_cliente: string;
    tipo_encomenda: string;
    data_entrega: string;
    status: string;
    valor: number;
  }[];
  kanban_resumo: {
    pendente: number;
    confirmado: number;
    em_producao: number;
    entregue: number;
  };
}
