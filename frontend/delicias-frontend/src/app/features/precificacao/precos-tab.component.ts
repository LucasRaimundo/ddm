import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PrecificacaoService } from '../../core/services/precificacao.service';
import { AnalisePrecoAtual, ResultadoPreco, STATUS_PRECO_LABEL } from '../../shared/models/precificacao.model';
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

  fatias(p: ResultadoPreco): Fatia[] {
    return [
      { label: 'Ingredientes e embalagem', valor: p.custo_insumos_un, classe: 'insumos' },
      { label: 'Seu trabalho',             valor: p.mao_obra_un,      classe: 'mao' },
      { label: 'Custos fixos',             valor: p.custos_fixos_un,  classe: 'fixos' },
      { label: 'Taxas',                    valor: p.taxas_un,         classe: 'taxas' },
      { label: 'Lucro',                    valor: p.lucro_un,         classe: 'lucro' },
    ];
  }

  pct(valor: number, p: ResultadoPreco): number {
    return p.preco_sugerido_un ? (valor / p.preco_sugerido_un) * 100 : 0;
  }

  mensagem(a: AnalisePrecoAtual): string {
    if (a.status === 'sem_preco') return 'Informe o preço atual na receita para comparar.';
    const lucro = formatCurrency(a.lucro_real);
    const margem = a.margem_real_pct?.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    if (a.status === 'prejuizo') return `Você perde ${formatCurrency(Math.abs(a.lucro_real!))} a cada venda.`;
    return `Sobra ${lucro} de lucro (${margem}% do preço), já pagando seu trabalho.`;
  }

  alternar(id: string) {
    this.abertos.has(id) ? this.abertos.delete(id) : this.abertos.add(id);
  }
}
