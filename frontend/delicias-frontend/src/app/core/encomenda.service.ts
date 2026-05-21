import { Injectable, signal } from '@angular/core';
import { Encomenda, EncomendaForm, StatusEncomenda, STATUS_TRANSITIONS } from '../../shared/models/encomenda.model';

const MOCK: Encomenda[] = [
  {
    id: '1', nome_cliente: 'Ana Lima', tipo_encomenda: 'Cento de Trufa',
    valor: 150, data_pedido: '2025-01-10', data_entrega: '2025-01-20',
    status: 'em_producao', observacoes: 'Trufa de morango'
  },
  {
    id: '2', nome_cliente: 'João Silva', tipo_encomenda: 'Cento de Pão de Mel',
    valor: 120, data_pedido: '2025-01-12', data_entrega: '2025-01-22',
    status: 'confirmado'
  },
  {
    id: '3', nome_cliente: 'Carla Ramos', tipo_encomenda: 'Cento de Brigadeiro',
    valor: 100, data_pedido: '2025-01-14', data_entrega: '2025-01-18',
    status: 'pendente'
  },
  {
    id: '4', nome_cliente: 'Maria Costa', tipo_encomenda: 'Cento de Trufa',
    valor: 150, data_pedido: '2025-01-05', data_entrega: '2025-01-15',
    status: 'entregue'
  },
  {
    id: '5', nome_cliente: 'Pedro Alves', tipo_encomenda: 'Cento de Trufa',
    valor: 150, data_pedido: '2025-01-03', data_entrega: '2025-01-10',
    status: 'cancelado'
  },
];

@Injectable({ providedIn: 'root' })
export class EncomendaService {
  private _encomendas = signal<Encomenda[]>(MOCK);
  readonly encomendas = this._encomendas.asReadonly();

  getByMes(ano: number, mes: number): Encomenda[] {
    return this._encomendas().filter(e => {
      const d = new Date(e.data_pedido);
      return d.getFullYear() === ano && d.getMonth() === mes;
    });
  }

  criar(form: EncomendaForm): void {
    const nova: Encomenda = {
      ...form,
      id: crypto.randomUUID(),
      status: 'pendente',
      created_at: new Date().toISOString(),
    };
    this._encomendas.update(list => [...list, nova]);
  }

  atualizar(id: string, form: EncomendaForm): void {
    this._encomendas.update(list =>
      list.map(e => e.id === id ? { ...e, ...form } : e)
    );
  }

  avancarStatus(id: string, novoStatus: StatusEncomenda): void {
    this._encomendas.update(list =>
      list.map(e => {
        if (e.id !== id) return e;
        const validos = STATUS_TRANSITIONS[e.status];
        if (!validos.includes(novoStatus)) {
          console.warn(`Transição inválida: ${e.status} → ${novoStatus}`);
          return e;
        }
        return { ...e, status: novoStatus };
      })
    );
  }

  excluir(id: string): void {
    this._encomendas.update(list => list.filter(e => e.id !== id));
  }
}
