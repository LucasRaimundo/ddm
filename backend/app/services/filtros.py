def intervalo_mes(mes: int, ano: int) -> tuple[str, str]:
    """Retorna (inicio, fim) do mês no formato ISO, com fim exclusivo."""
    inicio = f"{ano}-{mes:02d}-01"
    fim = f"{ano + 1}-01-01" if mes == 12 else f"{ano}-{mes + 1:02d}-01"
    return inicio, fim
