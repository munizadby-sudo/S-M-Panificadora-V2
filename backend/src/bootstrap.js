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
import { CorrecaoPendenteRepository } from './modules/cash-register/application/ports.js';
import { MySQLCaixaTurnoRepository, MySQLFluxoCaixaRepository } from './modules/cash-register/infrastructure/MySQLCaixaTurnoRepository.js';
import { CaixaTurnoController } from './modules/cash-register/infrastructure/http/CaixaTurnoController.js';
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
  const correcaoPendenteRepository = new CorrecaoPendenteRepository();
  const depsCaixa = { caixaTurnoRepository, fluxoCaixaRepository, correcaoPendenteRepository, auditor };
  const caixaTurnoController = new CaixaTurnoController({
    getStatusCaixa: new GetStatusCaixa(depsCaixa),
    abrirCaixa: new AbrirCaixa(depsCaixa),
    preverFechamento: new PreverFechamento(depsCaixa),
    fecharCaixa: new FecharCaixa(depsCaixa),
  });

  const app = criarApp({
    authController,
    usuariosController,
    tokenService,
    configuracoesController,
    auditoriaController,
    caixaTurnoController,
    pastaUploads,
  });
  return { app, usuarioRepository, hashService, tokenService, auditor };
}
