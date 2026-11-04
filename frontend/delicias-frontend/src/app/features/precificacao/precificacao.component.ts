import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PrecificacaoService } from '../../core/services/precificacao.service';
import { PrecosTabComponent } from './precos-tab.component';
import { InsumosTabComponent } from './insumos-tab.component';
import { ReceitasTabComponent } from './receitas-tab.component';
import { ConfigTabComponent } from './config-tab.component';

@Component({
  selector: 'app-precificacao',
  standalone: true,
  imports: [
    CommonModule, MatTabsModule, MatIconModule, MatButtonModule,
    PrecosTabComponent, InsumosTabComponent, ReceitasTabComponent, ConfigTabComponent,
  ],
  templateUrl: './precificacao.component.html',
  styleUrl: './precificacao.component.scss',
})
export class PrecificacaoComponent implements OnInit {
  readonly service = inject(PrecificacaoService);
  abaAtiva = 0;

  ngOnInit() {
    this.service.carregar();
  }
}
