import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
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

  showForm   = signal(false);
  editandoId = signal<string | null>(null);
  vendas     = this.service.vendas;

  totalMes = computed(() => this.vendas().reduce((s,v) => s + v.valor_total, 0));

  form = this.fb.group({
    nome_cliente: ['', Validators.required],
    tipo_produto: ['', Validators.required],
    quantidade:   [1, [Validators.required, Validators.min(1)]],
    valor_unit:   [0, [Validators.required, Validators.min(0.01)]],
    data_venda:   [new Date(), Validators.required],
    observacoes:  [''],
  });

  valorTotal = computed(() => {
    const q = this.form.get('quantidade')?.value ?? 0;
    const v = this.form.get('valor_unit')?.value  ?? 0;
    return Number(q) * Number(v);
  });

  constructor(
    private service: VendaService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
  ) {}

  abrirForm(venda?: any) {
    if (venda) {
      this.editandoId.set(venda.id);
      this.form.patchValue({
        ...venda,
        data_venda: new Date(venda.data_venda + 'T00:00:00'),
      });
    } else {
      this.editandoId.set(null);
      this.form.reset({ data_venda: new Date(), quantidade: 1, valor_unit: 0 });
    }
    this.showForm.set(true);
  }

  fecharForm() { this.showForm.set(false); this.form.reset(); }

  salvar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.value;
    const payload = {
      nome_cliente: raw.nome_cliente!,
      tipo_produto: raw.tipo_produto!,
