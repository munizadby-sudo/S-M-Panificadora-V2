import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { Login } from '../../src/modules/users/application/Login.js';
import { JwtTokenService } from '../../src/modules/users/infrastructure/JwtTokenService.js';
import { BcryptHashService } from '../../src/modules/users/infrastructure/BcryptHashService.js';
import { MySQLUsuarioRepository } from '../../src/modules/users/infrastructure/MySQLUsuarioRepository.js';
import { AuthController } from '../../src/modules/users/infrastructure/http/AuthController.js';
import { Auditor } from '../../src/modules/audit/domain/Auditor.js';
import { MySQLCaixaTurnoRepository, MySQLFluxoCaixaRepository } from '../../src/modules/cash-register/infrastructure/MySQLCaixaTurnoRepository.js';
import { CaixaTurnoController } from '../../src/modules/cash-register/infrastructure/http/CaixaTurnoController.js';
import { GetStatusCaixa } from '../../src/modules/cash-register/application/GetStatusCaixa.js';
import { AbrirCaixa } from '../../src/modules/cash-register/application/AbrirCaixa.js';
import { PreverFechamento } from '../../src/modules/cash-register/application/PreverFechamento.js';
import { FecharCaixa } from '../../src/modules/cash-register/application/FecharCaixa.js';
import { MySQLCategoriaRepository } from '../../src/modules/products/infrastructure/MySQLCategoriaRepository.js';
import { MySQLProdutoRepository } from '../../src/modules/products/infrastructure/MySQLProdutoRepository.js';
import { CreateCategoria } from '../../src/modules/products/application/CreateCategoria.js';
import { CategoriasController } from '../../src/modules/products/infrastructure/http/CategoriasController.js';
import { CreateProduto } from '../../src/modules/products/application/CreateProduto.js';
import { ProdutosController } from '../../src/modules/products/infrastructure/http/ProdutosController.js';
import { MySQLEstoqueRepository } from '../../src/modules/inventory/infrastructure/MySQLEstoqueRepository.js';
import { ObterOuCriarEstoqueDoDia } from '../../src/modules/inventory/application/ObterOuCriarEstoqueDoDia.js';
import { UpsertEstoque } from '../../src/modules/inventory/application/UpsertEstoque.js';
import { EstoqueController } from '../../src/modules/inventory/infrastructure/http/EstoqueController.js';
import { DebitarEstoque } from '../../src/modules/inventory/application/DebitarEstoque.js';
import { ReverterDebito } from '../../src/modules/inventory/application/ReverterDebito.js';
import { CreateSale } from '../../src/modules/sales/application/CreateSale.js';
import { MySQLVendaRepository } from '../../src/modules/sales/infrastructure/MySQLVendaRepository.js';
import { MySQLSequenciaRepository } from '../../src/modules/sales/infrastructure/MySQLSequenciaRepository.js';
import { MySQLCorrecaoPendenteRepository } from '../../src/modules/sales/infrastructure/MySQLCorrecaoPendenteRepository.js';
import { VendasController } from '../../src/modules/sales/infrastructure/http/VendasController.js';
import {
  aplicarSchemaCaixaTurnos,
  aplicarSchemaEstoque,
  aplicarSchemaProdutos,
  aplicarSchemaUsuarios,
  aplicarSchemaVendas,
  aplicarSchemaFluxoCaixa,
} from '../../src/infrastructure/database/db.js';
import { criarApp } from '../../src/app.js';
import { comServidor, json } from '../helpers/app-memoria.js';
import { criarPoolTeste, garantirDatabaseTeste, mysqlEstaDisponivel } from '../helpers/mysql.js';
import { dataHoje } from '../../src/modules/inventory/domain/EstoqueDiario.js';

const mysqlPronto = await mysqlEstaDisponivel();

describe('concorrência vendas — numero sequencial único', { skip: !mysqlPronto }, () => {
  let pool;
  let app;
  let tokenService;
  let admin;

  before(async () => {
    await garantirDatabaseTeste();
    pool = criarPoolTeste();
    await aplicarSchemaUsuarios(pool);
    await aplicarSchemaCaixaTurnos(pool);
    await aplicarSchemaProdutos(pool);
    await aplicarSchemaEstoque(pool);
    await aplicarSchemaVendas(pool);
    await aplicarSchemaFluxoCaixa(pool);

    const usuarioRepository = new MySQLUsuarioRepository(pool);
    const hashService = new BcryptHashService();
    tokenService = new JwtTokenService({ secret: 'teste-secret-vendas', expiresIn: '12h' });
    const auditor = new Auditor({ repositorio: null });
    const deps = { usuarioRepository, hashService, tokenService, auditoriaService: auditor, auditor };

    const caixaTurnoRepository = new MySQLCaixaTurnoRepository(pool);
    const fluxoCaixaRepository = new MySQLFluxoCaixaRepository(pool);
    const correcaoPendenteRepository = new MySQLCorrecaoPendenteRepository(pool);
    const depsCaixa = { caixaTurnoRepository, fluxoCaixaRepository, correcaoPendenteRepository, auditor };

    const categoriaRepository = new MySQLCategoriaRepository(pool);
    const produtoRepository = new MySQLProdutoRepository(pool);
    const estoqueRepository = new MySQLEstoqueRepository(pool);
    const obterOuCriarEstoqueDoDia = new ObterOuCriarEstoqueDoDia({
      estoqueRepository,
      produtoRepository,
    });
    const upsertEstoque = new UpsertEstoque({
      estoqueRepository,
      produtoRepository,
      obterOuCriarEstoqueDoDia,
      auditor,
    });
    const debitarEstoque = new DebitarEstoque({
      estoqueRepository,
      produtoRepository,
      obterOuCriarEstoqueDoDia,
    });
    const reverterDebito = new ReverterDebito({ estoqueRepository, obterOuCriarEstoqueDoDia });

    const vendaRepository = new MySQLVendaRepository(pool);
    const sequenciaRepository = new MySQLSequenciaRepository(pool);
    const depsVendas = {
      vendaRepository,
      sequenciaRepository,
      caixaTurnoRepository,
      produtoRepository,
      debitarEstoque,
      reverterDebito,
      fluxoCaixaRepository,
      correcaoPendenteRepository,
      auditor,
    };

    app = criarApp({
      authController: new AuthController(new Login(deps)),
      tokenService,
      caixaTurnoController: new CaixaTurnoController({
        getStatusCaixa: new GetStatusCaixa(depsCaixa),
        abrirCaixa: new AbrirCaixa(depsCaixa),
        preverFechamento: new PreverFechamento(depsCaixa),
        fecharCaixa: new FecharCaixa(depsCaixa),
      }),
      categoriasController: new CategoriasController({
        listCategorias: { executar: async () => ({ data: [], pagination: { total: 0 } }) },
        createCategoria: new CreateCategoria({ categoriaRepository, auditor }),
        deactivateCategoria: { executar: async () => ({}) },
        reactivateCategoria: { executar: async () => ({}) },
      }),
      produtosController: new ProdutosController({
        listProdutos: { executar: async () => ({ data: [], pagination: { total: 0 } }) },
        createProduto: new CreateProduto({ produtoRepository, categoriaRepository, auditor }),
        updateProduto: { executar: async () => ({}) },
        deactivateProduto: { executar: async () => ({}) },
        reactivateProduto: { executar: async () => ({}) },
      }),
      estoqueController: new EstoqueController({
        listarEstoqueDoDia: { executar: async () => ({ data: [] }) },
        upsertEstoque,
        upsertEstoqueEmLote: { executar: async () => ({}) },
      }),
      vendasController: new VendasController({
        createSale: new CreateSale(depsVendas),
        listSales: { executar: async () => ({ data: [], pagination: { total: 0 } }) },
        cancelSale: { executar: async () => ({}) },
        resolverCorrecaoPendente: { executar: async () => ({}) },
      }),
      limitadorLogin: (_req, _res, next) => next(),
    });

    admin = await usuarioRepository.salvar(
      new Usuario({
        nome: 'Admin Vendas Concorrencia',
        username: `admin.vendas.${Date.now()}.${Math.random().toString(16).slice(2)}`,
        senhaHash: await hashService.hash('admin123'),
        role: 'admin',
      }),
    );
  });

  after(async () => {
    if (pool) {
      await pool.query('DELETE FROM correcoes_pendentes');
      await pool.query('DELETE FROM venda_itens');
      await pool.query('DELETE FROM vendas');
      await pool.query('DELETE FROM fluxo_caixa');
      await pool.query('DELETE FROM caixa_turnos');
      await pool.query('DELETE FROM estoque_diario');
      await pool.query('DELETE FROM produtos');
      await pool.query('DELETE FROM categorias');
      await pool.end();
    }
  });

  test('duas vendas simultâneas recebem numeros distintos', async () => {
    const jwt = String(tokenService.emitir(admin) || '');
    const dia = dataHoje();

    await comServidor(app, async (porta) => {
      const origem = `http://127.0.0.1:${porta}`;
      const headers = cabecalhoAuth(jwt);

      const categoria = await json(
        await fetch(`${origem}/api/categorias`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ nome: `Cat Concorrencia ${Date.now()}` }),
        }),
      );
      const produto = await json(
        await fetch(`${origem}/api/produtos`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            nome: `Produto Concorrente ${Date.now()}`,
            categoria_id: categoria.id,
            preco: 1,
            custo: 0.2,
          }),
        }),
      );

      await fetch(`${origem}/api/estoque/${produto.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ data: dia, inicial: 100, produzido: 0 }),
      });

      await fetch(`${origem}/api/caixa-turno/abrir`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fundo_especie: 0, fundo_moedas: 0 }),
      });

      const corpoVenda = {
        forma_pagamento: 'dinheiro',
        itens: [{ produto_id: produto.id, quantidade: 1 }],
      };

      const [r1, r2] = await Promise.all([
        fetch(`${origem}/api/vendas`, {
          method: 'POST',
          headers,
          body: JSON.stringify(corpoVenda),
        }),
        fetch(`${origem}/api/vendas`, {
          method: 'POST',
          headers,
          body: JSON.stringify(corpoVenda),
        }),
      ]);
      const [v1, v2] = await Promise.all([json(r1), json(r2)]);

      assert.equal(r1.status, 200, JSON.stringify(v1));
      assert.equal(r2.status, 200, JSON.stringify(v2));
      assert.notEqual(v1.numero, v2.numero);

      const [[contagem]] = await pool.query(
        'SELECT COUNT(*) AS total FROM vendas WHERE id IN (?, ?)',
        [v1.id, v2.id],
      );
      assert.equal(Number(contagem.total), 2);
    });
  });
});

function cabecalhoAuth(token) {
  const jwt = String(token || '').trim();
  if (!jwt || jwt === 'undefined') {
    throw new Error('token JWT ausente');
  }
  return {
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
  };
}
