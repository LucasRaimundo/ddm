import { Injectable, signal } from '@angular/core';
import { VendaUnitaria, VendaUnitariaForm } from '../../shared/models/venda.model';

const MOCK: VendaUnitaria[] = [
  { id: '1', nome_cliente: 'Colega Ana', tipo_produto: 'Trufa', quantidade: 5, valor_unit: 4, valor_total: 20, data_venda: '2025-01-08' },
  { id: '2', nome_cliente: 'Colega Carlos', tipo_produto: 'Brigadeiro', quantidade: 3, valor_unit: 3, valor_total: 9, data_venda: '2025-01-10' },
  { id: '3', nome_cliente: 'Colega Bia', tipo_produto: 'Pão de Mel', quantidade: 2, valor_unit: 5, valor_total: 10, data_venda: '2025-01-12' },
];

@Injectable({ providedIn: 'root' })
export class VendaService {
  private _vendas = signal<VendaUnitaria[]>(MOCK);
  readonly vendas = this._vendas.asReadonly();

  getByMes(ano: number, mes: number): VendaUnitaria[] {
    return this._vendas().filter(v => {
      const d = new Date(v.data_venda);
      return d.getFullYear() === ano && d.getMonth() === mes;
    });
  }

  criar(form: VendaUnitariaForm): void {
    const nova: VendaUnitaria = {
      ...form,
      id: crypto.randomUUID(),
      valor_total: form.quantidade * form.valor_unit,
      created_at: new Date().toISOString(),
    };
    this._vendas.update(list => [...list, nova]);
  }

  atualizar(id: string, form: VendaUnitariaForm): void {
    this._vendas.update(list =>
      list.map(v => v.id === id
        ? { ...v, ...form, valor_total: form.quantidade * form.valor_unit }
        : v
      )
    );
  }

  excluir(id: string): void {
    this._vendas.update(list => list.filter(v => v.id !== id));
  }
}
