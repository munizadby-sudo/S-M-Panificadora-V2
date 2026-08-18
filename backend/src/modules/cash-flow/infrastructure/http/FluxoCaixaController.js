export class FluxoCaixaController {
  constructor({ createLancamentoManual, listLancamentos, deleteLancamento, getResumoPorTurno }) {
    this.createLancamentoManual = createLancamentoManual;
    this.listLancamentos = listLancamentos;
    this.deleteLancamento = deleteLancamento;
    this.getResumoPorTurno = getResumoPorTurno;
  }

  async criar(req, res, next) {
    try {
      const salvo = await this.createLancamentoManual.executar(
        req.body || {},
        req.usuario,
        ipDaRequisicao(req),
      );
      res.json(salvo.paraCriacao());
    } catch (erro) {
      next(erro);
    }
  }

  async listar(req, res, next) {
    try {
      const resultado = await this.listLancamentos.executar(req.query || {});
      res.json(resultado);
    } catch (erro) {
      next(erro);
    }
  }

  async excluir(req, res, next) {
    try {
      await this.deleteLancamento.executar(
        { id: req.params.id, motivo: req.body?.motivo },
        req.usuario,
        ipDaRequisicao(req),
      );
      res.json({ mensagem: 'Lançamento excluído.' });
    } catch (erro) {
      next(erro);
    }
  }

  async resumo(req, res, next) {
    try {
      const resultado = await this.getResumoPorTurno.executar(req.query || {});
      res.json(resultado);
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
