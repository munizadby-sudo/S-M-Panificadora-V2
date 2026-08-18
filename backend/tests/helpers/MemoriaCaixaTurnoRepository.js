import { CaixaTurno, dinheiro } from '../../src/modules/cash-register/domain/CaixaTurno.js';
import { CaixaTurnoRepository, FluxoCaixaRepository, CorrecaoPendenteRepository } from '../../src/modules/cash-register/application/ports.js';

export class MemoriaCaixaTurnoRepository extends CaixaTurnoRepository {
  constructor() {
    super();
    this.turnos = [];
    this.proximoId = 1;
  }

  async buscarTurnoAberto() {
    return this.turnos.find((item) => item.status === 'aberto') ?? null;
  }

  async buscarPorId(id) {
    return this.turnos.find((item) => item.id === Number(id)) ?? null;
  }

  async existeParaPeriodo(data, periodo) {
    return this.turnos.some((item) => item.data === data && item.periodo === periodo);
  }

  async salvar(turno) {
    const salvo = new CaixaTurno({
      ...turno,
      id: this.proximoId,
      abertoEm: new Date().toISOString(),
    });
    this.proximoId += 1;
    this.turnos.push(salvo);
    return salvo;
  }

  async fecharAtomico(id, dados) {
    const turno = await this.buscarPorId(id);
    if (!turno || turno.status !== 'aberto') {
      return { afetado: false };
    }
    turno.status = 'fechado';
    turno.fechadoPor = dados.fechadoPor;
    turno.fechadoEm = new Date().toISOString();
    turno.esperado = dados.esperado;
    turno.contado = dados.contado;
    turno.diferenca = dados.diferenca;
    turno.observacao = dados.observacao;
    return { afetado: true };
  }
}

export class MemoriaFluxoCaixaRepository extends FluxoCaixaRepository {
  constructor(lancamentos = []) {
    super();
    this.lancamentos = lancamentos;
    this.proximoId = proximoIdDisponivel(lancamentos);
  }

  lancamentoAtivo(item) {
    return item.ativo !== false && Number(item.ativo) !== 0;
  }

  proximoIdentificador() {
    const id = this.proximoId;
    this.proximoId += 1;
    return id;
  }

  async somarPorFormaETurno(turnoId, categorias = ['vendas', 'estorno']) {
    const net = {};
    for (const item of this.lancamentos) {
      if (
        item.turnoId !== turnoId ||
        !categorias.includes(item.categoria) ||
        !this.lancamentoAtivo(item)
      ) {
        continue;
      }
      const sinal = item.tipo === 'saida' ? -1 : 1;
      net[item.forma] = dinheiro((net[item.forma] || 0) + sinal * Number(item.valor));
    }
    return Object.entries(net).map(([forma, total]) => ({ forma, total }));
  }

  async agregarEntradasSaidasPorTurno(turnoId, categorias = ['vendas', 'estorno']) {
    const agregado = {};
    for (const item of this.lancamentos) {
      if (item.turnoId !== turnoId || !this.lancamentoAtivo(item)) {
        continue;
      }
      if (categorias !== null && !categorias.includes(item.categoria)) {
        continue;
      }
      if (!agregado[item.forma]) {
        agregado[item.forma] = { entradas: 0, saidas: 0 };
      }
      if (item.tipo === 'saida') {
        agregado[item.forma].saidas = dinheiro(agregado[item.forma].saidas + Number(item.valor));
      } else {
        agregado[item.forma].entradas = dinheiro(agregado[item.forma].entradas + Number(item.valor));
      }
    }
    return Object.entries(agregado).map(([forma, totais]) => ({
      forma,
      entradas: totais.entradas,
      saidas: totais.saidas,
    }));
  }

  async registrar(lancamento, _conexao) {
    this.lancamentos.push({
      id: this.proximoIdentificador(),
      ...lancamento,
      ativo: true,
      geradoAuto: Boolean(lancamento.geradoAuto),
    });
  }
}

export class MemoriaCorrecaoPendenteRepository extends CorrecaoPendenteRepository {
  constructor(pendentes = []) {
    super();
    this.itens = pendentes.map((item) => normalizarListagem(item));
    this.pendentes = this.itens;
    this.proximoId = this.itens.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  }

  async listarPendentes() {
    return this.itens
      .filter((item) => (item.status ?? 'pendente') === 'pendente')
      .map((item) => ({
        id: item.id,
        venda_id: item.vendaId ?? item.venda_id,
        motivo: item.motivo,
        solicitado_por: item.solicitadoPorNome ?? item.solicitado_por ?? '—',
        criado_em: item.criadoEm ?? item.criado_em,
      }));
  }

  async criar(correcao, _conexao) {
    const salva = {
      id: this.proximoId++,
      vendaId: correcao.vendaId,
      motivo: correcao.motivo,
      solicitadoPor: correcao.solicitadoPor,
      status: 'pendente',
      resolvidoPor: null,
      resolvidoEm: null,
      criadoEm: new Date().toISOString(),
    };
    this.itens.push({ ...salva });
    return { ...salva };
  }

  async buscarPorId(id, _conexao) {
    const encontrada = this.itens.find((item) => item.id === Number(id));
    return encontrada ? { ...encontrada } : null;
  }

  async marcarResolvida(id, resolvidoPor, _conexao) {
    const item = this.itens.find((entry) => entry.id === Number(id));
    if (!item || item.status !== 'pendente') {
      return null;
    }
    item.status = 'resolvida';
    item.resolvidoPor = resolvidoPor;
    item.resolvidoEm = new Date().toISOString();
    return { ...item };
  }
}

function normalizarListagem(item) {
  return {
    id: item.id,
    vendaId: item.vendaId ?? item.venda_id,
    motivo: item.motivo,
    solicitadoPor: item.solicitadoPor ?? null,
    solicitadoPorNome: item.solicitado_por ?? null,
    status: item.status ?? 'pendente',
    resolvidoPor: item.resolvidoPor ?? null,
    resolvidoEm: item.resolvidoEm ?? null,
    criadoEm: item.criadoEm ?? item.criado_em ?? new Date().toISOString(),
  };
}

function proximoIdDisponivel(lancamentos) {
  return lancamentos.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}
