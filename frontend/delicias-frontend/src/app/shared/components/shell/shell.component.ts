import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, NavigationEnd, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { filter } from 'rxjs/operators';

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':  { title: 'Dashboard',       subtitle: 'Visão geral do mês' },
  '/kanban':     { title: 'Kanban',           subtitle: 'Andamento das encomendas' },
  '/encomendas': { title: 'Encomendas',       subtitle: 'Cadastro e gestão de encomendas' },
  '/vendas':     { title: 'Vendas Unitárias', subtitle: 'Vendas avulsas no trabalho' },
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, MatIconModule, MatRippleModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  sidebarCollapsed = false;
  pageTitle = 'Dashboard';
  pageSubtitle = 'Visão geral do mês';

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const meta = PAGE_META[e.urlAfterRedirects] ?? { title: '', subtitle: '' };
        this.pageTitle    = meta.title;
        this.pageSubtitle = meta.subtitle;
      });
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
}
