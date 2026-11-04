import { Routes } from '@angular/router';
import { ShellComponent } from './shared/components/shell/shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'kanban',
        loadComponent: () => import('./features/kanban/kanban.component').then(m => m.KanbanComponent)
      },
      {
        path: 'encomendas',
        loadComponent: () => import('./features/encomendas/encomendas.component').then(m => m.EncomendasComponent)
      },
      {
        path: 'vendas',
        loadComponent: () => import('./features/vendas/vendas.component').then(m => m.VendasComponent)
      },
      {
        path: 'compras',
        loadComponent: () => import('./features/compras/compras.component').then(m => m.ComprasComponent)
      },
      {
        path: 'precificacao',
        loadComponent: () => import('./features/precificacao/precificacao.component').then(m => m.PrecificacaoComponent)
      },
    ]
  },
  { path: '**', redirectTo: '' }
];
