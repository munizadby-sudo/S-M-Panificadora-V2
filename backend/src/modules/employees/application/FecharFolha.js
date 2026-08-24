import { normalizarData } from '../../inventory/domain/EstoqueDiario.js';
import { FolhaPagamento } from '../domain/FolhaPagamento.js';
import {
  FolhaJaFechadaError,
  FuncionarioNaoEncontradoError,
  PeriodoFolhaInvalidoError,
} from '../domain/erros.js';

export class FecharFolha {
  constructor({
    folhaPagamentoRepository,
    funcionarioRepository,
    adiantamentoRepository,
    ocorrenciaFolhaRepository,
    auditor,
  }) {
    this.folhaPagamentoRepository = folhaPagamentoRepository;
    this.funcionarioRepository = funcionarioRepository;
    this.adiantamentoRepository = adiantamentoRepository;
    this.ocorrenciaFolhaRepository = ocorrenciaFolhaRepository;
    this.auditor = auditor;
  }

  async executar(entrada, executor, ip = null) {
    const funcionarioId = Number(entrada?.funcionario_id ?? entrada?.funcionarioId);
    let periodoInicio;
    let periodoFim;
    try {
      periodoInicio = normalizarData(entrada?.periodo_inicio ?? entrada?.periodoInicio);
      periodoFim = normalizarData(entrada?.periodo_fim ?? entrada?.periodoFim);
    } catch {
      throw new PeriodoFolhaInvalidoError();
    }
    if (periodoInicio > periodoFim) {
      throw new PeriodoFolhaInvalidoError('periodo_inicio deve ser anterior ou igual a periodo_fim.');
    }

    const funcionario = await this.funcionarioRepository.buscarPorId(funcionarioId);
    if (!funcionario) {
      throw new FuncionarioNaoEncontradoError();
    }

    const existente = await this.folhaPagamentoRepository.buscarPorFuncionarioEPeriodo(
      funcionarioId,
      periodoInicio,
      periodoFim,
    );
    if (existente) {
      throw new FolhaJaFechadaError();
    }

    const totalAdiantamentos = await this.adiantamentoRepository.somarPorFuncionarioNoPeriodo(
      funcionarioId,
      periodoInicio,
      periodoFim,
    );
    const totaisOcorrencias = await this.ocorrenciaFolhaRepository.somarPorTipoNoPeriodo(
      funcionarioId,
      periodoInicio,
      periodoFim,
    );

    const folha = new FolhaPagamento({
      funcionarioId,
      periodoInicio,
      periodoFim,
      salarioBase: funcionario.salarioBase,
      totalAdiantamentos,
      totalFaltas: totaisOcorrencias.faltas,
      totalHorasExtras: totaisOcorrencias.horasExtras,
      status: 'pendente',
      usuarioId: executor?.id,
    });

    let salva;
    try {
      salva = await this.folhaPagamentoRepository.salvar(folha);
    } catch (erro) {
      if (Number(erro?.errno) === 1062 || /Duplicate entry/i.test(String(erro?.message || ''))) {
        throw new FolhaJaFechadaError();
      }
      throw erro;
    }

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id,
        acao: 'fechar_folha',
        entidade: 'folha_pagamento',
        entidadeId: salva.id,
        estadoDepois: salva.paraPublico({ funcionarioNome: funcionario.nome }),
        ip,
      });
    }

    return { folha: salva, funcionario };
  }
}
