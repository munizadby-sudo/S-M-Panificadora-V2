import { dinheiro } from './CaixaTurno.js';

export function calcularFechamento({ fundoEspecie = 0, fundoMoedas = 0, totaisPorForma = [], contado = {} } = {}) {
  const net = { dinheiro: 0, pix: 0, cartao: 0 };
  for (const item of totaisPorForma) {
    const forma = item.forma;
    if (forma in net) {
      net[forma] = dinheiro(item.total);
    }
  }

  const esperado = {
    dinheiro: dinheiro(Number(fundoEspecie) + Number(fundoMoedas) + net.dinheiro),
    pix: dinheiro(net.pix),
    cartao: dinheiro(net.cartao),
  };

  const contadoDinheiro = dinheiro(Number(contado.dinheiro || 0) + Number(contado.moedas || 0));
  const contadoNormalizado = {
    dinheiro: contadoDinheiro,
    pix: dinheiro(contado.pix),
    cartao: dinheiro(contado.cartao),
  };

  const diferenca = {
    dinheiro: dinheiro(contadoNormalizado.dinheiro - esperado.dinheiro),
    pix: dinheiro(contadoNormalizado.pix - esperado.pix),
    cartao: dinheiro(contadoNormalizado.cartao - esperado.cartao),
  };
  diferenca.total = dinheiro(diferenca.dinheiro + diferenca.pix + diferenca.cartao);

  return {
    esperado,
    contado: contadoNormalizado,
    diferenca,
    statusResumo: classificarStatusResumo(diferenca.total),
  };
}

export function classificarStatusResumo(total) {
  const valor = dinheiro(total);
  if (valor > 0) {
    return 'sobra';
  }
  if (valor < 0) {
    return 'falta';
  }
  return 'bateu certo';
}
