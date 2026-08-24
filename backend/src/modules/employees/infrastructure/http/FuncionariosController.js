export class FuncionariosController {
  constructor({
    listFuncionarios,
    createFuncionario,
    updateFuncionario,
    deactivateFuncionario,
    reactivateFuncionario,
    createAdiantamento,
    listAdiantamentos,
    createOcorrenciaFolha,
    listOcorrenciasFolha,
    fecharFolha,
    listFolhas,
    marcarFolhaComoPaga,
  }) {
    this.listFuncionarios = listFuncionarios;
    this.createFuncionario = createFuncionario;
    this.updateFuncionario = updateFuncionario;
    this.deactivateFuncionario = deactivateFuncionario;
    this.reactivateFuncionario = reactivateFuncionario;
    this.createAdiantamento = createAdiantamento;
    this.listAdiantamentos = listAdiantamentos;
    this.createOcorrenciaFolha = createOcorrenciaFolha;
    this.listOcorrenciasFolha = listOcorrenciasFolha;
    this.fecharFolha = fecharFolha;
    this.listFolhas = listFolhas;
    this.marcarFolhaComoPaga = marcarFolhaComoPaga;
  }

  async listar(req, res, next) {
    try {
      const resultado = await this.listFuncionarios.executar(req.query || {});
      res.json({
        data: resultado.data.map((item) => item.paraPublico()),
        pagination: resultado.pagination,
      });
    } catch (erro) {
      next(erro);
    }
  }

  async criar(req, res, next) {
    try {
      const salvo = await this.createFuncionario.executar(
        req.body || {},
        req.usuario,
        ipDaRequisicao(req),
      );
      res.json(salvo.paraPublico());
    } catch (erro) {
      next(erro);
    }
  }

  async atualizar(req, res, next) {
    try {
      const salvo = await this.updateFuncionario.executar(
        { id: req.params.id, ...(req.body || {}) },
        req.usuario,
        ipDaRequisicao(req),
      );
      res.json(salvo.paraPublico());
    } catch (erro) {
      next(erro);
    }
  }

  async desativar(req, res, next) {
    try {
      await this.deactivateFuncionario.executar(
        { id: req.params.id },
        req.usuario,
        ipDaRequisicao(req),
      );
      res.json({ mensagem: 'Funcionário desativado.' });
    } catch (erro) {
      next(erro);
    }
  }

  async reativar(req, res, next) {
    try {
      await this.reactivateFuncionario.executar(
        { id: req.params.id },
        req.usuario,
        ipDaRequisicao(req),
      );
      res.json({ mensagem: 'Funcionário reativado.' });
    } catch (erro) {
      next(erro);
    }
  }

  async criarAdiantamento(req, res, next) {
    try {
      const { adiantamento, funcionario } = await this.createAdiantamento.executar(
        req.body || {},
        req.usuario,
        ipDaRequisicao(req),
      );
      res.json(adiantamento.paraPublico({ funcionarioNome: funcionario.nome }));
    } catch (erro) {
      next(erro);
    }
  }

  async listarAdiantamentos(req, res, next) {
    try {
      const resultado = await this.listAdiantamentos.executar(req.query || {});
      res.json({
        data: resultado.data.map((item) =>
          item.paraPublico({ funcionarioNome: item.funcionarioNome }),
        ),
        pagination: resultado.pagination,
      });
    } catch (erro) {
      next(erro);
    }
  }

  async criarOcorrencia(req, res, next) {
    try {
      const { ocorrencia, funcionario } = await this.createOcorrenciaFolha.executar(
        req.body || {},
        req.usuario,
        ipDaRequisicao(req),
      );
      res.json(ocorrencia.paraPublico({ funcionarioNome: funcionario.nome }));
    } catch (erro) {
      next(erro);
    }
  }

  async listarOcorrencias(req, res, next) {
    try {
      const resultado = await this.listOcorrenciasFolha.executar(req.query || {});
      res.json({
        data: resultado.data.map((item) =>
          item.paraPublico({ funcionarioNome: item.funcionarioNome }),
        ),
        pagination: resultado.pagination,
      });
    } catch (erro) {
      next(erro);
    }
  }

  async fechar(req, res, next) {
    try {
      const { folha, funcionario } = await this.fecharFolha.executar(
        req.body || {},
        req.usuario,
        ipDaRequisicao(req),
      );
      res.json(folha.paraPublico({ funcionarioNome: funcionario.nome }));
    } catch (erro) {
      next(erro);
    }
  }

  async listarFolhas(req, res, next) {
    try {
      const resultado = await this.listFolhas.executar(req.query || {});
      res.json({
        data: resultado.data.map((item) =>
          item.paraPublico({ funcionarioNome: item.funcionarioNome }),
        ),
        pagination: resultado.pagination,
      });
    } catch (erro) {
      next(erro);
    }
  }

  async marcarPaga(req, res, next) {
    try {
      const folha = await this.marcarFolhaComoPaga.executar(
        { id: req.params.id },
        req.usuario,
        ipDaRequisicao(req),
      );
      res.json(folha.paraPublico({ funcionarioNome: folha.funcionarioNome }));
    } catch (erro) {
      next(erro);
    }
  }
}

function ipDaRequisicao(req) {
  const encaminhado = req.headers?.['x-forwarded-for'];
  if (typeof encaminhado === 'string' && encaminhado.trim()) {
    return encaminhado.split(',')[0].trim();
  }
  return req.ip || null;
}
