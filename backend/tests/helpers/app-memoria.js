import { Login } from '../../src/modules/users/application/Login.js';
import { CreateUser } from '../../src/modules/users/application/CreateUser.js';
import { UpdateUser } from '../../src/modules/users/application/UpdateUser.js';
import { DeactivateUser } from '../../src/modules/users/application/DeactivateUser.js';
import { ListUsers } from '../../src/modules/users/application/ListUsers.js';
import { JwtTokenService } from '../../src/modules/users/infrastructure/JwtTokenService.js';
import { AuthController } from '../../src/modules/users/infrastructure/http/AuthController.js';
import { UsuariosController } from '../../src/modules/users/infrastructure/http/UsuariosController.js';
import { GetConfiguracoesPublicas } from '../../src/modules/settings/application/GetConfiguracoesPublicas.js';
import { GetConfiguracoes } from '../../src/modules/settings/application/GetConfiguracoes.js';
import { UpdateConfiguracoes } from '../../src/modules/settings/application/UpdateConfiguracoes.js';
import { UploadLogo } from '../../src/modules/settings/application/UploadLogo.js';
import { Auditor } from '../../src/modules/audit/domain/Auditor.js';
import { ListarAuditoria } from '../../src/modules/audit/application/ListarAuditoria.js';
import { AuditoriaController } from '../../src/modules/audit/infrastructure/http/AuditoriaController.js';
import { ConfiguracoesController } from '../../src/modules/settings/infrastructure/http/ConfiguracoesController.js';
import { GetStatusCaixa } from '../../src/modules/cash-register/application/GetStatusCaixa.js';
import { AbrirCaixa } from '../../src/modules/cash-register/application/AbrirCaixa.js';
import { PreverFechamento } from '../../src/modules/cash-register/application/PreverFechamento.js';
import { FecharCaixa } from '../../src/modules/cash-register/application/FecharCaixa.js';
import { CaixaTurnoController } from '../../src/modules/cash-register/infrastructure/http/CaixaTurnoController.js';
import { ListCategorias } from '../../src/modules/products/application/ListCategorias.js';
import { CreateCategoria } from '../../src/modules/products/application/CreateCategoria.js';
import { DeactivateCategoria } from '../../src/modules/products/application/DeactivateCategoria.js';
import { ReactivateCategoria } from '../../src/modules/products/application/ReactivateCategoria.js';
import { CategoriasController } from '../../src/modules/products/infrastructure/http/CategoriasController.js';
import { ListProdutos } from '../../src/modules/products/application/ListProdutos.js';
import { CreateProduto } from '../../src/modules/products/application/CreateProduto.js';
import { UpdateProduto } from '../../src/modules/products/application/UpdateProduto.js';
import { DeactivateProduto } from '../../src/modules/products/application/DeactivateProduto.js';
import { ReactivateProduto } from '../../src/modules/products/application/ReactivateProduto.js';
import { ProdutosController } from '../../src/modules/products/infrastructure/http/ProdutosController.js';
import { ObterOuCriarEstoqueDoDia } from '../../src/modules/inventory/application/ObterOuCriarEstoqueDoDia.js';
import { ListarEstoqueDoDia } from '../../src/modules/inventory/application/ListarEstoqueDoDia.js';
import { UpsertEstoque } from '../../src/modules/inventory/application/UpsertEstoque.js';
import { UpsertEstoqueEmLote } from '../../src/modules/inventory/application/UpsertEstoqueEmLote.js';
import { DebitarEstoque } from '../../src/modules/inventory/application/DebitarEstoque.js';
import { ReverterDebito } from '../../src/modules/inventory/application/ReverterDebito.js';
import { EstoqueController } from '../../src/modules/inventory/infrastructure/http/EstoqueController.js';
import { CreatePerda } from '../../src/modules/losses/application/CreatePerda.js';
import { ListPerdas } from '../../src/modules/losses/application/ListPerdas.js';
import { EstornarPerda } from '../../src/modules/losses/application/EstornarPerda.js';
import { PerdasController } from '../../src/modules/losses/infrastructure/http/PerdasController.js';
import { CreateSale } from '../../src/modules/sales/application/CreateSale.js';
import { ListSales } from '../../src/modules/sales/application/ListSales.js';
import { CancelSale } from '../../src/modules/sales/application/CancelSale.js';
import { ResolverCorrecaoPendente } from '../../src/modules/sales/application/ResolverCorrecaoPendente.js';
import { VendasController } from '../../src/modules/sales/infrastructure/http/VendasController.js';
import { CreateLancamentoManual } from '../../src/modules/cash-flow/application/CreateLancamentoManual.js';
import { ListLancamentos } from '../../src/modules/cash-flow/application/ListLancamentos.js';
import { DeleteLancamento } from '../../src/modules/cash-flow/application/DeleteLancamento.js';
import { GetResumoPorTurno } from '../../src/modules/cash-flow/application/GetResumoPorTurno.js';
import { FluxoCaixaController } from '../../src/modules/cash-flow/infrastructure/http/FluxoCaixaController.js';
import { criarApp } from '../../src/app.js';
import { MemoriaUsuarioRepository } from './MemoriaUsuarioRepository.js';
import { MemoriaConfiguracaoRepository } from './MemoriaConfiguracaoRepository.js';
import { MemoriaAuditoriaRepositorio } from './MemoriaAuditoriaRepositorio.js';
import {
  MemoriaCaixaTurnoRepository,
  MemoriaCorrecaoPendenteRepository,
  MemoriaFluxoCaixaRepository,
} from './MemoriaCaixaTurnoRepository.js';
import { MemoriaCategoriaRepository } from './MemoriaCategoriaRepository.js';
import { MemoriaProdutoRepository } from './MemoriaProdutoRepository.js';
import { MemoriaEstoqueRepository } from './MemoriaEstoqueRepository.js';
import { MemoriaPerdaRepository } from './MemoriaPerdaRepository.js';
import { MemoriaSequenciaRepository, MemoriaVendaRepository } from './MemoriaVendaRepository.js';
import { MemoriaLancamentoFluxoCaixaRepository } from './MemoriaLancamentoFluxoCaixaRepository.js';

export class HashEmMemoria {
  async hash(senha) {
    return `hash:${senha}`;
  }

  async conferir(senha, senhaHash) {
    return senhaHash === `hash:${senha}`;
  }
}

export class MemoriaLogoStorage {
  constructor() {
    this.salvos = [];
  }

  async salvar(arquivo) {
    this.salvos.push(arquivo);
    return '/uploads/logo.png';
  }
}

export function montarAppMemoria() {
  const usuarioRepository = new MemoriaUsuarioRepository();
  const configuracaoRepository = new MemoriaConfiguracaoRepository();
  const hashService = new HashEmMemoria();
  const tokenService = new JwtTokenService({ secret: 'teste-secret', expiresIn: '12h' });
  const auditoriaRepositorio = new MemoriaAuditoriaRepositorio();
  const auditor = new Auditor({ repositorio: auditoriaRepositorio });
  const logoStorage = new MemoriaLogoStorage();
  const deps = { usuarioRepository, hashService, tokenService, auditoriaService: auditor, auditor };

  const caixaTurnoRepository = new MemoriaCaixaTurnoRepository();
  const lancamentosFluxo = [];
  const fluxoCaixaRepository = new MemoriaFluxoCaixaRepository(lancamentosFluxo);
  const lancamentoFluxoCaixaRepository = new MemoriaLancamentoFluxoCaixaRepository(lancamentosFluxo, {
    idProvider: fluxoCaixaRepository,
  });
  const correcaoPendenteRepository = new MemoriaCorrecaoPendenteRepository();
  const depsCaixa = { caixaTurnoRepository, fluxoCaixaRepository, correcaoPendenteRepository, auditor };
  const categoriaRepository = new MemoriaCategoriaRepository();
  const produtoRepository = new MemoriaProdutoRepository();
  const estoqueRepository = new MemoriaEstoqueRepository();
  const depsCategorias = { categoriaRepository, auditor };
  const depsProdutos = { produtoRepository, categoriaRepository, auditor };
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
  const perdaRepository = new MemoriaPerdaRepository({ produtoRepository, usuarioRepository });
  const depsPerdas = { perdaRepository, produtoRepository, debitarEstoque, reverterDebito, auditor };
  const sequenciaRepository = new MemoriaSequenciaRepository();
  const vendaRepository = new MemoriaVendaRepository({
    estoqueRepository,
    sequenciaRepository,
    fluxoCaixaRepository,
  });
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

  const depsFluxo = {
    caixaTurnoRepository,
    lancamentoRepository: lancamentoFluxoCaixaRepository,
    fluxoCaixaRepository,
    auditor,
  };

  const app = criarApp({
    authController: new AuthController(new Login(deps)),
    usuariosController: new UsuariosController({
      listUsers: new ListUsers(deps),
      createUser: new CreateUser(deps),
      updateUser: new UpdateUser(deps),
      deactivateUser: new DeactivateUser(deps),
    }),
    tokenService,
    configuracoesController: new ConfiguracoesController({
      getConfiguracoesPublicas: new GetConfiguracoesPublicas({ configuracaoRepository }),
      getConfiguracoes: new GetConfiguracoes({ configuracaoRepository }),
      updateConfiguracoes: new UpdateConfiguracoes({ configuracaoRepository, auditor }),
      uploadLogo: new UploadLogo({ configuracaoRepository, logoStorage, auditor }),
    }),
    auditoriaController: new AuditoriaController(
      new ListarAuditoria({ auditoriaRepositorio }),
    ),
    caixaTurnoController: new CaixaTurnoController({
      getStatusCaixa: new GetStatusCaixa(depsCaixa),
      abrirCaixa: new AbrirCaixa(depsCaixa),
      preverFechamento: new PreverFechamento(depsCaixa),
      fecharCaixa: new FecharCaixa(depsCaixa),
    }),
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
    estoqueController: new EstoqueController({
      listarEstoqueDoDia: new ListarEstoqueDoDia({
        produtoRepository,
        obterOuCriarEstoqueDoDia,
      }),
      upsertEstoque,
      upsertEstoqueEmLote: new UpsertEstoqueEmLote({
        upsertEstoque,
        estoqueRepository,
        auditor,
      }),
    }),
    perdasController: new PerdasController({
      createPerda: new CreatePerda(depsPerdas),
      listPerdas: new ListPerdas({ perdaRepository }),
      estornarPerda: new EstornarPerda(depsPerdas),
    }),
    vendasController: new VendasController({
      createSale: new CreateSale(depsVendas),
      listSales: new ListSales({ vendaRepository }),
      cancelSale: new CancelSale(depsVendas),
      resolverCorrecaoPendente: new ResolverCorrecaoPendente(depsVendas),
    }),
    fluxoCaixaController: new FluxoCaixaController({
      createLancamentoManual: new CreateLancamentoManual(depsFluxo),
      listLancamentos: new ListLancamentos({ lancamentoRepository: lancamentoFluxoCaixaRepository }),
      deleteLancamento: new DeleteLancamento({ lancamentoRepository: lancamentoFluxoCaixaRepository, auditor }),
      getResumoPorTurno: new GetResumoPorTurno(depsFluxo),
    }),
    limitadorLogin: (_req, _res, next) => next(),
  });

  return {
    app,
    usuarioRepository,
    configuracaoRepository,
    auditoriaRepositorio,
    logoStorage,
    caixaTurnoRepository,
    correcaoPendenteRepository,
    fluxoCaixaRepository,
    lancamentoFluxoCaixaRepository,
    lancamentosFluxo,
    categoriaRepository,
    produtoRepository,
    estoqueRepository,
    perdaRepository,
    vendaRepository,
    sequenciaRepository,
    hashService,
    tokenService,
    deps,
  };
}

export async function comServidor(app, fn) {
  const servidor = await new Promise((resolve) => {
    const httpServer = app.listen(0, '127.0.0.1', () => resolve(httpServer));
  });
  const { port } = servidor.address();
  try {
    await fn(port);
  } finally {
    await new Promise((resolve, reject) => {
      servidor.close((erro) => (erro ? reject(erro) : resolve()));
    });
  }
}

export async function json(resposta) {
  const texto = await resposta.text();
  return texto ? JSON.parse(texto) : null;
}
