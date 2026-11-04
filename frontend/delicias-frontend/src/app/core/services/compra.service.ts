import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, forkJoin, tap } from 'rxjs';
import { API_URL } from '../api.config';
import { Compra, CompraForm, PontoHistorico, ResumoCompras } from '../../shared/models/compra.model';
import { PrecificacaoService, mensagemErro } from './precificacao.service';

@Injectable({ providedIn: 'root' })
export class CompraService {
  private http = inject(HttpClient);
  private precificacao = inject(PrecificacaoService);

  private _compras = signal<Compra[]>([]);
  private _resumo  = signal<ResumoCompras | null>(null);
  private _erro    = signal<string | null>(null);
  private _carregando = signal(false);
  private mesAtual = { mes: new Date().getMonth() + 1, ano: new Date().getFullYear() };

  readonly compras    = this._compras.asReadonly();
  readonly resumo     = this._resumo.asReadonly();
  readonly erro       = this._erro.asReadonly();
  readonly carregando = this._carregando.asReadonly();

  /** mes: 1-12 */
  carregarMes(mes: number, ano: number): void {
    this.mesAtual = { mes, ano };
    this._carregando.set(true);
    forkJoin({
      compras: this.http.get<Compra[]>(`${API_URL}/compras`, { params: { mes, ano } }),
      resumo:  this.http.get<ResumoCompras>(`${API_URL}/compras/resumo`, { params: { mes, ano } }),
    }).subscribe({
      next: r => {
        this._compras.set(r.compras);
        this._resumo.set(r.resumo);
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

  /** Só o resumo (usado no dashboard). */
  resumoDoMes(mes: number, ano: number): Observable<ResumoCompras> {
    return this.http.get<ResumoCompras>(`${API_URL}/compras/resumo`, { params: { mes, ano } });
  }

  historico(insumoId: string): Observable<PontoHistorico[]> {
    return this.http.get<PontoHistorico[]>(`${API_URL}/insumos/${insumoId}/historico`);
  }

  criar(f: CompraForm)               { return this.depois(this.http.post<Compra>(`${API_URL}/compras`, f)); }
  atualizar(id: string, f: CompraForm) { return this.depois(this.http.put<Compra>(`${API_URL}/compras/${id}`, f)); }
  excluir(id: string)                { return this.depois(this.http.delete<void>(`${API_URL}/compras/${id}`)); }

  /** Compra mexe no preço dos insumos → recarrega compras do mês e a precificação. */
  private depois<T>(obs: Observable<T>): Observable<T> {
    return obs.pipe(tap(() => {
      this.carregarMes(this.mesAtual.mes, this.mesAtual.ano);
      this.precificacao.carregar();
    }));
  }
}
