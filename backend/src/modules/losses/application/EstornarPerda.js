import { PerdaNaoEncontradaError } from '../domain/erros.js';

export class EstornarPerda {
  constructor({ perdaRepository, reverterDebito, auditor }) {
    this.perdaRepository = perdaRepository;
    this.reverterDebito = reverterDebito;
    this.auditor = auditor;
  }

  async executar({ id }, executor, ip = null) {
    const estornada = await this.perdaRepository.comTransacao(async (conexao) => {
      const perda = await this.perdaRepository.buscarPorId(Number(id), conexao);
      if (!perda || !perda.ativo) {
        throw new PerdaNaoEncontradaError();
      }

      await this.reverterDebito.executar(
        conexao,
        perda.produtoId,
        perda.data,
        perda.quantidade,
      );

      perda.estornar();
      return this.perdaRepository.atualizar(perda, conexao);
    });

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'estornar_perda',
        entidade: 'perda',
        entidadeId: estornada.id,
        estadoDepois: { ativo: 0, produto_id: estornada.produtoId, data: estornada.data },
        ip,
      });
    }

    return estornada;
  }
}
