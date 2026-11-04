import { Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PrecificacaoService, mensagemErro } from '../../core/services/precificacao.service';
import { ConfigPrecificacaoForm } from '../../shared/models/precificacao.model';
import { formatCurrency } from '../../shared/utils/format';

@Component({
  selector: 'app-config-tab',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule,
  ],
  templateUrl: './config-tab.component.html',
  styleUrls: ['./precificacao-shared.scss', './config-tab.component.scss'],
})
export class ConfigTabComponent {
  readonly service = inject(PrecificacaoService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  readonly formatCurrency = formatCurrency;
  salvando = false;

  form = this.fb.group({
    salario_desejado:          [0, [Validators.required, Validators.min(0)]],
    horas_mes:                 [0, [Validators.required, Validators.min(1)]],
    custos_fixos_mes:          [0, [Validators.required, Validators.min(0)]],
    producao_mes:              [0, [Validators.required, Validators.min(1)]],
    lucro_percentual:          [0, [Validators.required, Validators.min(0), Validators.max(80)]],
    taxas_percentual:          [0, [Validators.required, Validators.min(0), Validators.max(50)]],
    desconto_cento_percentual: [0, [Validators.required, Validators.min(0), Validators.max(90)]],
  });

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
  get divisor(): number { return 1 - (this.n('lucro_percentual') + this.n('taxas_percentual')) / 100; }
  get descontoComeLucro(): boolean { return this.n('desconto_cento_percentual') >= this.n('lucro_percentual'); }

  salvar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.divisor <= 0.1) {
      this.snack.open('Lucro + taxas precisa ser menor que 90%.', 'OK', { duration: 4000 });
      return;
    }
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
}
