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
import { MatTooltipModule } from '@angular/material/tooltip';
import { EncomendaService } from '../../core/services/encomenda.service';
import { STATUS_LABEL, StatusEncomenda } from '../../shared/models/encomenda.model';

const TIPOS = [
  'Cento de Trufa', 'Cento de Brigadeiro', 'Cento de Pão de Mel',
  'Cento de Beijinho', 'Cento de Cajuzinho', 'Cento Misto', 'Outro',
];

@Component({
  selector: 'app-encomendas',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
    MatNativeDateModule, MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './encomendas.component.html',
  styleUrl: './encomendas.component.scss',
})
export class EncomendasComponent {
  readonly TIPOS = TIPOS;
  showForm   = false;
  editandoId: string | null = null;
  form!: FormGroup;

  constructor(
    private service: EncomendaService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
  ) {
    this.form = this.fb.group({
      nome_cliente:   ['', Validators.required],
      tipo_encomenda: ['', Validators.required],
      valor:          [0, [Validators.required, Validators.min(0.01)]],
      data_pedido:    [new Date(), Validators.required],
      data_entrega:   [null, Validators.required],
      observacoes:    [''],
    });
  }

  get encomendasList() { return this.service.encomendas(); }

  getStatusLabel(status: string): string { return STATUS_LABEL[status as StatusEncomenda] ?? status; }

  abrirForm(enc?: any) {
    if (enc) {
      this.editandoId = enc.id;
      this.form.patchValue({ ...enc, data_pedido: new Date(enc.data_pedido + 'T00:00:00'), data_entrega: new Date(enc.data_entrega + 'T00:00:00') });
    } else {
      this.editandoId = null;
      this.form.reset({ data_pedido: new Date(), valor: 0 });
    }
    this.showForm = true;
  }

  fecharForm() { this.showForm = false; this.form.reset(); }

  salvar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.value;
    const payload = {
      nome_cliente:   raw.nome_cliente,
      tipo_encomenda: raw.tipo_encomenda,
      valor:          Number(raw.valor),
      data_pedido:    this.toISO(raw.data_pedido),
      data_entrega:   this.toISO(raw.data_entrega),
      observacoes:    raw.observacoes ?? '',
    };
    if (this.editandoId) {
      this.service.atualizar(this.editandoId, payload);
      this.snack.open('Encomenda atualizada!', '', { duration: 2500 });
    } else {
      this.service.criar(payload);
      this.snack.open('Encomenda cadastrada!', '', { duration: 2500 });
    }
    this.fecharForm();
  }

  excluir(id: string, nome: string) {
    if (!confirm(`Excluir encomenda de ${nome}?`)) return;
    this.service.excluir(id);
    this.snack.open('Encomenda excluída.', '', { duration: 2000 });
  }

  private toISO(d: Date): string { return d.toISOString().split('T')[0]; }
  formatDate(d: string): string { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR'); }
  formatCurrency(v: number): string { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  isUrgente(dataEntrega: string, status: string): boolean {
    if (['entregue', 'cancelado'].includes(status)) return false;
    const dias = Math.ceil((new Date(dataEntrega).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return dias <= 3 && dias >= 0;
  }
}
