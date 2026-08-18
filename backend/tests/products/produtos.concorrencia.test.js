import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { Login } from '../../src/modules/users/application/Login.js';
import { CreateUser } from '../../src/modules/users/application/CreateUser.js';
import { UpdateUser } from '../../src/modules/users/application/UpdateUser.js';
import { DeactivateUser } from '../../src/modules/users/application/DeactivateUser.js';
import { ListUsers } from '../../src/modules/users/application/ListUsers.js';
import { JwtTokenService } from '../../src/modules/users/infrastructure/JwtTokenService.js';
import { BcryptHashService } from '../../src/modules/users/infrastructure/BcryptHashService.js';
import { MySQLUsuarioRepository } from '../../src/modules/users/infrastructure/MySQLUsuarioRepository.js';
import { AuthController } from '../../src/modules/users/infrastructure/http/AuthController.js';
import { UsuariosController } from '../../src/modules/users/infrastructure/http/UsuariosController.js';
import { Auditor } from '../../src/modules/audit/domain/Auditor.js';
import { ListCategorias } from '../../src/modules/products/application/ListCategorias.js';
import { CreateCategoria } from '../../src/modules/products/application/CreateCategoria.js';
import { DeactivateCategoria } from '../../src/modules/products/application/DeactivateCategoria.js';
import { ReactivateCategoria } from '../../src/modules/products/application/ReactivateCategoria.js';
import { ListProdutos } from '../../src/modules/products/application/ListProdutos.js';
import { CreateProduto } from '../../src/modules/products/application/CreateProduto.js';
import { UpdateProduto } from '../../src/modules/products/application/UpdateProduto.js';
import { DeactivateProduto } from '../../src/modules/products/application/DeactivateProduto.js';
import { ReactivateProduto } from '../../src/modules/products/application/ReactivateProduto.js';
import { MySQLCategoriaRepository } from '../../src/modules/products/infrastructure/MySQLCategoriaRepository.js';
import { MySQLProdutoRepository } from '../../src/modules/products/infrastructure/MySQLProdutoRepository.js';
import { CategoriasController } from '../../src/modules/products/infrastructure/http/CategoriasController.js';
import { ProdutosController } from '../../src/modules/products/infrastructure/http/ProdutosController.js';
import {
  aplicarSchemaProdutos,
  aplicarSchemaUsuarios,
} from '../../src/infrastructure/database/db.js';
import { criarApp } from '../../src/app.js';
import { comServidor, json } from '../helpers/app-memoria.js';
import { criarPoolTeste, garantirDatabaseTeste, mysqlEstaDisponivel } from '../helpers/mysql.js';

const mysqlPronto = await mysqlEstaDisponivel();

describe('concorrência produtos — índice único (categoria_id, nome)', { skip: !mysqlPronto }, () => {
  let pool;
  let app;
  let tokenService;
  let admin;

  before(async () => {
    await garantirDatabaseTeste();
    pool = criarPoolTeste();
    await aplicarSchemaUsuarios(pool);
    await aplicarSchemaProdutos(pool);

    const usuarioRepository = new MySQLUsuarioRepository(pool);
    const hashService = new BcryptHashService();
    tokenService = new JwtTokenService({ secret: 'teste-secret-produtos', expiresIn: '12h' });
    const auditor = new Auditor({ repositorio: null });
    const deps = { usuarioRepository, hashService, tokenService, auditoriaService: auditor, auditor };
    const categoriaRepository = new MySQLCategoriaRepository(pool);
    const produtoRepository = new MySQLProdutoRepository(pool);
    const depsCategorias = { categoriaRepository, auditor };
    const depsProdutos = { produtoRepository, categoriaRepository, auditor };

    app = criarApp({
      authController: new AuthController(new Login(deps)),
      usuariosController: new UsuariosController({
        listUsers: new ListUsers(deps),
        createUser: new CreateUser(deps),
        updateUser: new UpdateUser(deps),
        deactivateUser: new DeactivateUser(deps),
      }),
      tokenService,
      categoriasController: new CategoriasController({
        listCategorias: new ListCategorias(depsCategorias),
        createCategoria: new CreateCategoria(depsCategorias),
        deactivateCategoria: new DeactivateCategoria(depsCategorias),
        reactivateCategoria: new ReactivateCategoria(depsCategorias),
      }),
      produtosController: new ProdutosController({
        listProdutos: new ListProdutos(depsProdutos),
        createProduto: new CreateProduto(depsProdutos),
        updateProduto: new UpdateProduto(depsProdutos),
        deactivateProduto: new DeactivateProduto(depsProdutos),
        reactivateProduto: new ReactivateProduto(depsProdutos),
      }),
      limitadorLogin: (_req, _res, next) => next(),
    });

    admin = await usuarioRepository.salvar(
      new Usuario({
        nome: 'Admin Concorrencia',
        username: `admin.concorrencia.${Date.now()}.${Math.random().toString(16).slice(2)}`,
        senhaHash: await hashService.hash('admin123'),
        role: 'admin',
      }),
    );
  });

  after(async () => {
    if (pool) {
      await pool.end();
    }
  });

  test('duas criações simultâneas do mesmo nome na mesma categoria: uma 200 e outra 409', async () => {
    assert.ok(tokenService, 'tokenService não foi montado no before()');
    assert.ok(admin?.id, 'admin de concorrência não foi persistido');

    const jwt = String(tokenService.emitir(admin) || '');
    assert.match(jwt, /^eyJ/, `JWT inválido (não começa com eyJ): ${jwt.slice(0, 24)}`);

    await comServidor(app, async (porta) => {
      const origem = `http://127.0.0.1:${porta}`;
      const criadoCategoria = await fetch(`${origem}/api/categorias`, {
        method: 'POST',
        headers: cabecalhoAuth(jwt),
        body: JSON.stringify({ nome: `Cat Concorrencia ${Date.now()}` }),
      });
      const categoria = await json(criadoCategoria);
      assert.notEqual(
        criadoCategoria.status,
        401,
        `auth falhou ao criar categoria (não é o índice único): ${JSON.stringify(categoria)}`,
      );
      assert.equal(
        criadoCategoria.status,
        200,
        `falha ao criar categoria: ${criadoCategoria.status} ${JSON.stringify(categoria)}`,
      );
      assert.ok(categoria?.id, `categoria sem id: ${JSON.stringify(categoria)}`);

      const corpo = {
        nome: `Produto Concorrente ${Date.now()}`,
        categoria_id: categoria.id,
        preco: 1.5,
        custo: 0.5,
      };

      const [r1, r2] = await Promise.all([
        fetch(`${origem}/api/produtos`, {
          method: 'POST',
          headers: cabecalhoAuth(jwt),
          body: JSON.stringify(corpo),
        }),
        fetch(`${origem}/api/produtos`, {
          method: 'POST',
          headers: cabecalhoAuth(jwt),
          body: JSON.stringify(corpo),
        }),
      ]);
      const [c1, c2] = await Promise.all([json(r1), json(r2)]);
      const status = [r1.status, r2.status].sort((a, b) => a - b);

      assert.notEqual(r1.status, 401, `POST 1 veio 401 (auth), corpo=${JSON.stringify(c1)}`);
      assert.notEqual(r2.status, 401, `POST 2 veio 401 (auth), corpo=${JSON.stringify(c2)}`);
      assert.deepEqual(
        status,
        [200, 409],
        `esperado [200, 409], veio [${r1.status}, ${r2.status}] corpos=${JSON.stringify([c1, c2])}`,
      );

      const [[contagem]] = await pool.query(
        'SELECT COUNT(*) AS total FROM produtos WHERE categoria_id = ? AND nome = ?',
        [categoria.id, corpo.nome],
      );
      assert.equal(Number(contagem.total), 1);
    });
  });
});

function cabecalhoAuth(token) {
  const jwt = String(token || '').trim();
  if (!jwt || jwt === 'undefined') {
    throw new Error('token JWT ausente: o teste de concorrência não pode autenticar as duas POSTs');
  }
  return {
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
  };
}
