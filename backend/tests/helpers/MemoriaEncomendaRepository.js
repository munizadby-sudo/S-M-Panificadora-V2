import { Encomenda, EncomendaItem } from '../../src/modules/orders/domain/Encomenda.js';
import { EncomendaRepository } from '../../src/modules/orders/application/ports.js';

export class MemoriaEncomendaRepository extends EncomendaRepository {
  constructor({ sequenciaRepository } = {}) {
    super();
    this.itens = [];
    this.proximoId = 1;
    this.proximoItemId = 1;
    this.sequenciaRepository = sequenciaRepository;
  }

  async salvar(encomenda, _conexao) {
    const itens = encomenda.itens.map((item) => this.clonarItemComId(item));
    const salva = Encomenda.reconstituir({
      id: this.proximoId++,
      numero: encomenda.numero,
      clienteId: encomenda.clienteId,
      clienteNome: encomenda.clienteNome,
      clienteTelefone: encomenda.clienteTelefone,
      dataEntrega: encomenda.dataEntrega,
      sinal: encomenda.sinal,
      observacoes: encomenda.observacoes,
      itens,
      total: encomenda.total,
      status: encomenda.status,
      ativo: encomenda.ativo,
      usuarioId: encomenda.usuarioId,
      criadoEm: new Date().toISOString(),
    });
    this.itens.push(clonar(salva));
    return clonar(salva);
  }

  clonarItemComId(item) {
    return EncomendaItem.reconstituir({
      id: this.proximoItemId++,
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario,
      subtotal: item.subtotal,
    });
  }

  async buscarPorId(id, _conexao) {
    const encontrada = this.itens.find((item) => item.id === Number(id));
    return encontrada ? clonar(encontrada) : null;
  }

  async substituirItens(encomendaId, itens, _conexao) {
    const indice = this.itens.findIndex((item) => item.id === Number(encomendaId));
    if (indice < 0) {
      return;
    }
    const novosItens = itens.map((item) => this.clonarItemComId(item));
    this.itens[indice] = clonar(
      Encomenda.reconstituir({ ...paraReconstituir(this.itens[indice]), itens: novosItens }),
    );
  }

  async atualizar(encomenda, _conexao) {
    const indice = this.itens.findIndex((item) => item.id === encomenda.id);
    if (indice < 0) {
      return null;
    }
    const atual = clonar(this.itens[indice]);
    atual.clienteId = encomenda.clienteId;
    atual.clienteNome = encomenda.clienteNome;
    atual.clienteTelefone = encomenda.clienteTelefone;
    atual.dataEntrega = encomenda.dataEntrega;
    atual.sinal = encomenda.sinal;
    atual.observacoes = encomenda.observacoes;
    atual.total = encomenda.total;
    atual.status = encomenda.status;
    atual.ativo = encomenda.ativo;
    this.itens[indice] = atual;
    return clonar(atual);
  }

  async listar(filtros = {}) {
    let filtradas = [...this.itens];

    if (filtros.status !== undefined) {
      filtradas = filtradas.filter((item) => item.status === filtros.status);
    }
    if (filtros.clienteId !== undefined) {
      filtradas = filtradas.filter((item) => item.clienteId === Number(filtros.clienteId));
    }
    if (filtros.dataEntregaInicio !== undefined) {
      filtradas = filtradas.filter((item) => item.dataEntrega >= filtros.dataEntregaInicio);
    }
    if (filtros.dataEntregaFim !== undefined) {
      filtradas = filtradas.filter((item) => item.dataEntrega <= filtros.dataEntregaFim);
    }
    if (filtros.ativo !== undefined) {
      filtradas = filtradas.filter((item) => item.ativo === Boolean(filtros.ativo));
    }

    filtradas.sort((a, b) => a.dataEntrega.localeCompare(b.dataEntrega) || a.numero - b.numero);

    const total = filtradas.length;
    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const offset = (page - 1) * limit;
    const pagina = filtradas.slice(offset, offset + limit);

    return { data: pagina.map((item) => clonar(item).paraListagem()), total };
  }

  async comTransacao(fn) {
    const snapshot = {
      itens: this.itens.map(clonar),
      proximoId: this.proximoId,
      proximoItemId: this.proximoItemId,
      sequencias: this.sequenciaRepository ? this.sequenciaRepository.snapshot() : null,
    };
    try {
      return await fn(this);
    } catch (erro) {
      this.itens = snapshot.itens;
      this.proximoId = snapshot.proximoId;
      this.proximoItemId = snapshot.proximoItemId;
      if (snapshot.sequencias && this.sequenciaRepository) {
        this.sequenciaRepository.restaurar(snapshot.sequencias);
      }
      throw erro;
    }
  }
}

function paraReconstituir(encomenda) {
  return {
    id: encomenda.id,
    numero: encomenda.numero,
    clienteId: encomenda.clienteId,
    clienteNome: encomenda.clienteNome,
    clienteTelefone: encomenda.clienteTelefone,
    dataEntrega: encomenda.dataEntrega,
    sinal: encomenda.sinal,
    observacoes: encomenda.observacoes,
    total: encomenda.total,
    status: encomenda.status,
    ativo: encomenda.ativo,
    usuarioId: encomenda.usuarioId,
    criadoEm: encomenda.criadoEm,
  };
}

function clonar(encomenda) {
  return Encomenda.reconstituir({
    ...paraReconstituir(encomenda),
    itens: encomenda.itens.map((item) =>
      EncomendaItem.reconstituir({
        id: item.id,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        subtotal: item.subtotal,
      }),
    ),
  });
}
