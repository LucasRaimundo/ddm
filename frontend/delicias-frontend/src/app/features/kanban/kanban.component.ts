import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EncomendaService } from '../../core/services/encomenda.service';
import { Encomenda, StatusEncomenda, STATUS_LABEL, STATUS_TRANSITIONS, STATUS_ACTION_LABEL } from '../../shared/models/encomenda.model';

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './kanban.component.html',
  styleUrl: './kanban.component.scss',
})
export class KanbanComponent {
  readonly STATUS_LABEL        = STATUS_LABEL;
  readonly STATUS_ACTION_LABEL = STATUS_ACTION_LABEL;

  readonly colunas: { status: StatusEncomenda; label: string }[] = [
    { status: 'pendente',    label: 'Pendente'    },
    { status: 'confirmado',  label: 'Confirmado'  },
    { status: 'em_producao', label: 'Em Produção' },
    { status: 'entregue',    label: 'Entregue'    },
    { status: 'cancelado',   label: 'Cancelado'   },
  ];

  constructor(private service: EncomendaService) {}

  get encomendasList() { return this.service.encomendas(); }

  getColuna(status: StatusEncomenda) { return this.encomendasList.filter(e => e.status === status); }

  proximosPassos(e: Encomenda): StatusEncomenda[] { return STATUS_TRANSITIONS[e.status]; }

  avancar(e: Encomenda, novoStatus: StatusEncomenda) {
    if (novoStatus === 'cancelado') {
      if (!confirm(`Cancelar encomenda de ${e.nome_cliente}?`)) return;
    }
    this.service.avancarStatus(e.id, novoStatus);
  }

  isUrgente(dataEntrega: string): boolean {
    const dias = Math.ceil((new Date(dataEntrega).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return dias <= 3 && dias >= 0;
  }

  formatDate(d: string): string { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR'); }
  formatCurrency(v: number): string { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
}
