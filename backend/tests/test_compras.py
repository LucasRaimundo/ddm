def _insumo(client, nome="Leite condensado", preco=7.0, tamanho=395, unidade="g"):
    return client.post("/insumos", json={"nome": nome, "unidade": unidade,
                                         "preco_embalagem": preco, "quantidade_embalagem": tamanho}).json()


def _compra(client, data, itens, **extra):
    return client.post("/compras", json={"data_compra": data, "itens": itens, **extra})


def test_compra_atualiza_preco_do_insumo(client):
    lc = _insumo(client)
    r = _compra(client, "2025-03-10", [{"insumo_id": lc["id"], "quantidade": 6, "valor_total": 48}], local="Atacadão")
    assert r.status_code == 201
    compra = r.json()
    assert compra["valor_total"] == 48
    item = compra["itens"][0]
    assert item["tamanho_embalagem"] == 395          # herdou do insumo
    assert item["preco_embalagem"] == 8.0            # 48 ÷ 6
    assert client.get(f"/insumos/{lc['id']}").json()["preco_embalagem"] == 8.0


def test_compra_com_embalagem_diferente(client):
    lc = _insumo(client)
    _compra(client, "2025-03-10", [{"insumo_id": lc["id"], "quantidade": 1, "tamanho_embalagem": 1000,
                                    "valor_total": 15}])
    insumo = client.get(f"/insumos/{lc['id']}").json()
    assert insumo["quantidade_embalagem"] == 1000 and insumo["preco_embalagem"] == 15


def test_compra_antiga_nao_sobrescreve_preco_atual(client):
    lc = _insumo(client)
    _compra(client, "2025-03-10", [{"insumo_id": lc["id"], "quantidade": 1, "valor_total": 8}])
    _compra(client, "2025-01-05", [{"insumo_id": lc["id"], "quantidade": 1, "valor_total": 6}])  # lançada atrasada
    assert client.get(f"/insumos/{lc['id']}").json()["preco_embalagem"] == 8


def test_apagar_compra_volta_preco_anterior(client):
    lc = _insumo(client)
    _compra(client, "2025-01-05", [{"insumo_id": lc["id"], "quantidade": 1, "valor_total": 7}])
    nova = _compra(client, "2025-03-10", [{"insumo_id": lc["id"], "quantidade": 1, "valor_total": 9}]).json()
    assert client.get(f"/insumos/{lc['id']}").json()["preco_embalagem"] == 9
    assert client.delete(f"/compras/{nova['id']}").status_code == 204
    assert client.get(f"/insumos/{lc['id']}").json()["preco_embalagem"] == 7


def test_editar_compra_trocando_insumo_ressincroniza_os_dois(client):
    a = _insumo(client, "A", preco=10, tamanho=100)
    b = _insumo(client, "B", preco=10, tamanho=100)
    _compra(client, "2025-01-01", [{"insumo_id": a["id"], "quantidade": 1, "valor_total": 10}])
    c = _compra(client, "2025-02-01", [{"insumo_id": a["id"], "quantidade": 1, "valor_total": 20}]).json()
    client.put(f"/compras/{c['id']}", json={"data_compra": "2025-02-01",
                                            "itens": [{"insumo_id": b["id"], "quantidade": 1, "valor_total": 30}]})
    assert client.get(f"/insumos/{a['id']}").json()["preco_embalagem"] == 10   # voltou para a compra de jan
    assert client.get(f"/insumos/{b['id']}").json()["preco_embalagem"] == 30


def test_historico_e_variacao(client):
    lc = _insumo(client)
    for data, valor in [("2025-01-05", 7), ("2025-02-05", 7.7), ("2025-03-05", 7.7)]:
        _compra(client, data, [{"insumo_id": lc["id"], "quantidade": 1, "valor_total": valor}])
    hist = client.get(f"/insumos/{lc['id']}/historico").json()
    assert [h["data_compra"] for h in hist] == ["2025-01-05", "2025-02-05", "2025-03-05"]
    assert hist[0]["variacao_pct"] is None
    assert hist[1]["variacao_pct"] == 10.0
    assert hist[2]["variacao_pct"] == 0.0
    lista = client.get("/insumos").json()[0]
    assert lista["ultima_compra"] == "2025-03-05" and lista["variacao_pct"] == 0.0


def test_preco_sugerido_acompanha_compra(client):
    lc = _insumo(client)
    receita = client.post("/receitas", json={"nome": "Brigadeiro", "rendimento": 25, "tempo_preparo_min": 0,
                          "perda_percentual": 0, "itens": [{"insumo_id": lc["id"], "quantidade": 395}]}).json()
    antes = client.get(f"/receitas/{receita['id']}/preco").json()["custo_insumos_receita"]
    _compra(client, "2025-03-10", [{"insumo_id": lc["id"], "quantidade": 1, "valor_total": 14}])
    depois = client.get(f"/receitas/{receita['id']}/preco").json()["custo_insumos_receita"]
    assert antes == 7 and depois == 14


def test_resumo_do_mes(client):
    a = _insumo(client, "A")
    b = _insumo(client, "B")
    _compra(client, "2025-03-01", [{"insumo_id": a["id"], "quantidade": 2, "valor_total": 20},
                                   {"insumo_id": b["id"], "quantidade": 1, "valor_total": 50}])
    _compra(client, "2025-03-20", [{"insumo_id": a["id"], "quantidade": 1, "valor_total": 10}])
    _compra(client, "2025-04-01", [{"insumo_id": a["id"], "quantidade": 1, "valor_total": 99}])
    r = client.get("/compras/resumo?mes=3&ano=2025").json()
    assert r["total"] == 80 and r["quantidade"] == 2
    assert [(g["nome"], g["total"]) for g in r["por_insumo"]] == [("B", 50), ("A", 30)]
    assert len(client.get("/compras?mes=3&ano=2025").json()) == 2


def test_validacoes(client):
    lc = _insumo(client)
    item = {"insumo_id": lc["id"], "quantidade": 1, "valor_total": 7}
    assert _compra(client, "2025-03-10", []).status_code == 422                       # sem itens
    assert _compra(client, "2025-03-10", [item, item]).status_code == 422             # insumo repetido
    assert _compra(client, "2025-03-10", [{**item, "valor_total": 0}]).status_code == 422
    assert _compra(client, "2025-03-10", [{**item, "insumo_id": "x"}]).status_code == 422
    assert client.get("/compras") .json() == []                                      # nada foi gravado


def test_insumo_com_compra_nao_pode_ser_apagado(client):
    lc = _insumo(client)
    _compra(client, "2025-03-10", [{"insumo_id": lc["id"], "quantidade": 1, "valor_total": 7}])
    assert client.delete(f"/insumos/{lc['id']}").status_code == 409
