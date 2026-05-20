import { Component, signal } from '@angular/core';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { EncomendaService } from '../../core/services/encomenda.service';
import { STATUS_LABEL } from '../../shared/models/encomenda.model';

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
  readonly STATUS_LABEL = STATUS_LABEL;
  readonly TIPOS = TIPOS;

  showForm   = signal(false);
  editandoId = signal<string | null>(null);
  encomendas = this.service.encomendas;

  form = this.fb.group({
    nome_cliente:   ['', Validators.required],
    tipo_encomenda: ['', Validators.required],
    valor:          [0, [Validators.required, Validators.min(0.01)]],
    data_pedido:    [new Date(), Validators.required],
    data_entrega:   [null as Date | null, Validators.required],
    observacoes:    [''],
  });

  constructor(
    private service: EncomendaService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
  ) {}

  abrirForm(enc?: any) {
    if (enc) {
      this.editandoId.set(enc.id);
      this.form.patchValue({
        ...enc,
        data_pedido:  new Date(enc.data_pedido + 'T00:00:00'),
        data_entrega: new Date(enc.data_entrega + 'T00:00:00'),
      });
    } else {
      this.editandoId.set(null);
      this.form.reset({ data_pedido: new Date(), valor: 0 });
    }
    this.showForm.set(true);
  }

  fecharForm() { this.showForm.set(false); this.form.reset(); }

  salvar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.value;
    const payload = {
      nome_cliente:   raw.nome_cliente!,
      tipo_encomenda: raw.tipo_encomenda!,
      valor:          Number(raw.valor),
      data_pedido:    this.toISO(raw.data_pedido as Date),
      data_entrega:   this.toISO(raw.data_entrega as Date),
      observacoes:    raw.observacoes ?? '',
    };
    if (this.editandoId()) {
      this.service.atualizar(this.editandoId()!, payload);
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
  formatDate
