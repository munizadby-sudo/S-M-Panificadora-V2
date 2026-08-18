import { Venda, VendaItem } from '../../src/modules/sales/domain/Venda.js';
import { VendaRepository } from '../../src/modules/sales/application/ports.js';
import { EstoqueDiario } from '../../src/modules/inventory/domain/EstoqueDiario.js';

export class MemoriaSequenciaRepository {
  constructor() {
    this.sequencias = new Map();
  }

  async proximoNumero(chave, _conexao) {
    const atual = this.sequencias.get(chave) || 0;
    const proximo = atual + 1;
    this.sequencias.set(chave, proximo);
    return proximo;
  }

  snapshot() {
    return new Map(this.sequencias);
  }

  restaurar(mapa) {
    this.sequencias = new Map(mapa);
  }
}

export class MemoriaVendaRepository extends VendaRepository {
  constructor({ estoqueRepository, sequenciaRepository, fluxoCaixaRepository } = {}) {
    super();
    this.vendas = [];
    this.proximoId = 1;
    this.proximoItemId = 1;
    this.estoqueRepository = estoqueRepository;
    this.sequenciaRepository = sequenciaRepository;
    this.fluxoCaixaRepository = fluxoCaixaRepository;
  }

  async salvar(venda, _conexao) {
    const itens = venda.itens.map((item) =>
      VendaItem.reconstituir({
        id: this.proximoItemId++,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        subtotal: item.subtotal,
      }),
    );
    const salva = Venda.reconstituir({
      id: this.proximoId++,
      numero: venda.numero,
      turnoId: venda.turnoId,
      usuarioId: venda.usuarioId,
      formaPagamento: venda.formaPagamento,
      itens,
      total: venda.total,
      status: venda.status,
      criadoEm: new Date().toISOString(),
    });
    this.vendas.push(clonarVenda(salva));
    return clonarVenda(salva);
  }

  async buscarPorId(id, _conexao) {
    const encontrada = this.vendas.find((item) => item.id === Number(id));
    return encontrada ? clonarVenda(encontrada) : null;
  }

  async buscarItensPorVendaId(vendaId, _conexao) {
    const venda = this.vendas.find((item) => item.id === Number(vendaId));
    return venda ? venda.itens.map(clonarItem) : [];
  }

  async atualizar(venda, _conexao) {
    const indice = this.vendas.findIndex((item) => item.id === venda.id);
    if (indice < 0) {
      return null;
    }
    const atual = clonarVenda(this.vendas[indice]);
    atual.status = venda.status;
    atual.motivoCancelamento = venda.motivoCancelamento;
    atual.canceladoPor = venda.canceladoPor;
    atual.canceladoEm = venda.canceladoEm;
    this.vendas[indice] = atual;
    return clonarVenda(atual);
  }

  async listar(filtros = {}) {
    let filtradas = [...this.vendas];

    if (filtros.turnoId !== undefined) {
      filtradas = filtradas.filter((item) => item.turnoId === Number(filtros.turnoId));
    }
    if (filtros.status !== undefined) {
      filtradas = filtradas.filter((item) => item.status === filtros.status);
    }
    if (filtros.dataInicio !== undefined) {
      filtradas = filtradas.filter((item) => item.dataOperacao() >= filtros.dataInicio);
    }
    if (filtros.dataFim !== undefined) {
      filtradas = filtradas.filter((item) => item.dataOperacao() <= filtros.dataFim);
    }

    filtradas.sort((a, b) => {
      const cmp = String(b.criadoEm).localeCompare(String(a.criadoEm));
      return cmp !== 0 ? cmp : b.id - a.id;
    });

    const total = filtradas.length;
    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const offset = (page - 1) * limit;
    const pagina = filtradas.slice(offset, offset + limit);

    return { data: pagina.map(clonarVenda), total };
  }

  async comTransacao(fn) {
    const snapshot = {
      vendas: this.vendas.map(clonarVenda),
      proximoId: this.proximoId,
      proximoItemId: this.proximoItemId,
      estoque: this.estoqueRepository ? snapshotEstoque(this.estoqueRepository) : null,
      sequencias: this.sequenciaRepository ? this.sequenciaRepository.snapshot() : null,
      lancamentos: this.fluxoCaixaRepository
        ? this.fluxoCaixaRepository.lancamentos.map((item) => ({ ...item }))
        : null,
    };
    try {
      return await fn(this);
    } catch (erro) {
      this.vendas = snapshot.vendas;
      this.proximoId = snapshot.proximoId;
      this.proximoItemId = snapshot.proximoItemId;
      if (snapshot.estoque) {
        restaurarEstoque(this.estoqueRepository, snapshot.estoque);
      }
      if (snapshot.sequencias && this.sequenciaRepository) {
        this.sequenciaRepository.restaurar(snapshot.sequencias);
      }
      if (snapshot.lancamentos && this.fluxoCaixaRepository) {
        this.fluxoCaixaRepository.lancamentos = snapshot.lancamentos;
      }
      throw erro;
    }
  }
}

function clonarVenda(venda) {
  return Venda.reconstituir({
    id: venda.id,
    numero: venda.numero,
    turnoId: venda.turnoId,
    usuarioId: venda.usuarioId,
    formaPagamento: venda.formaPagamento,
    itens: venda.itens.map(clonarItem),
    total: venda.total,
    status: venda.status,
    motivoCancelamento: venda.motivoCancelamento,
    canceladoPor: venda.canceladoPor,
    canceladoEm: venda.canceladoEm,
    criadoEm: venda.criadoEm,
  });
}

function clonarItem(item) {
  return VendaItem.reconstituir({
    id: item.id,
    produtoId: item.produtoId,
    quantidade: item.quantidade,
    precoUnitario: item.precoUnitario,
    subtotal: item.subtotal,
  });
}

function snapshotEstoque(repo) {
  return {
    itens: repo.itens.map(clonarEstoque),
    proximoId: repo.proximoId,
  };
}

function restaurarEstoque(repo, snapshot) {
  repo.itens = snapshot.itens.map(clonarEstoque);
  repo.proximoId = snapshot.proximoId;
}

function clonarEstoque(estoque) {
  return new EstoqueDiario({
    id: estoque.id,
    produtoId: estoque.produtoId,
    data: estoque.data,
    inicial: estoque.inicial,
    produzido: estoque.produzido,
    vendido: estoque.vendido,
    minimo: estoque.minimo,
    atualizadoEm: estoque.atualizadoEm,
  });
}
