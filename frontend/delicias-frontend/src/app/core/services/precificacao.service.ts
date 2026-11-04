import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, forkJoin, tap } from 'rxjs';
import { API_URL } from '../api.config';
import {
  CanalVenda, CanalVendaForm, ConfigPrecificacao, ConfigPrecificacaoForm, Insumo, InsumoForm,
  Receita, ReceitaForm, ResultadoPreco,
} from '../../shared/models/precificacao.model';

@Injectable({ providedIn: 'root' })
export class PrecificacaoService {
  private http = inject(HttpClient);

  private _insumos  = signal<Insumo[]>([]);
  private _receitas = signal<Receita[]>([]);
  private _precos   = signal<ResultadoPreco[]>([]);
  private _config   = signal<ConfigPrecificacao | null>(null);
  private _canais   = signal<CanalVenda[]>([]);
  private _carregando = signal(false);
  private _erro = signal<string | null>(null);

  readonly insumos    = this._insumos.asReadonly();
  readonly receitas   = this._receitas.asReadonly();
  readonly precos     = this._precos.asReadonly();
  readonly config     = this._config.asReadonly();
  readonly canais     = this._canais.asReadonly();
  readonly carregando = this._carregando.asReadonly();
  readonly erro       = this._erro.asReadonly();

  /** Recarrega tudo — chamado ao abrir a tela e depois de cada alteração. */
  carregar(): void {
    this._carregando.set(true);
    forkJoin({
      insumos:  this.http.get<Insumo[]>(`${API_URL}/insumos`),
      receitas: this.http.get<Receita[]>(`${API_URL}/receitas`),
      precos:   this.http.get<ResultadoPreco[]>(`${API_URL}/precificacao`),
      config:   this.http.get<ConfigPrecificacao>(`${API_URL}/precificacao/config`),
      canais:   this.http.get<CanalVenda[]>(`${API_URL}/canais`),
    }).subscribe({
      next: r => {
        this._insumos.set(r.insumos);
        this._receitas.set(r.receitas);
        this._precos.set(r.precos);
        this._config.set(r.config);
        this._canais.set(r.canais);
        this._erro.set(null);
        this._carregando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this._erro.set(e.status === 0
          ? 'Não foi possível conectar ao servidor. O backend está rodando?'
          : mensagemErro(e));
        this._carregando.set(false);
      },
    });
  }

  // ── Insumos
  criarInsumo(f: InsumoForm)              { return this.depois(this.http.post<Insumo>(`${API_URL}/insumos`, f)); }
  atualizarInsumo(id: string, f: InsumoForm) { return this.depois(this.http.put<Insumo>(`${API_URL}/insumos/${id}`, f)); }
  excluirInsumo(id: string)               { return this.depois(this.http.delete<void>(`${API_URL}/insumos/${id}`)); }

  // ── Receitas
  criarReceita(f: ReceitaForm)               { return this.depois(this.http.post<Receita>(`${API_URL}/receitas`, f)); }
  atualizarReceita(id: string, f: ReceitaForm) { return this.depois(this.http.put<Receita>(`${API_URL}/receitas/${id}`, f)); }
  excluirReceita(id: string)                 { return this.depois(this.http.delete<void>(`${API_URL}/receitas/${id}`)); }

  // ── Canais de venda
  criarCanal(f: CanalVendaForm)                { return this.depois(this.http.post<CanalVenda>(`${API_URL}/canais`, f)); }
  atualizarCanal(id: string, f: CanalVendaForm) { return this.depois(this.http.put<CanalVenda>(`${API_URL}/canais/${id}`, f)); }
  excluirCanal(id: string)                     { return this.depois(this.http.delete<void>(`${API_URL}/canais/${id}`)); }

  // ── Configuração
  salvarConfig(f: ConfigPrecificacaoForm) {
    return this.depois(this.http.put<ConfigPrecificacao>(`${API_URL}/precificacao/config`, f));
  }

  /** Depois de qualquer alteração, recalcula os preços. */
  private depois<T>(obs: Observable<T>): Observable<T> {
    return obs.pipe(tap(() => this.carregar()));
  }
}

/** Extrai uma mensagem legível do erro do FastAPI. */
export function mensagemErro(e: HttpErrorResponse): string {
  const d = e.error?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d) && d.length) return d.map((x: any) => x.msg?.replace(/^Value error, /, '')).join(' · ');
  return 'Erro inesperado. Tente de novo.';
}
