import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PrecificacaoService, mensagemErro } from '../../core/services/precificacao.service';
import { Insumo, Receita, ReceitaForm } from '../../shared/models/precificacao.model';
import { formatCurrency } from '../../shared/utils/format';

@Component({
  selector: 'app-receitas-tab',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './receitas-tab.component.html',
  styleUrls: ['./precificacao-shared.scss', './receitas-tab.component.scss'],
})
export class ReceitasTabComponent {
  @Output() irPara = new EventEmitter<number>();

  readonly service = inject(PrecificacaoService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  readonly formatCurrency = formatCurrency;

  showForm = false;
  editandoId: string | null = null;
  salvando = false;

  form = this.fb.group({
    nome:                ['', Validators.required],
    rendimento:          [null as number | null, [Validators.required, Validators.min(1)]],
    tempo_preparo_min:   [null as number | null, [Validators.required, Validators.min(0)]],
    perda_percentual:    [5, [Validators.required, Validators.min(0), Validators.max(99)]],
    preco_venda_unidade: [null as number | null, Validators.min(0.01)],
    preco_venda_cento:   [null as number | null, Validators.min(0.01)],
    observacoes:         [''],
    itens:               this.fb.array<FormGroup>([]),
  });

  get itens(): FormArray<FormGroup> { return this.form.controls.itens; }

  private novoItem(insumo_id: string | null = null, quantidade: number | null = null): FormGroup {
    return this.fb.group({
      insumo_id:  [insumo_id, Validators.required],
      quantidade: [quantidade, [Validators.required, Validators.min(0.001)]],
    });
  }

  adicionarItem() { this.itens.push(this.novoItem()); }
  removerItem(i: number) { this.itens.removeAt(i); }

  insumo(id: string | null): Insumo | undefined {
    return this.service.insumos().find(i => i.id === id);
  }

  /** Insumos que ainda não estão em outra linha da receita. */
  insumosDisponiveis(linha: number): Insumo[] {
    const usados = this.itens.controls
      .filter((_, idx) => idx !== linha)
      .map(c => c.value.insumo_id);
    return this.service.insumos().filter(i => !usados.includes(i.id));
  }

  custoItem(linha: FormGroup): number {
    const ins = this.insumo(linha.value.insumo_id);
    const q = Number(linha.value.quantidade) || 0;
    return ins ? q * ins.preco_embalagem / ins.quantidade_embalagem : 0;
  }

  get custoTotalPreview(): number {
    return this.itens.controls.reduce((s, c) => s + this.custoItem(c), 0);
  }

  get custoUnidadePreview(): number | null {
    const { rendimento, perda_percentual } = this.form.value;
    if (!rendimento) return null;
    const aproveitadas = rendimento * (1 - (perda_percentual ?? 0) / 100);
    return aproveitadas > 0 ? this.custoTotalPreview / aproveitadas : null;
  }

  resumoItens(r: Receita): string {
    return r.itens.map(i => this.insumo(i.insumo_id)?.nome ?? '?').join(', ') || 'sem ingredientes';
  }

  abrirForm(r?: Receita) {
    this.editandoId = r?.id ?? null;
    this.itens.clear();
    if (r) {
      this.form.reset({ ...r, observacoes: r.observacoes ?? '' });
      r.itens.forEach(i => this.itens.push(this.novoItem(i.insumo_id, i.quantidade)));
    } else {
      this.form.reset({ perda_percentual: 5, observacoes: '' });
      this.adicionarItem();
    }
    this.showForm = true;
  }

  fecharForm() { this.showForm = false; }

  salvar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const dados: ReceitaForm = {
      nome:                v.nome!,
      rendimento:          Number(v.rendimento),
      tempo_preparo_min:   Number(v.tempo_preparo_min),
      perda_percentual:    Number(v.perda_percentual),
      preco_venda_unidade: v.preco_venda_unidade || null,
      preco_venda_cento:   v.preco_venda_cento || null,
      observacoes:         v.observacoes || null,
      itens: v.itens.map((i: any) => ({ insumo_id: i.insumo_id, quantidade: Number(i.quantidade) })),
    };
    const req = this.editandoId
      ? this.service.atualizarReceita(this.editandoId, dados)
      : this.service.criarReceita(dados);
    this.salvando = true;
    req.subscribe({
      next: () => {
        this.salvando = false;
        this.fecharForm();
        const ref = this.snack.open('Receita salva!', 'Ver preço', { duration: 4000 });
        ref.onAction().subscribe(() => this.irPara.emit(0));
      },
      error: (e: HttpErrorResponse) => { this.salvando = false; this.snack.open(mensagemErro(e), 'OK', { duration: 5000 }); },
    });
  }

  excluir(r: Receita) {
    if (!confirm(`Excluir a receita "${r.nome}"?`)) return;
    this.service.excluirReceita(r.id).subscribe({
      next: () => this.snack.open('Receita excluída.', '', { duration: 2000 }),
      error: (e: HttpErrorResponse) => this.snack.open(mensagemErro(e), 'OK', { duration: 5000 }),
    });
  }
}
