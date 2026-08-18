import { apiGet, apiPost, ApiError } from '../../core/api.js';
import { getTurnoAtual, obterTurnoId } from './estado.js';
import { formatarMoeda } from '../../core/utils.js';

export async function obterPreviaFechamento() {
  return apiGet('/caixa-turno/preview-fechamento');
}

export function criarControleImpressao({ imprimir } = {}) {
  const executarImpressao = imprimir || imprimirHtml;
  let imprimiuComSucesso = false;
  let tentativaFalhou = false;
  let escolheuSemImpressao = false;

  return {
    confirmarHabilitado() {
      return imprimiuComSucesso || escolheuSemImpressao;
    },
    mostrarProsseguirSemImpressao() {
      return tentativaFalhou && !imprimiuComSucesso && !escolheuSemImpressao;
    },
    semImpressao() {
      return escolheuSemImpressao;
    },
    async imprimirPrevia(html) {
      try {
        await executarImpressao(html);
        imprimiuComSucesso = true;
        tentativaFalhou = false;
      } catch {
        tentativaFalhou = true;
      }
    },
    seguirSemImpressao() {
      if (!tentativaFalhou) {
        return false;
      }
      escolheuSemImpressao = true;
      return true;
    },
  };
}

export function dinheiro(valor) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

export function calcularRevisao({ esperado = {}, contado = {} } = {}) {
  const esperadoNorm = {
    dinheiro: dinheiro(esperado.dinheiro),
    pix: dinheiro(esperado.pix),
    cartao: dinheiro(esperado.cartao),
  };
  const contadoNorm = {
    dinheiro: dinheiro(Number(contado.dinheiro || 0) + Number(contado.moedas || 0)),
    pix: dinheiro(contado.pix),
    cartao: dinheiro(contado.cartao),
  };
  const diferenca = {
    dinheiro: dinheiro(contadoNorm.dinheiro - esperadoNorm.dinheiro),
    pix: dinheiro(contadoNorm.pix - esperadoNorm.pix),
    cartao: dinheiro(contadoNorm.cartao - esperadoNorm.cartao),
  };
  diferenca.total = dinheiro(diferenca.dinheiro + diferenca.pix + diferenca.cartao);

  return {
    esperado: esperadoNorm,
    contado: contadoNorm,
    diferenca,
    status_resumo: statusPorTotal(diferenca.total),
  };
}

export function contagemPreenchida(contado) {
  const campos = ['dinheiro', 'moedas', 'pix', 'cartao'];
  return campos.every((campo) => {
    const bruto = contado?.[campo];
    if (bruto === '' || bruto === null || bruto === undefined) {
      return false;
    }
    const valor = Number(bruto);
    return Number.isFinite(valor) && valor >= 0;
  });
}

/** @deprecated preferir htmlComprovanteRevisao — mantido para testes legados */
export function htmlPreviaImprimivel(previa) {
  return htmlComprovanteRevisao({
    periodo: previa?.periodo,
    turno_id: previa?.turno_id,
    esperado: previa?.esperado,
    contado: previa?.esperado,
    diferenca: { dinheiro: 0, pix: 0, cartao: 0, total: 0 },
    status_resumo: 'bateu certo',
  });
}

export function htmlComprovanteRevisao(revisao) {
  const esperado = revisao?.esperado || {};
  const contado = revisao?.contado || {};
  const diferenca = revisao?.diferenca || {};
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Comprovante de fechamento</title></head>
<body>
  <h1>Comprovante de fechamento</h1>
  <p>Turno ${escapar(revisao?.periodo || '')} — ${escapar(revisao?.turno_id ?? '')}</p>
  <h2>Esperado</h2>
  <p>Dinheiro: ${formatarMoeda(esperado.dinheiro)}</p>
  <p>Pix: ${formatarMoeda(esperado.pix)}</p>
  <p>Cartão: ${formatarMoeda(esperado.cartao)}</p>
  <h2>Contado</h2>
  <p>Dinheiro: ${formatarMoeda(contado.dinheiro)}</p>
  <p>Pix: ${formatarMoeda(contado.pix)}</p>
  <p>Cartão: ${formatarMoeda(contado.cartao)}</p>
  <h2>Diferença</h2>
  <p>${escapar(classificarDiferenca(revisao?.status_resumo))}</p>
  <p>Dinheiro: ${formatarMoeda(diferenca.dinheiro)}</p>
  <p>Pix: ${formatarMoeda(diferenca.pix)}</p>
  <p>Cartão: ${formatarMoeda(diferenca.cartao)}</p>
  <p>Total: ${formatarMoeda(diferenca.total)}</p>
</body></html>`;
}

export async function fecharTurno(entrada) {
  const turno_id = entrada?.turno_id ?? obterTurnoId();
  const resposta = await apiPost('/caixa-turno/fechar', { ...entrada, turno_id });
  await getTurnoAtual({ forcar: true });
  return resposta;
}

export function classificarDiferenca(statusResumo) {
  if (statusResumo === 'sobra') {
    return 'Sobra';
  }
  if (statusResumo === 'falta') {
    return 'Falta';
  }
  return 'Bateu certo';
}

export function mensagemErroFechamento(erro) {
  if (erro instanceof ApiError) {
    return erro.mensagem || erro.message;
  }
  return erro?.mensagem || erro?.message || 'Não foi possível fechar o turno.';
}

/**
 * Abre o comprovante e dispara o print.
 * Não usa noopener/noreferrer — com esses flags o Chrome devolve janela sem
 * document acessível e a aba fica em about:blank vazia (ISSUE-001).
 */
export async function imprimirHtml(html) {
  if (typeof globalThis.open !== 'function') {
    throw new Error('Impressão indisponível');
  }

  const janela = globalThis.open('', '_blank');
  if (!janela?.document) {
    throw new Error('Não foi possível abrir a janela de impressão');
  }

  janela.document.open();
  janela.document.write(String(html ?? ''));
  janela.document.close();
  janela.focus();

  if (typeof janela.print !== 'function') {
    throw new Error('Impressão indisponível');
  }
  janela.print();
}

function statusPorTotal(total) {
  const valor = dinheiro(total);
  if (valor > 0) {
    return 'sobra';
  }
  if (valor < 0) {
    return 'falta';
  }
  return 'bateu certo';
}

function escapar(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
