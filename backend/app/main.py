from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError

from app.core.config import CORS_ORIGINS
from app.routers import canais, compras, encomendas, insumos, precificacao, receitas, vendas

app = FastAPI(title="Delícias de Marias API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(encomendas.router)
app.include_router(vendas.router)
app.include_router(insumos.router)
app.include_router(receitas.router)
app.include_router(precificacao.router)
app.include_router(compras.router)
app.include_router(canais.router)


# Erros do Postgres/Supabase viram respostas legíveis em vez de 500 genérico
_POSTGRES_STATUS = {
    "22P02": 422,  # valor inválido (ex.: id que não é uuid)
    "23503": 409,  # violação de chave estrangeira
    "23505": 409,  # duplicado
}


@app.exception_handler(APIError)
async def supabase_error(_: Request, exc: APIError):
    status = _POSTGRES_STATUS.get(exc.code or "", 502)
    return JSONResponse(status_code=status, content={"detail": exc.message or "Erro no banco de dados"})


@app.get("/health", tags=["infra"])
def health():
    return {"status": "ok"}
