ENC = {"nome_cliente": "Ana", "tipo_encomenda": "Cento de Trufa", "valor": 150,
       "data_pedido": "2025-01-10", "data_entrega": "2025-01-20"}


def test_encomenda_fluxo(client):
    r = client.post("/encomendas", json=ENC)
    assert r.status_code == 201 and r.json()["status"] == "pendente"
    eid = r.json()["id"]
    assert client.patch(f"/encomendas/{eid}/status", json={"status": "entregue"}).status_code == 400
    assert client.patch(f"/encomendas/{eid}/status", json={"status": "confirmado"}).json()["status"] == "confirmado"
    assert len(client.get("/encomendas?mes=1&ano=2025").json()) == 1
    assert len(client.get("/encomendas?mes=2&ano=2025").json()) == 0
    assert client.delete(f"/encomendas/{eid}").status_code == 204
    assert client.get(f"/encomendas/{eid}").status_code == 404


def test_encomenda_validacoes(client):
    assert client.post("/encomendas", json={**ENC, "data_entrega": "2025-01-01"}).status_code == 422
    assert client.post("/encomendas", json={**ENC, "valor": 0}).status_code == 422
    assert client.get("/encomendas?mes=13&ano=2025").status_code == 422


def test_venda_calcula_total(client):
    r = client.post("/vendas", json={"nome_cliente": "Bia", "tipo_produto": "Trufa",
                                     "quantidade": 3, "valor_unit": 4.5, "data_venda": "2025-01-08"})
    assert r.status_code == 201 and r.json()["valor_total"] == 13.5


def test_precificacao_ponta_a_ponta(client):
    # configuração ainda não salva → devolve padrão
    cfg = client.get("/precificacao/config").json()
    assert cfg["configurado"] is False

    cfg = {"salario_desejado": 3000, "horas_mes": 120, "custos_fixos_mes": 300, "producao_mes": 2000,
           "lucro_percentual": 15, "taxas_percentual": 5, "desconto_cento_percentual": 10}
    assert client.put("/precificacao/config", json=cfg).json()["configurado"] is True
    assert client.get("/precificacao/config").json()["salario_desejado"] == 3000

    lc = client.post("/insumos", json={"nome": "Leite condensado", "unidade": "g",
                                       "preco_embalagem": 7, "quantidade_embalagem": 395}).json()
    fm = client.post("/insumos", json={"nome": "Forminha", "categoria": "embalagem", "unidade": "un",
                                       "preco_embalagem": 6, "quantidade_embalagem": 100}).json()

    receita = {"nome": "Brigadeiro", "rendimento": 25, "tempo_preparo_min": 60, "perda_percentual": 0,
               "preco_venda_cento": 150,
               "itens": [{"insumo_id": lc["id"], "quantidade": 395},
                         {"insumo_id": fm["id"], "quantidade": 25}]}
    r = client.post("/receitas", json=receita)
    assert r.status_code == 201
    rid = r.json()["id"]
    assert len(r.json()["itens"]) == 2

    preco = client.get(f"/receitas/{rid}/preco").json()
    assert preco["preco_sugerido_un"] == 1.86
    assert preco["analise_cento"]["status"] == "prejuizo"  # 150 × 0,95 = 142,50 < custo 149

    # leite condensado subiu → preço sobe sozinho
    client.put(f"/insumos/{lc['id']}", json={**{k: lc[k] for k in
               ("nome", "categoria", "unidade", "quantidade_embalagem")}, "preco_embalagem": 9})
    assert client.get("/precificacao").json()[0]["preco_sugerido_un"] > 1.86

    # insumo em uso não pode ser apagado
    assert client.delete(f"/insumos/{lc['id']}").status_code == 409

    # insumo inexistente na receita
    ruim = {**receita, "itens": [{"insumo_id": "nao-existe", "quantidade": 1}]}
    assert client.post("/receitas", json=ruim).status_code == 422

    # editar receita troca os itens
    r = client.put(f"/receitas/{rid}", json={**receita, "itens": receita["itens"][:1]})
    assert len(r.json()["itens"]) == 1
    assert client.delete(f"/receitas/{rid}").status_code == 204
    assert client.delete(f"/insumos/{lc['id']}").status_code == 204


def test_cors(client):
    r = client.options("/receitas", headers={"Origin": "http://localhost:4200",
                                            "Access-Control-Request-Method": "POST"})
    assert r.status_code == 200
