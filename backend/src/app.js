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
  categoriasController,
  produtosController,
  estoqueController,
  perdasController,
  vendasController,
  fluxoCaixaController,
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

  if (categoriasController) {
    const permissaoProdutos = [exigirAuth, temPermissao('produtos')];
    app.get('/api/categorias', exigirAuth, (req, res, next) => {
      categoriasController.listar(req, res, next);
    });
    app.post('/api/categorias', ...permissaoProdutos, (req, res, next) => {
      categoriasController.criar(req, res, next);
    });
    app.post('/api/categorias/:id/reativar', ...soAdmin, (req, res, next) => {
      categoriasController.reativar(req, res, next);
    });
    app.delete('/api/categorias/:id', ...soAdmin, (req, res, next) => {
      categoriasController.desativar(req, res, next);
    });
  }

  if (produtosController) {
    const permissaoProdutos = [exigirAuth, temPermissao('produtos')];
    app.get('/api/produtos', exigirAuth, (req, res, next) => {
      produtosController.listar(req, res, next);
    });
    app.post('/api/produtos', ...permissaoProdutos, (req, res, next) => {
      produtosController.criar(req, res, next);
    });
    app.put('/api/produtos/:id', ...permissaoProdutos, (req, res, next) => {
      produtosController.atualizar(req, res, next);
    });
    app.post('/api/produtos/:id/reativar', ...soAdmin, (req, res, next) => {
      produtosController.reativar(req, res, next);
    });
    app.delete('/api/produtos/:id', ...soAdmin, (req, res, next) => {
      produtosController.desativar(req, res, next);
    });
  }

  if (estoqueController) {
    const permissaoEstoque = [exigirAuth, temPermissao('estoque')];
    app.get('/api/estoque', exigirAuth, (req, res, next) => {
      estoqueController.listar(req, res, next);
    });
    if (estoqueController.upsertEstoqueEmLote) {
      app.post('/api/estoque/lote', ...permissaoEstoque, (req, res, next) => {
        estoqueController.upsertLote(req, res, next);
      });
    }
    if (estoqueController.upsertEstoque) {
      app.put('/api/estoque/:produtoId', ...permissaoEstoque, (req, res, next) => {
        estoqueController.upsert(req, res, next);
      });
    }
  }

  if (perdasController) {
    const permissaoPerdas = [exigirAuth, temPermissao('perdas')];
    app.post('/api/perdas', ...permissaoPerdas, (req, res, next) => {
      perdasController.criar(req, res, next);
    });
    app.get('/api/perdas', ...permissaoPerdas, (req, res, next) => {
      perdasController.listar(req, res, next);
    });
    app.delete('/api/perdas/:id', ...soAdmin, (req, res, next) => {
      perdasController.estornar(req, res, next);
    });
  }

  if (vendasController) {
    const permissaoCaixa = [exigirAuth, temPermissao('caixa')];
    app.post('/api/vendas/correcoes/:id/resolver', ...soAdmin, (req, res, next) => {
      vendasController.resolverCorrecao(req, res, next);
    });
    app.post('/api/vendas', ...permissaoCaixa, (req, res, next) => {
      vendasController.criar(req, res, next);
    });
    app.get('/api/vendas', ...permissaoCaixa, (req, res, next) => {
      vendasController.listar(req, res, next);
    });
    app.delete('/api/vendas/:id', ...soAdmin, (req, res, next) => {
      vendasController.cancelar(req, res, next);
    });
  }

  if (fluxoCaixaController) {
    const permissaoFluxo = [exigirAuth, temPermissao('fluxo')];
    app.post('/api/fluxo-caixa', ...permissaoFluxo, (req, res, next) => {
      fluxoCaixaController.criar(req, res, next);
    });
    app.get('/api/fluxo-caixa/resumo', ...permissaoFluxo, (req, res, next) => {
      fluxoCaixaController.resumo(req, res, next);
    });
    app.get('/api/fluxo-caixa', ...permissaoFluxo, (req, res, next) => {
      fluxoCaixaController.listar(req, res, next);
    });
    app.delete('/api/fluxo-caixa/:id', ...permissaoFluxo, (req, res, next) => {
      fluxoCaixaController.excluir(req, res, next);
    });
  }

  app.use(mapeadorDeErros);
  return app;
}
