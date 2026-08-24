import { dinheiro } from '../../cash-register/domain/CaixaTurno.js';
import { calcularStatusResumo } from '../domain/calcularStatusResumo.js';
import { validarPeriodo } from './validarPeriodo.js';

export class RelatorioFechamentoCaixa {
  constructor({ caixaTurnoRepository }) {
    this.caixaTurnoRepository = caixaTurnoRepository;
  }

  async executar({ data_inicio, data_fim } = {}) {
    const { dataInicio, dataFim } = validarPeriodo({ data_inicio, data_fim });
    const turnos = await this.caixaTurnoRepository.listarFechadosNoPeriodo(dataInicio, dataFim);

    const linhas = turnos.map((turno) => {
      const esperado = normalizarFormas(turno.esperado);
      const contado = normalizarContado(turno.contado);
      const diferenca = normalizarDiferenca(turno.diferenca);
      return {
        id: turno.id,
        data: turno.data,
        periodo: turno.periodo,
        esperado,
        contado,
        diferenca,
        status_resumo: calcularStatusResumo(diferenca.total),
      };
    });

    let esperadoTotal = 0;
    let contadoTotal = 0;
    let diferencaTotal = 0;
    for (const linha of linhas) {
      esperadoTotal = dinheiro(esperadoTotal + totalFormas(linha.esperado));
      contadoTotal = dinheiro(contadoTotal + totalFormas(linha.contado));
      diferencaTotal = dinheiro(diferencaTotal + Number(linha.diferenca.total || 0));
    }

    return {
      turnos: linhas,
      resumo_periodo: {
        esperado_total: esperadoTotal,
        contado_total: contadoTotal,
        diferenca_total: diferencaTotal,
      },
    };
  }
}

function normalizarFormas(valores = {}) {
  return {
    dinheiro: dinheiro(valores?.dinheiro),
    pix: dinheiro(valores?.pix),
    cartao: dinheiro(valores?.cartao),
  };
}

function normalizarContado(valores = {}) {
  return {
    dinheiro: dinheiro(Number(valores?.dinheiro || 0) + Number(valores?.moedas || 0)),
    pix: dinheiro(valores?.pix),
    cartao: dinheiro(valores?.cartao),
  };
}

function normalizarDiferenca(valores = {}) {
  const dinheiroValor = dinheiro(valores?.dinheiro);
  const pix = dinheiro(valores?.pix);
  const cartao = dinheiro(valores?.cartao);
  const total =
    valores?.total != null ? dinheiro(valores.total) : dinheiro(dinheiroValor + pix + cartao);
  return { dinheiro: dinheiroValor, pix, cartao, total };
}

function totalFormas(formas = {}) {
  return dinheiro(Number(formas.dinheiro || 0) + Number(formas.pix || 0) + Number(formas.cartao || 0));
}
