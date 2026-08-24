export class RelatoriosController {
  constructor({
    relatorioVendas,
    relatorioFechamentoCaixa,
    curvaABCProdutos,
    relatorioResultado,
    relatorioVendasPorHora,
  }) {
    this.relatorioVendas = relatorioVendas;
    this.relatorioFechamentoCaixa = relatorioFechamentoCaixa;
    this.curvaABCProdutos = curvaABCProdutos;
    this.relatorioResultado = relatorioResultado;
    this.relatorioVendasPorHora = relatorioVendasPorHora;
  }

  async vendas(req, res, next) {
    try {
      const resultado = await this.relatorioVendas.executar(req.query || {});
      res.json(resultado);
    } catch (erro) {
      next(erro);
    }
  }

  async fechamentoCaixa(req, res, next) {
    try {
      const resultado = await this.relatorioFechamentoCaixa.executar(req.query || {});
      res.json(resultado);
    } catch (erro) {
      next(erro);
    }
  }

  async curvaAbc(req, res, next) {
    try {
      const resultado = await this.curvaABCProdutos.executar(req.query || {});
      res.json(resultado);
    } catch (erro) {
      next(erro);
    }
  }

  async resultado(req, res, next) {
    try {
      const resultado = await this.relatorioResultado.executar(req.query || {});
      res.json(resultado);
    } catch (erro) {
      next(erro);
    }
  }

  async vendasPorHora(req, res, next) {
    try {
      const resultado = await this.relatorioVendasPorHora.executar(req.query || {});
      res.json(resultado);
    } catch (erro) {
      next(erro);
    }
  }
}
