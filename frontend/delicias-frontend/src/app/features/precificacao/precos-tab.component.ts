import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PrecificacaoService } from '../../core/services/precificacao.service';
import { AnalisePrecoAtual, PrecoCanal, ResultadoPreco, STATUS_PRECO_LABEL } from '../../shared/models/precificacao.model';
import { formatCurrency, formatNumber } from '../../shared/utils/format';

interface Fatia { label: string; valor: number; classe: string; }

@Component({
  selector: 'app-precos-tab',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './precos-tab.component.html',
  styleUrls: ['./precificacao-shared.scss', './precos-tab.component.scss'],
})
export class PrecosTabComponent {
  @Output() irPara = new EventEmitter<number>();

  readonly service = inject(PrecificacaoService);
  readonly formatCurrency = formatCurrency;
  readonly formatNumber = formatNumber;
  readonly STATUS_PRECO_LABEL = STATUS_PRECO_LABEL;
  abertos = new Set<string>();

  /** De onde vem cada centavo do preço da unidade, nesse canal. */
  fatias(p: ResultadoPreco, c: PrecoCanal): Fatia[] {
    const fatias: Fatia[] = [
      { label: 'Ingredientes e embalagem', valor: p.custo_insumos_un, classe: 'insumos' },
      { label: 'Seu trabalho',             valor: p.mao_obra_un,      classe: 'mao' },
      { label: 'Custos fixos',             valor: p.custos_fixos_un,  classe: 'fixos' },
    ];
    if (c.custo_extra_un) fatias.push({ label: 'Custo extra do canal', valor: c.custo_extra_un, classe: 'extra' });
    fatias.push(
      { label: 'Taxa do canal', valor: c.taxas_un, classe: 'taxas' },
      { label: 'Lucro',         valor: c.lucro_un, classe: 'lucro' },
    );
    return fatias;
  }

  pct(valor: number, c: PrecoCanal): number {
    return c.preco_sugerido_un ? (valor / c.preco_sugerido_un) * 100 : 0;
  }

  analises(c: PrecoCanal) {
    return [
      { titulo: 'Unidade', analise: c.analise_unidade },
      { titulo: 'Cento',   analise: c.analise_cento },
    ].filter(a => a.analise.status !== 'sem_preco');
  }

  mensagem(a: AnalisePrecoAtual): string {
    const margem = a.margem_real_pct?.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    if (a.status === 'prejuizo') return `você perde ${formatCurrency(Math.abs(a.lucro_real!))} a cada venda`;
    return `sobra ${formatCurrency(a.lucro_real)} de lucro (${margem}% do preço)`;
  }

  alternar(id: string) {
    this.abertos.has(id) ? this.abertos.delete(id) : this.abertos.add(id);
  }
}
