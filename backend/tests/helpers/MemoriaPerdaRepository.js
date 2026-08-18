import { Perda } from '../../src/modules/losses/domain/Perda.js';
import { PerdaRepository } from '../../src/modules/losses/application/ports.js';

export class MemoriaPerdaRepository extends PerdaRepository {
  constructor({ produtoRepository, usuarioRepository } = {}) {
    super();
    this.itens = [];
    this.proximoId = 1;
    this.produtoRepository = produtoRepository;
    this.usuarioRepository = usuarioRepository;
  }

  async salvar(perda, _conexao) {
    const salva = clonar(perda);
    salva.id = this.proximoId;
    this.proximoId += 1;
    this.itens.push(clonar(salva));
    return clonar(salva);
  }

  async buscarPorId(id, _conexao) {
    const encontrada = this.itens.find((item) => item.id === Number(id));
    return encontrada ? clonar(encontrada) : null;
  }

  async atualizar(perda, _conexao) {
    const indice = this.itens.findIndex((item) => item.id === perda.id);
    if (indice < 0) {
      return null;
    }
    this.itens[indice] = clonar(perda);
    return clonar(perda);
  }

  async listar(filtros = {}) {
    let filtradas = [...this.itens];

    if (filtros.produtoId !== undefined) {
      filtradas = filtradas.filter((item) => item.produtoId === Number(filtros.produtoId));
    }
    if (filtros.motivo !== undefined) {
      filtradas = filtradas.filter((item) => item.motivo === filtros.motivo);
    }
    if (filtros.dataInicio !== undefined) {
      filtradas = filtradas.filter((item) => item.data >= filtros.dataInicio);
    }
    if (filtros.dataFim !== undefined) {
      filtradas = filtradas.filter((item) => item.data <= filtros.dataFim);
    }
    if (filtros.ativo !== undefined) {
      filtradas = filtradas.filter((item) => item.ativo === Boolean(filtros.ativo));
    }

    filtradas.sort((a, b) => {
      const cmpData = b.data.localeCompare(a.data);
      return cmpData !== 0 ? cmpData : b.id - a.id;
    });

    const total = filtradas.length;
    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const offset = (page - 1) * limit;
    const pagina = filtradas.slice(offset, offset + limit);

    const data = [];
    for (const perda of pagina) {
      const produto = this.produtoRepository
        ? await this.produtoRepository.buscarPorId(perda.produtoId)
        : null;
      const usuario = this.usuarioRepository
        ? await this.usuarioRepository.buscarPorId(perda.usuarioId)
        : null;
      data.push(
        clonar(perda).paraListagem({
          produtoNome: produto?.nome || '—',
          usuarioNome: usuario?.nome || '—',
        }),
      );
    }

    return { data, total };
  }

  async comTransacao(fn) {
    const snapshot = this.itens.map(clonar);
    const proximoId = this.proximoId;
    try {
      return await fn(this);
    } catch (erro) {
      this.itens = snapshot;
      this.proximoId = proximoId;
      throw erro;
    }
  }
}

function clonar(perda) {
  return Perda.reconstituir({
    id: perda.id,
    produtoId: perda.produtoId,
    data: perda.data,
    quantidade: perda.quantidade,
    motivo: perda.motivo,
    custoCalculado: perda.custoCalculado,
    usuarioId: perda.usuarioId,
    ativo: perda.ativo,
    criadoEm: perda.criadoEm,
  });
}
