import { ehChaveConhecida } from '../domain/chaves.js';
import { ChaveConfiguracaoInvalidaError } from '../domain/erros.js';

export class UpdateConfiguracoes {
  constructor({ configuracaoRepository, auditor }) {
    this.configuracaoRepository = configuracaoRepository;
    this.auditor = auditor;
  }

  async executar(payload, executor, ip = null) {
    const entradas = Object.entries(payload || {});
    for (const [chave] of entradas) {
      if (!ehChaveConhecida(chave)) {
        throw new ChaveConfiguracaoInvalidaError(chave);
      }
    }

    const antes = await mapaAtual(this.configuracaoRepository);
    const alteradas = {};

    for (const [chave, valor] of entradas) {
      const serializado = valor == null ? '' : String(valor);
      if (String(antes[chave] ?? '') === serializado) {
        continue;
      }
      await this.configuracaoRepository.upsert(chave, serializado, executor?.id ?? null);
      alteradas[chave] = { de: antes[chave] ?? null, para: serializado };
    }

    if (Object.keys(alteradas).length > 0 && this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id ?? null,
        acao: 'atualizar_configuracoes',
        entidade: 'configuracoes',
        entidadeId: null,
        estadoAntes: Object.fromEntries(Object.entries(alteradas).map(([chave, v]) => [chave, v.de])),
        estadoDepois: Object.fromEntries(Object.entries(alteradas).map(([chave, v]) => [chave, v.para])),
        ip,
      });
    }
  }
}

async function mapaAtual(repositorio) {
  const linhas = await repositorio.listar();
  return Object.fromEntries(linhas.map((linha) => [linha.chave, linha.valor]));
}
