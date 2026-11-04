import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PrecificacaoService, mensagemErro } from '../../core/services/precificacao.service';
import { Insumo, InsumoForm, UNIDADE_LABEL, UnidadeMedida } from '../../shared/models/precificacao.model';
import { formatCurrency } from '../../shared/utils/format';

@Component({
  selector: 'app-insumos-tab',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './insumos-tab.component.html',
  styleUrl: './precificacao-shared.scss',
})
export class InsumosTabComponent {
  readonly service = inject(PrecificacaoService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  readonly UNIDADE_LABEL = UNIDADE_LABEL;
  readonly unidades = Object.keys(UNIDADE_LABEL) as UnidadeMedida[];
  readonly formatCurrency = formatCurrency;

  showForm = false;
  editandoId: string | null = null;
  salvando = false;

  form = this.fb.group({
    nome:                 ['', Validators.required],
    categoria:            ['ingrediente', Validators.required],
    unidade:              ['g', Validators.required],
    preco_embalagem:      [null as number | null, [Validators.required, Validators.min(0.01)]],
    quantidade_embalagem: [null as number | null, [Validators.required, Validators.min(0.001)]],
  });

  get custoPreview(): number | null {
    const { preco_embalagem: p, quantidade_embalagem: q } = this.form.value;
    return p && q ? p / q : null;
  }

  get unidadeAtual(): string { return this.form.value.unidade ?? 'g'; }

  custoPorMedida(i: Insumo): number { return i.preco_embalagem / i.quantidade_embalagem; }

  abrirForm(insumo?: Insumo) {
    this.editandoId = insumo?.id ?? null;
    this.form.reset(insumo ?? { categoria: 'ingrediente', unidade: 'g' });
    this.showForm = true;
  }

  fecharForm() { this.showForm = false; }

  salvar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const dados = this.form.getRawValue() as unknown as InsumoForm;
    const req = this.editandoId
      ? this.service.atualizarInsumo(this.editandoId, dados)
      : this.service.criarInsumo(dados);
    this.salvando = true;
    req.subscribe({
      next: () => {
        this.snack.open(this.editandoId ? 'Insumo atualizado! Preços recalculados.' : 'Insumo cadastrado!', '', { duration: 2500 });
        this.salvando = false;
        this.fecharForm();
      },
      error: (e: HttpErrorResponse) => { this.salvando = false; this.snack.open(mensagemErro(e), 'OK', { duration: 5000 }); },
    });
  }

  excluir(i: Insumo) {
    if (!confirm(`Excluir o insumo "${i.nome}"?`)) return;
    this.service.excluirInsumo(i.id).subscribe({
      next: () => this.snack.open('Insumo excluído.', '', { duration: 2000 }),
      error: (e: HttpErrorResponse) => this.snack.open(mensagemErro(e), 'OK', { duration: 5000 }),
    });
  }
}
