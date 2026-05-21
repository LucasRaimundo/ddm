import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { VendaService } from '../../core/services/venda.service';

const PRODUTOS = ['Trufa','Brigadeiro','Pão de Mel','Beijinho','Cajuzinho','Outro'];

@Component({
  selector: 'app-vendas',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
    MatNativeDateModule, MatSnackBarModule,
  ],
  templateUrl: './vendas.component.html',
  styleUrl: './vendas.component.scss',
})
export class VendasComponent {
  readonly PRODUTOS = PRODUTOS;
  showForm   = false;
  editandoId: string | null = null;
  form!: FormGroup;

  constructor(
    private service: VendaService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
  ) {
    this.form = this.fb.group({
      nome_cliente: ['', Validators.required],
      tipo_produto: ['', Validators.required],
      quantidade:   [1, [Validators.required, Validators.min(1)]],
      valor_unit:   [0, [Validators.required, Validators.min(0.01)]],
      data_venda:   [new Date(), Validators.required],
      observacoes:  [''],
    });
  }

  get vendasList() { return this.service.vendas(); }
  get totalMes(): number { return this.vendasList.reduce((s,v) => s + v.valor_total, 0); }
  get valorTotal(): number {
    const q = this.form.get('quantidade')?.value ?? 0;
    const v = this.form.get('valor_unit')?.value  ?? 0;
    return Number(q) * Number(v);
  }

  abrirForm(venda?: any) {
    if (venda) {
      this.editandoId = venda.id;
      this.form.patchValue({ ...venda, data_venda: new Date(venda.data_venda + 'T00:00:00') });
    } else {
      this.editandoId = null;
      this.form.reset({ data_venda: new Date(), quantidade: 1, valor_unit: 0 });
    }
    this.showForm = true;
  }

  fecharForm() { this.showForm = false; this.form.reset(); }

  salvar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.value;
    const payload = {
      nome_cliente: raw.nome_cliente,
      tipo_produto: raw.tipo_produto,
      quantidade:   Number(raw.quantidade),
      valor_unit:   Number(raw.valor_unit),
      data_venda:   (raw.data_venda as Date).toISOString().split('T')[0],
      observacoes:  raw.observacoes ?? '',
    };
    if (this.editandoId) {
      this.service.atualizar(this.editandoId, payload);
      this.snack.open('Venda atualizada!', '', { duration: 2500 });
    } else {
      this.service.criar(payload);
      this.snack.open('Venda cadastrada!', '', { duration: 2500 });
    }
    this.fecharForm();
  }

  excluir(id: string) {
    if (!confirm('Excluir esta venda?')) return;
    this.service.excluir(id);
    this.snack.open('Venda excluída.', '', { duration: 2000 });
  }

  formatDate(d: string): string { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR'); }
  formatCurrency(v: number): string { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
}
