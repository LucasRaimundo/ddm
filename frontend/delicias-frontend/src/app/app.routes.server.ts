import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // telas que dependem da API: renderizam só no navegador (não chamam o backend no build)
  { path: 'precificacao', renderMode: RenderMode.Client },
  { path: 'compras',      renderMode: RenderMode.Client },
  { path: 'dashboard',    renderMode: RenderMode.Client },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
