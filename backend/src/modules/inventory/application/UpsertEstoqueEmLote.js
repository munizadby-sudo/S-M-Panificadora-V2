import { dataHoje, normalizarData } from '../domain/EstoqueDiario.js';
import { ItemLoteInvalidoError, LoteInvalidoError } from '../domain/erros.js';

export class UpsertEstoqueEmLote {
  constructor({ upsertEstoque, estoqueRepository, auditor }) {
    this.upsertEstoque = upsertEstoque;
    this.estoqueRepository = estoqueRepository;
    this.auditor = auditor;
  }

  async executar(entrada, executor, ip = null) {
    const itens = entrada?.itens;
    if (!Array.isArray(itens) || itens.length === 0) {
      throw new LoteInvalidoError();
    }
    const dia =
      entrada.data === undefined || entrada.data === null || entrada.data === ''
        ? dataHoje()
        : normalizarData(entrada.data);

    const resultado = await this.estoqueRepository.comTransacao(async (conexao) => {
      let atualizados = 0;
      for (const item of itens) {
        const produtoId = item?.produto_id ?? item?.produtoId;
        try {
          await this.upsertEstoque.executar(
            {
              produtoId,
              data: dia,
              inicial: item.inicial,
              produzido: item.produzido,
              minimo: item.minimo,
            },
            executor,
            ip,
            conexao,
          );
          atualizados += 1;
        } catch (erro) {
          throw new ItemLoteInvalidoError(produtoId, erro);
        }
      }
      return { atualizados };
    });

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'upsert_estoque_lote',
        entidade: 'estoque_diario',
        entidadeId: null,
        estadoDepois: { data: dia, atualizados: resultado.atualizados },
        ip,
      });
    }

    return resultado;
  }
}
