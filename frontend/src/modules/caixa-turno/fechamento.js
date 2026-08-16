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

export function htmlPreviaImprimivel(previa) {
  const esperado = previa?.esperado || {};
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Prévia de fechamento</title></head>
<body>
  <h1>Prévia de fechamento</h1>
  <p>Turno ${escapar(previa?.periodo || '')} — ${escapar(previa?.turno_id ?? '')}</p>
  <p>Dinheiro: ${formatarMoeda(esperado.dinheiro)}</p>
  <p>Pix: ${formatarMoeda(esperado.pix)}</p>
  <p>Cartão: ${formatarMoeda(esperado.cartao)}</p>
</body></html>`;
}

export function htmlResumoImprimivel(resumo) {
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Resumo de fechamento</title></head>
<body>
  <h1>Resumo do turno</h1>
  <p>${escapar(classificarDiferenca(resumo?.status_resumo))}</p>
  <p>Diferença total: ${formatarMoeda(resumo?.diferenca?.total)}</p>
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

export async function imprimirHtml(html) {
  if (typeof globalThis.window?.print !== 'function' && typeof globalThis.print !== 'function') {
    throw new Error('Impressão indisponível');
  }
  const janela = globalThis.open?.('', '_blank', 'noopener,noreferrer');
  if (!janela?.document) {
    throw new Error('Não foi possível abrir a janela de impressão');
  }
  janela.document.write(html);
  janela.document.close();
  janela.focus();
  janela.print();
}

function escapar(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
