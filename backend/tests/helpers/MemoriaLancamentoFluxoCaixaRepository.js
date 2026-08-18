import { LancamentoFluxoCaixa } from '../../src/modules/cash-flow/domain/LancamentoFluxoCaixa.js';
import { LancamentoFluxoCaixaRepository } from '../../src/modules/cash-flow/application/ports.js';

export class MemoriaLancamentoFluxoCaixaRepository extends LancamentoFluxoCaixaRepository {
  constructor(lancamentos = [], { idProvider } = {}) {
    super();
    this.lancamentos = lancamentos;
    this.idProvider = idProvider;
  }

  async salvar(lancamento) {
    const id = this.idProvider ? this.idProvider.proximoIdentificador() : proximoIdDisponivel(this.lancamentos);
    const salvo = LancamentoFluxoCaixa.reconstituir({
      id,
      usuarioId: lancamento.usuarioId,
      turnoId: lancamento.turnoId,
      tipo: lancamento.tipo,
      descricao: lancamento.descricao,
      categoria: lancamento.categoria,
      forma: lancamento.forma,
      valor: lancamento.valor,
      data: lancamento.data,
      geradoAuto: false,
      ativo: true,
      criadoEm: new Date().toISOString(),
    });
    this.lancamentos.push(salvo);
    return salvo;
  }

  async buscarPorId(id) {
    const encontrado = this.lancamentos.find((item) => item.id === Number(id));
    if (!encontrado) {
      return null;
    }
    return normalizarLancamento(encontrado);
  }

  async listar(filtros) {
    let itens = this.lancamentos.filter((item) => correspondeFiltros(item, filtros));
    itens = [...itens].sort((a, b) => {
      const da = new Date(a.criadoEm || 0).getTime();
      const db = new Date(b.criadoEm || 0).getTime();
      return db - da || b.id - a.id;
    });
    const total = itens.length;
    const offset = (filtros.page - 1) * filtros.limit;
    const pagina = itens.slice(offset, offset + filtros.limit);
    return {
      data: pagina.map((item) => normalizarLancamento(item).paraListagem()),
      total,
    };
  }

  async marcarExcluido(lancamento) {
    const item = this.lancamentos.find((entry) => entry.id === lancamento.id);
    if (!item) {
      return lancamento;
    }
    const normalizado = normalizarLancamento(item);
    if (!normalizado.ativo) {
      return normalizado;
    }
    normalizado.marcarExcluido({
      excluidoPor: lancamento.excluidoPor,
      motivoExclusao: lancamento.motivoExclusao,
      excluidoEm: lancamento.excluidoEm,
    });
    Object.assign(item, {
      ativo: false,
      excluidoPor: normalizado.excluidoPor,
      excluidoEm: normalizado.excluidoEm,
      motivoExclusao: normalizado.motivoExclusao,
    });
    return normalizado;
  }
}

function correspondeFiltros(item, filtros) {
  const lancamento = normalizarLancamento(item);
  if (filtros.ativo !== undefined && lancamento.ativo !== filtros.ativo) {
    return false;
  }
  if (filtros.turnoId !== undefined && lancamento.turnoId !== filtros.turnoId) {
    return false;
  }
  if (filtros.categoria && lancamento.categoria !== filtros.categoria) {
    return false;
  }
  if (filtros.tipo && lancamento.tipo !== filtros.tipo) {
    return false;
  }
  if (filtros.geradoAuto !== undefined && lancamento.geradoAuto !== filtros.geradoAuto) {
    return false;
  }
  if (filtros.dataInicio && lancamento.data < filtros.dataInicio) {
    return false;
  }
  if (filtros.dataFim && lancamento.data > filtros.dataFim) {
    return false;
  }
  return true;
}

function proximoIdDisponivel(lancamentos) {
  return lancamentos.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function normalizarLancamento(item) {
  if (item.paraListagem && item.marcarExcluido) {
    return item;
  }
  return LancamentoFluxoCaixa.reconstituir({
    id: item.id,
    usuarioId: item.usuarioId ?? item.usuario_id,
    turnoId: item.turnoId ?? item.turno_id,
    tipo: item.tipo,
    descricao: item.descricao,
    categoria: item.categoria,
    forma: item.forma,
    valor: item.valor,
    data: item.data,
    geradoAuto: item.geradoAuto ?? item.gerado_auto ?? false,
    ativo: item.ativo ?? 1,
    vendaId: item.vendaId ?? item.venda_id ?? null,
    criadoEm: item.criadoEm ?? item.criado_em ?? null,
    excluidoPor: item.excluidoPor ?? item.excluido_por ?? null,
    excluidoEm: item.excluidoEm ?? item.excluido_em ?? null,
    motivoExclusao: item.motivoExclusao ?? item.motivo_exclusao ?? null,
  });
}
