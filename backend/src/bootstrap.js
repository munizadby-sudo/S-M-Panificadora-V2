import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Login } from './modules/users/application/Login.js';
import { CreateUser } from './modules/users/application/CreateUser.js';
import { UpdateUser } from './modules/users/application/UpdateUser.js';
import { DeactivateUser } from './modules/users/application/DeactivateUser.js';
import { ListUsers } from './modules/users/application/ListUsers.js';
import { GetConfiguracoesPublicas } from './modules/settings/application/GetConfiguracoesPublicas.js';
import { GetConfiguracoes } from './modules/settings/application/GetConfiguracoes.js';
import { UpdateConfiguracoes } from './modules/settings/application/UpdateConfiguracoes.js';
import { UploadLogo } from './modules/settings/application/UploadLogo.js';
import { Auditor } from './modules/audit/domain/Auditor.js';
import { ListarAuditoria } from './modules/audit/application/ListarAuditoria.js';
import { AuditoriaController } from './modules/audit/infrastructure/http/AuditoriaController.js';
import { BcryptHashService } from './modules/users/infrastructure/BcryptHashService.js';
import { JwtTokenService } from './modules/users/infrastructure/JwtTokenService.js';
import { MySQLUsuarioRepository } from './modules/users/infrastructure/MySQLUsuarioRepository.js';
import { MySQLConfiguracaoRepository } from './modules/settings/infrastructure/MySQLConfiguracaoRepository.js';
import { MySQLAuditoriaRepository } from './modules/audit/infrastructure/MySQLAuditoriaRepository.js';
import { DiscoLogoStorage } from './modules/settings/infrastructure/DiscoLogoStorage.js';
import { ConfiguracoesController } from './modules/settings/infrastructure/http/ConfiguracoesController.js';
import { AuthController } from './modules/users/infrastructure/http/AuthController.js';
import { UsuariosController } from './modules/users/infrastructure/http/UsuariosController.js';
import { GetStatusCaixa } from './modules/cash-register/application/GetStatusCaixa.js';
import { AbrirCaixa } from './modules/cash-register/application/AbrirCaixa.js';
import { PreverFechamento } from './modules/cash-register/application/PreverFechamento.js';
import { FecharCaixa } from './modules/cash-register/application/FecharCaixa.js';
import { MySQLCaixaTurnoRepository, MySQLFluxoCaixaRepository } from './modules/cash-register/infrastructure/MySQLCaixaTurnoRepository.js';
import { CaixaTurnoController } from './modules/cash-register/infrastructure/http/CaixaTurnoController.js';
import { ListCategorias } from './modules/products/application/ListCategorias.js';
import { CreateCategoria } from './modules/products/application/CreateCategoria.js';
import { DeactivateCategoria } from './modules/products/application/DeactivateCategoria.js';
import { ReactivateCategoria } from './modules/products/application/ReactivateCategoria.js';
import { MySQLCategoriaRepository } from './modules/products/infrastructure/MySQLCategoriaRepository.js';
import { CategoriasController } from './modules/products/infrastructure/http/CategoriasController.js';
import { ListProdutos } from './modules/products/application/ListProdutos.js';
import { CreateProduto } from './modules/products/application/CreateProduto.js';
import { UpdateProduto } from './modules/products/application/UpdateProduto.js';
import { DeactivateProduto } from './modules/products/application/DeactivateProduto.js';
import { ReactivateProduto } from './modules/products/application/ReactivateProduto.js';
import { MySQLProdutoRepository } from './modules/products/infrastructure/MySQLProdutoRepository.js';
import { ProdutosController } from './modules/products/infrastructure/http/ProdutosController.js';
import { ObterOuCriarEstoqueDoDia } from './modules/inventory/application/ObterOuCriarEstoqueDoDia.js';
import { ListarEstoqueDoDia } from './modules/inventory/application/ListarEstoqueDoDia.js';
import { UpsertEstoque } from './modules/inventory/application/UpsertEstoque.js';
import { UpsertEstoqueEmLote } from './modules/inventory/application/UpsertEstoqueEmLote.js';
import { DebitarEstoque } from './modules/inventory/application/DebitarEstoque.js';
import { ReverterDebito } from './modules/inventory/application/ReverterDebito.js';
import { MySQLEstoqueRepository } from './modules/inventory/infrastructure/MySQLEstoqueRepository.js';
import { EstoqueController } from './modules/inventory/infrastructure/http/EstoqueController.js';
import { CreatePerda } from './modules/losses/application/CreatePerda.js';
import { ListPerdas } from './modules/losses/application/ListPerdas.js';
import { EstornarPerda } from './modules/losses/application/EstornarPerda.js';
import { MySQLPerdaRepository } from './modules/losses/infrastructure/MySQLPerdaRepository.js';
import { PerdasController } from './modules/losses/infrastructure/http/PerdasController.js';
import { CreateSale } from './modules/sales/application/CreateSale.js';
import { ListSales } from './modules/sales/application/ListSales.js';
import { CancelSale } from './modules/sales/application/CancelSale.js';
import { ResolverCorrecaoPendente } from './modules/sales/application/ResolverCorrecaoPendente.js';
import { MySQLVendaRepository } from './modules/sales/infrastructure/MySQLVendaRepository.js';
import { MySQLSequenciaRepository } from './modules/sales/infrastructure/MySQLSequenciaRepository.js';
import { MySQLCorrecaoPendenteRepository } from './modules/sales/infrastructure/MySQLCorrecaoPendenteRepository.js';
import { VendasController } from './modules/sales/infrastructure/http/VendasController.js';
import { CreateLancamentoManual } from './modules/cash-flow/application/CreateLancamentoManual.js';
import { ListLancamentos } from './modules/cash-flow/application/ListLancamentos.js';
import { DeleteLancamento } from './modules/cash-flow/application/DeleteLancamento.js';
import { GetResumoPorTurno } from './modules/cash-flow/application/GetResumoPorTurno.js';
import { MySQLLancamentoFluxoCaixaRepository } from './modules/cash-flow/infrastructure/MySQLLancamentoFluxoCaixaRepository.js';
import { FluxoCaixaController } from './modules/cash-flow/infrastructure/http/FluxoCaixaController.js';
import { criarApp } from './app.js';

const pastaUploadsPadrao = join(dirname(fileURLToPath(import.meta.url)), '..', 'uploads');

export function montarAplicacao({ pool, jwtSecret, jwtExpiresIn = '12h', pastaUploads = pastaUploadsPadrao }) {
  const usuarioRepository = new MySQLUsuarioRepository(pool);
  const configuracaoRepository = new MySQLConfiguracaoRepository(pool);
  const hashService = new BcryptHashService();
  const tokenService = new JwtTokenService({ secret: jwtSecret, expiresIn: jwtExpiresIn });
  const auditoriaRepositorio = new MySQLAuditoriaRepository(pool);
  const auditor = new Auditor({ repositorio: auditoriaRepositorio });
  const logoStorage = new DiscoLogoStorage(pastaUploads);
  const deps = { usuarioRepository, hashService, tokenService, auditoriaService: auditor, auditor };

  const authController = new AuthController(new Login(deps));
  const usuariosController = new UsuariosController({
    listUsers: new ListUsers(deps),
    createUser: new CreateUser(deps),
    updateUser: new UpdateUser(deps),
    deactivateUser: new DeactivateUser(deps),
  });
  const configuracoesController = new ConfiguracoesController({
    getConfiguracoesPublicas: new GetConfiguracoesPublicas({ configuracaoRepository }),
    getConfiguracoes: new GetConfiguracoes({ configuracaoRepository }),
    updateConfiguracoes: new UpdateConfiguracoes({ configuracaoRepository, auditor }),
    uploadLogo: new UploadLogo({ configuracaoRepository, logoStorage, auditor }),
  });

  const auditoriaController = new AuditoriaController(new ListarAuditoria({ auditoriaRepositorio }));

  const caixaTurnoRepository = new MySQLCaixaTurnoRepository(pool);
  const fluxoCaixaRepository = new MySQLFluxoCaixaRepository(pool);
  const correcaoPendenteRepository = new MySQLCorrecaoPendenteRepository(pool);
  const depsCaixa = { caixaTurnoRepository, fluxoCaixaRepository, correcaoPendenteRepository, auditor };
  const caixaTurnoController = new CaixaTurnoController({
    getStatusCaixa: new GetStatusCaixa(depsCaixa),
    abrirCaixa: new AbrirCaixa(depsCaixa),
    preverFechamento: new PreverFechamento(depsCaixa),
    fecharCaixa: new FecharCaixa(depsCaixa),
  });

  const categoriaRepository = new MySQLCategoriaRepository(pool);
  const produtoRepository = new MySQLProdutoRepository(pool);
  const depsCategorias = { categoriaRepository, auditor };
  const depsProdutos = { produtoRepository, categoriaRepository, auditor };
  const categoriasController = new CategoriasController({
    listCategorias: new ListCategorias(depsCategorias),
    createCategoria: new CreateCategoria(depsCategorias),
    deactivateCategoria: new DeactivateCategoria(depsCategorias),
    reactivateCategoria: new ReactivateCategoria(depsCategorias),
  });
  const produtosController = new ProdutosController({
    listProdutos: new ListProdutos(depsProdutos),
    createProduto: new CreateProduto(depsProdutos),
    updateProduto: new UpdateProduto(depsProdutos),
    deactivateProduto: new DeactivateProduto(depsProdutos),
    reactivateProduto: new ReactivateProduto(depsProdutos),
  });

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
  const estoqueController = new EstoqueController({
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
  });
  const debitarEstoque = new DebitarEstoque({
    estoqueRepository,
    produtoRepository,
    obterOuCriarEstoqueDoDia,
  });
  const reverterDebito = new ReverterDebito({ estoqueRepository, obterOuCriarEstoqueDoDia });

  const perdaRepository = new MySQLPerdaRepository(pool);
  const depsPerdas = { perdaRepository, produtoRepository, debitarEstoque, reverterDebito, auditor };
  const perdasController = new PerdasController({
    createPerda: new CreatePerda(depsPerdas),
    listPerdas: new ListPerdas({ perdaRepository }),
    estornarPerda: new EstornarPerda(depsPerdas),
  });

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
  const vendasController = new VendasController({
    createSale: new CreateSale(depsVendas),
    listSales: new ListSales({ vendaRepository }),
    cancelSale: new CancelSale(depsVendas),
    resolverCorrecaoPendente: new ResolverCorrecaoPendente(depsVendas),
  });

  const lancamentoFluxoCaixaRepository = new MySQLLancamentoFluxoCaixaRepository(pool);
  const depsFluxo = {
    caixaTurnoRepository,
    lancamentoRepository: lancamentoFluxoCaixaRepository,
    fluxoCaixaRepository,
    auditor,
  };
  const fluxoCaixaController = new FluxoCaixaController({
    createLancamentoManual: new CreateLancamentoManual(depsFluxo),
    listLancamentos: new ListLancamentos({ lancamentoRepository: lancamentoFluxoCaixaRepository }),
    deleteLancamento: new DeleteLancamento({ lancamentoRepository: lancamentoFluxoCaixaRepository, auditor }),
    getResumoPorTurno: new GetResumoPorTurno(depsFluxo),
  });

  const app = criarApp({
    authController,
    usuariosController,
    tokenService,
    configuracoesController,
    auditoriaController,
    caixaTurnoController,
    categoriasController,
    produtosController,
    estoqueController,
    perdasController,
    vendasController,
    fluxoCaixaController,
    pastaUploads,
  });
  return { app, usuarioRepository, hashService, tokenService, auditor, debitarEstoque, reverterDebito };
}
