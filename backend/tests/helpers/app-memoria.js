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
import { criarApp } from '../../src/app.js';
import { MemoriaUsuarioRepository } from './MemoriaUsuarioRepository.js';
import { MemoriaConfiguracaoRepository } from './MemoriaConfiguracaoRepository.js';
import { MemoriaAuditoriaRepositorio } from './MemoriaAuditoriaRepositorio.js';
import {
  MemoriaCaixaTurnoRepository,
  MemoriaCorrecaoPendenteRepository,
  MemoriaFluxoCaixaRepository,
} from './MemoriaCaixaTurnoRepository.js';

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
  const fluxoCaixaRepository = new MemoriaFluxoCaixaRepository();
  const correcaoPendenteRepository = new MemoriaCorrecaoPendenteRepository();
  const depsCaixa = { caixaTurnoRepository, fluxoCaixaRepository, correcaoPendenteRepository, auditor };

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
