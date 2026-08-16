import express from 'express';
import rateLimit from 'express-rate-limit';
import { mapeadorDeErros } from './shared/http/mapeadorDeErros.js';
import { autenticar, apenasAdmin, temPermissao } from './shared/http/middlewares.js';
import { uploadCampoLogo } from './shared/http/uploadLogo.js';

export function criarLimitadorLogin() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ erro: 'Muitas tentativas. Tente novamente em alguns minutos.' });
    },
  });
}

export function criarApp({
  authController,
  usuariosController,
  tokenService,
  configuracoesController,
  auditoriaController,
  caixaTurnoController,
  pastaUploads,
  limitadorLogin = criarLimitadorLogin(),
}) {
  const app = express();
  app.use(express.json());
  if (pastaUploads) {
    app.use('/uploads', express.static(pastaUploads));
  }
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  const exigirAuth = autenticar(tokenService);

  app.post('/api/auth/login', limitadorLogin, (req, res, next) => {
    authController.entrar(req, res, next);
  });

  app.get('/api/auth/me', exigirAuth, (req, res) => {
    res.json({ usuario: req.usuario });
  });

  const soAdmin = [exigirAuth, apenasAdmin];

  app.get('/api/usuarios', ...soAdmin, (req, res, next) => {
    usuariosController.listar(req, res, next);
  });
  app.post('/api/usuarios', ...soAdmin, (req, res, next) => {
    usuariosController.criar(req, res, next);
  });
  app.put('/api/usuarios/:id', ...soAdmin, (req, res, next) => {
    usuariosController.atualizar(req, res, next);
  });
  app.delete('/api/usuarios/:id', ...soAdmin, (req, res, next) => {
    usuariosController.desativar(req, res, next);
  });

  if (configuracoesController) {
    app.get('/api/configuracoes/publico', (req, res, next) => {
      configuracoesController.publico(req, res, next);
    });
    app.get('/api/configuracoes', exigirAuth, (req, res, next) => {
      configuracoesController.obter(req, res, next);
    });
    app.put('/api/configuracoes', ...soAdmin, (req, res, next) => {
      configuracoesController.atualizar(req, res, next);
    });
    app.post('/api/configuracoes/logo', ...soAdmin, uploadCampoLogo, (req, res, next) => {
      configuracoesController.enviarLogo(req, res, next);
    });
  }

  if (auditoriaController) {
    app.get('/api/auditoria', ...soAdmin, (req, res, next) => {
      auditoriaController.listar(req, res, next);
    });
  }

  if (caixaTurnoController) {
    const permissaoCaixa = [exigirAuth, temPermissao('caixa')];
    app.get('/api/caixa-turno/status', ...permissaoCaixa, (req, res, next) => {
      caixaTurnoController.status(req, res, next);
    });
    app.post('/api/caixa-turno/abrir', ...permissaoCaixa, (req, res, next) => {
      caixaTurnoController.abrir(req, res, next);
    });
    app.get('/api/caixa-turno/preview-fechamento', ...permissaoCaixa, (req, res, next) => {
      caixaTurnoController.preview(req, res, next);
    });
    app.post('/api/caixa-turno/fechar', ...permissaoCaixa, (req, res, next) => {
      caixaTurnoController.fechar(req, res, next);
    });
  }

  app.use(mapeadorDeErros);
  return app;
}
