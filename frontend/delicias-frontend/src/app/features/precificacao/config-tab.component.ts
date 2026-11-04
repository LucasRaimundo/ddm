import { Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PrecificacaoService, mensagemErro } from '../../core/services/precificacao.service';
import { CanalVenda, CanalVendaForm, ConfigPrecificacaoForm } from '../../shared/models/precificacao.model';
import { formatCurrency, formatNumber } from '../../shared/utils/format';

/** Atalhos para cadastrar canais comuns (taxas de referência de 2026 — confira no contrato). */
const MODELOS_CANAL: { label: string; canal: Omit<CanalVendaForm, 'ordem'> }[] = [
  { label: 'iFood Entrega (26,5%)', canal: { nome: 'iFood Entrega', taxa_percentual: 26.5, custo_extra_un: 0 } },
  { label: 'iFood Básico (15,2%)',  canal: { nome: 'iFood Básico',  taxa_percentual: 15.2, custo_extra_un: 0 } },
  { label: 'Venda direta (5%)',     canal: { nome: 'Venda direta',  taxa_percentual: 5,    custo_extra_un: 0 } },
];

@Component({
  selector: 'app-config-tab',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './config-tab.component.html',
  styleUrls: ['./precificacao-shared.scss', './config-tab.component.scss'],
})
export class ConfigTabComponent {
  readonly service = inject(PrecificacaoService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  readonly formatCurrency = formatCurrency;
  readonly formatNumber = formatNumber;
  readonly MODELOS_CANAL = MODELOS_CANAL;
  salvando = false;

  form = this.fb.group({
    salario_desejado:          [0, [Validators.required, Validators.min(0)]],
    horas_mes:                 [0, [Validators.required, Validators.min(1)]],
    custos_fixos_mes:          [0, [Validators.required, Validators.min(0)]],
    producao_mes:              [0, [Validators.required, Validators.min(1)]],
    lucro_percentual:          [0, [Validators.required, Validators.min(0), Validators.max(79)]],
    desconto_cento_percentual: [0, [Validators.required, Validators.min(0), Validators.max(90)]],
  });

  // ── canais
  canalForm = this.fb.group({
    nome:            ['', Validators.required],
    taxa_percentual: [0 as number | null, [Validators.required, Validators.min(0), Validators.max(59.99)]],
    custo_extra_un:  [0 as number | null, [Validators.min(0)]],
  });
  editandoCanal: string | 'novo' | null = null;
  salvandoCanal = false;

  constructor() {
    // preenche o formulário quando a config chega do backend
    effect(() => {
      const cfg = this.service.config();
      if (cfg && !this.form.dirty) this.form.reset(cfg);
    });
  }

  private n(campo: keyof ConfigPrecificacaoForm): number {
    return Number(this.form.value[campo]) || 0;
  }

  get valorHora(): number { return this.n('horas_mes') ? this.n('salario_desejado') / this.n('horas_mes') : 0; }
  get fixoPorUnidade(): number { return this.n('producao_mes') ? this.n('custos_fixos_mes') / this.n('producao_mes') : 0; }
  get descontoComeLucro(): boolean { return this.n('desconto_cento_percentual') >= this.n('lucro_percentual'); }

  /** De cada R$ 10 de venda nesse canal, quanto vai para taxa e quanto é lucro. */
  deCadaDez(c: CanalVenda) {
    return { taxa: c.taxa_percentual / 10, lucro: this.n('lucro_percentual') / 10 };
  }

  salvar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.salvando = true;
    this.service.salvarConfig(this.form.getRawValue() as ConfigPrecificacaoForm).subscribe({
      next: () => {
        this.salvando = false;
        this.form.markAsPristine();
        this.snack.open('Configuração salva! Preços recalculados.', '', { duration: 2500 });
      },
      error: (e: HttpErrorResponse) => { this.salvando = false; this.snack.open(mensagemErro(e), 'OK', { duration: 5000 }); },
    });
  }

  // ── canais de venda

  editarCanal(c?: CanalVenda, modelo?: Omit<CanalVendaForm, 'ordem'>) {
    this.editandoCanal = c?.id ?? 'novo';
    this.canalForm.reset(c ?? modelo ?? { nome: '', taxa_percentual: 0, custo_extra_un: 0 });
  }

  cancelarCanal() { this.editandoCanal = null; }

  salvarCanal() {
    if (this.canalForm.invalid) { this.canalForm.markAllAsTouched(); return; }
    const v = this.canalForm.getRawValue();
    const canais = this.service.canais();
    const existente = canais.find(c => c.id === this.editandoCanal);
    const dados: CanalVendaForm = {
      nome: v.nome!.trim(),
      taxa_percentual: Number(v.taxa_percentual) || 0,
      custo_extra_un: Number(v.custo_extra_un) || 0,
      ordem: existente?.ordem ?? Math.max(0, ...canais.map(c => c.ordem)) + 1,
    };
    const req = existente ? this.service.atualizarCanal(existente.id, dados) : this.service.criarCanal(dados);
    this.salvandoCanal = true;
    req.subscribe({
      next: () => {
        this.salvandoCanal = false;
        this.editandoCanal = null;
        this.snack.open('Canal salvo! Preços recalculados.', '', { duration: 2500 });
      },
      error: (e: HttpErrorResponse) => { this.salvandoCanal = false; this.snack.open(mensagemErro(e), 'OK', { duration: 5000 }); },
    });
  }

  excluirCanal(c: CanalVenda) {
    if (!confirm(`Excluir o canal "${c.nome}"?`)) return;
    this.service.excluirCanal(c.id).subscribe({
      next: () => this.snack.open('Canal excluído.', '', { duration: 2000 }),
      error: (e: HttpErrorResponse) => this.snack.open(mensagemErro(e), 'OK', { duration: 5000 }),
    });
  }
}
