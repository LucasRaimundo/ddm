import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CompraService } from '../../core/services/compra.service';
import { PrecificacaoService, mensagemErro } from '../../core/services/precificacao.service';
import { Compra, CompraForm } from '../../shared/models/compra.model';
import { Insumo } from '../../shared/models/precificacao.model';
import { MESES, formatCurrency, formatDate, formatNumber, formatPct, toISODate } from '../../shared/utils/format';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './compras.component.html',
  styleUrl: './compras.component.scss',
})
export class ComprasComponent implements OnInit {
  readonly service = inject(CompraService);
  readonly precificacao = inject(PrecificacaoService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly formatNumber = formatNumber;
  readonly formatPct = formatPct;

  curMonth = new Date().getMonth();
  curYear  = new Date().getFullYear();

  showForm = false;
  editandoId: string | null = null;
  salvando = false;

  form = this.fb.group({
    data_compra: [new Date() as Date | null, Validators.required],
    local:       [''],
    observacoes: [''],
    itens:       this.fb.array<FormGroup>([]),
  });

  get itens(): FormArray<FormGroup> { return this.form.controls.itens; }
  get monthLabel(): string { return `${MESES[this.curMonth]} ${this.curYear}`; }

  ngOnInit() {
    this.carregar();
    if (this.precificacao.insumos().length === 0) this.precificacao.carregar();
  }

  carregar() { this.service.carregarMes(this.curMonth + 1, this.curYear); }

  changeMonth(dir: number) {
    this.curMonth += dir;
    if (this.curMonth < 0)  { this.curMonth = 11; this.curYear--; }
    if (this.curMonth > 11) { this.curMonth = 0;  this.curYear++; }
    this.carregar();
  }

  // ───── itens do formulário

  private novoItem(v?: { insumo_id: string; quantidade: number; tamanho_embalagem: number; valor_total: number }): FormGroup {
    const g = this.fb.group({
      insumo_id:         [v?.insumo_id ?? null, Validators.required],
      quantidade:        [v?.quantidade ?? 1, [Validators.required, Validators.min(0.001)]],
      tamanho_embalagem: [v?.tamanho_embalagem ?? null, [Validators.required, Validators.min(0.001)]],
      valor_total:       [v?.valor_total ?? null, [Validators.required, Validators.min(0.01)]],
    });
    // ao escolher o insumo, sugere o tamanho de embalagem que já está cadastrado
    g.controls.insumo_id.valueChanges.subscribe(id => {
      const ins = this.insumo(id);
      if (ins) g.controls.tamanho_embalagem.setValue(ins.quantidade_embalagem);
    });
    return g;
  }

  adicionarItem() { this.itens.push(this.novoItem()); }
  removerItem(i: number) { this.itens.removeAt(i); }

  insumo(id: string | null | undefined): Insumo | undefined {
    return this.precificacao.insumos().find(i => i.id === id);
  }

  insumosDisponiveis(linha: number): Insumo[] {
    const usados = this.itens.controls.filter((_, i) => i !== linha).map(c => c.value.insumo_id);
    return this.precificacao.insumos().filter(i => !usados.includes(i.id));
  }

  precoEmbalagem(l: FormGroup): number | null {
    const { quantidade: q, valor_total: v } = l.value;
    return q > 0 && v > 0 ? v / q : null;
  }

  /** Variação do preço desta compra vs o preço atual do insumo. */
  variacao(l: FormGroup): number | null {
    const ins = this.insumo(l.value.insumo_id);
    const pe = this.precoEmbalagem(l);
    const tam = Number(l.value.tamanho_embalagem);
    if (!ins || !pe || !tam) return null;
    const novo  = pe / tam;
    const atual = ins.preco_embalagem / ins.quantidade_embalagem;
    return Math.round((novo / atual - 1) * 1000) / 10;
  }

  get totalForm(): number {
    return this.itens.controls.reduce((s, c) => s + (Number(c.value.valor_total) || 0), 0);
  }

  // ───── lista

  resumoItens(c: Compra): string {
    return c.itens
      .map(i => `${this.insumo(i.insumo_id)?.nome ?? '?'} ×${formatNumber(i.quantidade, 2)}`)
      .join(' · ');
  }

  pctDoTotal(valor: number): number {
    const total = this.service.resumo()?.total || 1;
    return (valor / total) * 100;
  }

  // ───── ações

  abrirForm(c?: Compra) {
    this.editandoId = c?.id ?? null;
    this.itens.clear();
    if (c) {
      this.form.reset({ data_compra: new Date(c.data_compra + 'T00:00:00'), local: c.local ?? '', observacoes: c.observacoes ?? '' });
      c.itens.forEach(i => this.itens.push(this.novoItem(i)));
    } else {
      this.form.reset({ data_compra: new Date(), local: '', observacoes: '' });
      this.adicionarItem();
    }
    this.showForm = true;
  }

  fecharForm() { this.showForm = false; }

  salvar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const dados: CompraForm = {
      data_compra: toISODate(v.data_compra!),
      local:       v.local || null,
      observacoes: v.observacoes || null,
      itens: v.itens.map((i: any) => ({
        insumo_id:         i.insumo_id,
        quantidade:        Number(i.quantidade),
        tamanho_embalagem: Number(i.tamanho_embalagem),
        valor_total:       Number(i.valor_total),
      })),
    };
    const req = this.editandoId ? this.service.atualizar(this.editandoId, dados) : this.service.criar(dados);
    this.salvando = true;
    req.subscribe({
      next: () => {
        this.salvando = false;
        this.fecharForm();
        this.snack.open('Compra registrada! Preços dos insumos atualizados.', '', { duration: 3000 });
      },
      error: (e: HttpErrorResponse) => { this.salvando = false; this.snack.open(mensagemErro(e), 'OK', { duration: 5000 }); },
    });
  }

  excluir(c: Compra) {
    if (!confirm(`Excluir a compra de ${formatDate(c.data_compra)} (${formatCurrency(c.valor_total)})?`)) return;
    this.service.excluir(c.id).subscribe({
      next: () => this.snack.open('Compra excluída.', '', { duration: 2000 }),
      error: (e: HttpErrorResponse) => this.snack.open(mensagemErro(e), 'OK', { duration: 5000 }),
    });
  }
}
