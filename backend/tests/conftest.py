import os
import uuid
from types import SimpleNamespace

import pytest

os.environ.setdefault("SUPABASE_URL", "http://fake")
os.environ.setdefault("SUPABASE_KEY", "fake")


class _Query:
    """Imita o query builder do supabase-py, guardando tudo em memória."""

    def __init__(self, store, table):
        self.store, self.table = store, table
        self.filtros, self.op, self.dados, self.lim = [], "select", None, None

    def select(self, *_): return self
    def order(self, *_, **__): return self
    def limit(self, n): self.lim = n; return self
    def eq(self, k, v): self.filtros.append(lambda r: r.get(k) == v); return self
    def gte(self, k, v): self.filtros.append(lambda r: r[k] >= v); return self
    def lt(self, k, v): self.filtros.append(lambda r: r[k] < v); return self
    def in_(self, k, vs): vs = set(vs); self.filtros.append(lambda r: r.get(k) in vs); return self
    def insert(self, d): self.op, self.dados = "insert", d; return self
    def update(self, d): self.op, self.dados = "update", d; return self
    def upsert(self, d): self.op, self.dados = "upsert", d; return self
    def delete(self): self.op = "delete"; return self

    def execute(self):
        linhas = self.store.setdefault(self.table, [])
        achadas = [r for r in linhas if all(f(r) for f in self.filtros)]
        if self.op == "insert":
            novas = [{"id": str(uuid.uuid4()), "created_at": "2025-01-01T00:00:00", **d}
                     for d in (self.dados if isinstance(self.dados, list) else [self.dados])]
            linhas.extend(novas)
            return SimpleNamespace(data=novas)
        if self.op == "upsert":
            existente = next((r for r in linhas if r.get("id") == self.dados.get("id")), None)
            if existente:
                existente.update(self.dados)
            else:
                linhas.append(dict(self.dados))
            return SimpleNamespace(data=[self.dados])
        if self.op == "update":
            for r in achadas: r.update(self.dados)
            return SimpleNamespace(data=achadas)
        if self.op == "delete":
            for r in achadas: linhas.remove(r)
            return SimpleNamespace(data=achadas)
        return SimpleNamespace(data=achadas[: self.lim] if self.lim else achadas)


class FakeSupabase:
    def __init__(self): self.store = {}
    def table(self, t): return _Query(self.store, t)


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    import app.core.database as database
    from app.main import app

    database._client = FakeSupabase()
    yield TestClient(app)
    database._client = None
