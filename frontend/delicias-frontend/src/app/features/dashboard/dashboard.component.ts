import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EncomendaService } from '../../core/services/encomenda.service';
import { VendaService } from '../../core/services/venda.service';
import { STATUS_LABEL, StatusEncomenda } from '../../shared/models/encomenda.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  readonly STATUS_LABEL = STATUS_LABEL;
  readonly PRODUTO_CORES = ['#D4537E','#FAC775','#854F0B','#e8ddd5'];

  months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
            'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  curMonth = new Date().getMonth();
  curYear  = new Date().getFullYear();

  constructor(private encService: EncomendaService, private vendaService: VendaService) {}

  get monthLabel(): string { return `${this.months[this.curMonth]} ${this.curYear}`; }
  get encomendas() { return this.encService.getByMes(this.curYear, this.curMonth); }
  get vendasUnit() { return this.vendaService.getByMes(this.curYear, this.curMonth); }

  get totalReceita(): number {
    const enc  = this.encomendas.filter(e => e.status !== 'cancelado').reduce((s,e) => s + e.valor, 0);
    const unit = this.vendasUnit.reduce((s,v) => s + v.valor_total, 0);
    return enc + unit;
  }

  get ticketMedio(): number {
    const enc = this.encomendas.filter(e => e.status !== 'cancelado');
    return enc.length ? enc.reduce((s,e) => s + e.valor, 0) / enc.length : 0;
  }

  get receitaSemanas() {
    const semanas = [
      { label: 'S1', dias: [1,7]   },
      { label: 'S2', dias: [8,14]  },
      { label: 'S3', dias: [15,21] },
      { label: 'S4', dias: [22,31] },
    ];
    return semanas.map(s => {
      const enc = this.encomendas
        .filter(e => { const d = new Date(e.data_entrega).getDate(); return d >= s.dias[0] && d <= s.dias[1] && e.status !== 'cancelado'; })
        .reduce((sum,e) => sum + e.valor, 0);
      const unit = this.vendasUnit
        .filter(v => { const d = new Date(v.data_venda).getDate(); return d >= s.dias[0] && d <= s.dias[1]; })
        .reduce((sum,v) => sum + v.valor_total, 0);
      return { label: s.label, enc, unit };
    });
  }

  get maxSemana(): number { return Math.max(...this.receitaSemanas.map(s => s.enc + s.unit), 1); }

  get topProdutos() {
    const contagem: Record<string, number> = {};
    this.encomendas.forEach(e => { contagem[e.tipo_encomenda] = (contagem[e.tipo_encomenda] || 0) + 1; });
    const total = Object.values(contagem).reduce((s,v) => s + v, 0) || 1;
    return Object.entries(contagem).sort((a,b) => b[1] - a[1]).slice(0,4)
      .map(([tipo, qtd]) => ({ tipo, pct: Math.round((qtd/total)*100) }));
  }

  get encRecentes() {
    return [...this.encomendas]
      .sort((a,b) => new Date(b.data_pedido).getTime() - new Date(a.data_pedido).getTime())
      .slice(0,5);
  }

  get kanbanResumo() {
    const enc = this.encomendas;
    return {
      pendente:    enc.filter(e => e.status === 'pendente').length,
      confirmado:  enc.filter(e => e.status === 'confirmado').length,
      em_producao: enc.filter(e => e.status === 'em_producao').length,
      entregue:    enc.filter(e => e.status === 'entregue').length,
    };
  }

  getStatusLabel(status: string): string { return STATUS_LABEL[status as StatusEncomenda] ?? status; }

  changeMonth(dir: number) {
    this.curMonth += dir;
    if (this.curMonth < 0)  { this.curMonth = 11; this.curYear--; }
    if (this.curMonth > 11) { this.curMonth = 0;  this.curYear++; }
  }

  barHeight(val: number, max: number): number { return Math.round((val / max) * 110); }

  isUrgente(dataEntrega: string): boolean {
    const dias = Math.ceil((new Date(dataEntrega).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return dias <= 3 && dias >= 0;
  }

  formatCurrency(v: number): string { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  formatDate(d: string): string { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR'); }
}
