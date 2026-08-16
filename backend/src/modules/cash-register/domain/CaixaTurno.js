export function dinheiro(valor) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

export class CaixaTurno {
  constructor({
    id = null,
    data,
    periodo,
    status = 'aberto',
    abertoPor,
    abertoEm = null,
    fundoEspecie = 0,
    fundoMoedas = 0,
    fechadoPor = null,
    fechadoEm = null,
    esperado = null,
    contado = null,
    diferenca = null,
    observacao = null,
  }) {
    if (Number(fundoEspecie) < 0 || Number(fundoMoedas) < 0) {
      throw new Error('Fundo de caixa não pode ser negativo.');
    }

    this.id = id;
    this.data = data;
    this.periodo = periodo;
    this.status = status;
    this.abertoPor = abertoPor;
    this.abertoEm = abertoEm;
    this.fundoEspecie = dinheiro(fundoEspecie);
    this.fundoMoedas = dinheiro(fundoMoedas);
    this.fechadoPor = fechadoPor;
    this.fechadoEm = fechadoEm;
    this.esperado = esperado;
    this.contado = contado;
    this.diferenca = diferenca;
    this.observacao = observacao;
  }

  estaAberto() {
    return this.status === 'aberto';
  }

  calcularFundoTotal() {
    return dinheiro(this.fundoEspecie + this.fundoMoedas);
  }
}
