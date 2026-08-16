import { apiGet, apiPost, ApiError } from '../../core/api.js';
import { getTurnoAtual } from './estado.js';

const FUNDO_PADRAO_TODO = { fundo_especie: 40, fundo_moedas: 10 };

export async function obterFundoPadrao() {
  try {
    const cfg = await apiGet('/configuracoes');
    return {
      fundo_especie: Number(cfg.fundo_troco_especie ?? FUNDO_PADRAO_TODO.fundo_especie),
      fundo_moedas: Number(cfg.fundo_troco_moedas ?? FUNDO_PADRAO_TODO.fundo_moedas),
    };
  } catch {
    return { ...FUNDO_PADRAO_TODO };
  }
}

export async function abrirTurno({ fundo_especie, fundo_moedas }) {
  const resposta = await apiPost('/caixa-turno/abrir', {
    fundo_especie: Number(fundo_especie),
    fundo_moedas: Number(fundo_moedas),
  });
  await getTurnoAtual({ forcar: true });
  return resposta;
}

export function mensagemErroAbertura(erro) {
  if (erro instanceof ApiError) {
    return erro.mensagem || erro.message;
  }
  return erro?.mensagem || erro?.message || 'Não foi possível abrir o turno.';
}
