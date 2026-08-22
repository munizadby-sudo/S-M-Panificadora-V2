import { Producao } from '../../src/modules/production/domain/Producao.js';
import { ProducaoRepository } from '../../src/modules/production/application/ports.js';

export class MemoriaProducaoRepository extends ProducaoRepository {
  constructor({ produtoRepository, usuarioRepository } = {}) {
    super();
    this.itens = [];
    this.proximoId = 1;
    this.produtoRepository = produtoRepository;
    this.usuarioRepository = usuarioRepository;
  }

  async salvar(producao, _conexao) {
    const salva = clonar(producao);
    salva.id = this.proximoId;
    this.proximoId += 1;
    this.itens.push(clonar(salva));
    return clonar(salva);
  }

  async buscarPorId(id, _conexao) {
    const encontrada = this.itens.find((item) => item.id === Number(id));
    return encontrada ? clonar(encontrada) : null;
  }

  async listar(filtros = {}) {
    let filtradas = [...this.itens];

    if (filtros.produtoId !== undefined) {
      filtradas = filtradas.filter((item) => item.produtoId === Number(filtros.produtoId));
    }
    if (filtros.dataInicio !== undefined) {
      filtradas = filtradas.filter((item) => item.data >= filtros.dataInicio);
    }
    if (filtros.dataFim !== undefined) {
      filtradas = filtradas.filter((item) => item.data <= filtros.dataFim);
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
    for (const producao of pagina) {
      const produto = this.produtoRepository
        ? await this.produtoRepository.buscarPorId(producao.produtoId)
        : null;
      const usuario = this.usuarioRepository
        ? await this.usuarioRepository.buscarPorId(producao.usuarioId)
        : null;
      data.push(
        clonar(producao).paraListagem({
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

function clonar(producao) {
  return Producao.reconstituir({
    id: producao.id,
    produtoId: producao.produtoId,
    data: producao.data,
    quantidade: producao.quantidade,
    usuarioId: producao.usuarioId,
    criadoEm: producao.criadoEm,
  });
}
