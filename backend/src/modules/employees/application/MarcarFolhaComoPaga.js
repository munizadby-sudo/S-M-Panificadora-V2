import { FolhaNaoEncontradaError } from '../domain/erros.js';

export class MarcarFolhaComoPaga {
  constructor({ folhaPagamentoRepository, auditor }) {
    this.folhaPagamentoRepository = folhaPagamentoRepository;
    this.auditor = auditor;
  }

  async executar({ id }, executor, ip = null) {
    const folha = await this.folhaPagamentoRepository.buscarPorId(Number(id));
    if (!folha) {
      throw new FolhaNaoEncontradaError();
    }

    if (folha.status === 'paga') {
      return folha;
    }

    folha.marcarComoPaga(new Date());
    const salva = await this.folhaPagamentoRepository.atualizar(folha);

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'marcar_folha_paga',
        entidade: 'folha_pagamento',
        entidadeId: salva.id,
        estadoDepois: { status: 'paga', pago_em: salva.pagoEm },
        ip,
      });
    }

    return salva;
  }
}
