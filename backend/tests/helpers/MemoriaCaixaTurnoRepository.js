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
  }

  async somarPorFormaETurno(turnoId, categorias = ['vendas', 'estorno']) {
    const net = {};
    for (const item of this.lancamentos) {
      if (item.turnoId !== turnoId || !categorias.includes(item.categoria)) {
        continue;
      }
      const sinal = item.tipo === 'saida' ? -1 : 1;
      net[item.forma] = dinheiro((net[item.forma] || 0) + sinal * Number(item.valor));
    }
    return Object.entries(net).map(([forma, total]) => ({ forma, total }));
  }
}

export class MemoriaCorrecaoPendenteRepository extends CorrecaoPendenteRepository {
  constructor(pendentes = []) {
    super();
    this.pendentes = pendentes;
  }

  async listarPendentes() {
    return [...this.pendentes];
  }
}
