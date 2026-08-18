import { normalizarData } from '../../inventory/domain/EstoqueDiario.js';
import { MOTIVOS_PERDA } from '../domain/Perda.js';
import { MotivoInvalidoError } from '../domain/erros.js';

export class ListPerdas {
  constructor({ perdaRepository }) {
    this.perdaRepository = perdaRepository;
  }

  async executar({
    produto_id,
    motivo,
    data_inicio,
    data_fim,
    ativo,
    page = 1,
    limit = 20,
  } = {}) {
    const pagina = Math.max(1, Number(page) || 1);
    const limite = Math.max(1, Math.min(100, Number(limit) || 20));
    const filtros = {
      page: pagina,
      limit: limite,
    };

    if (produto_id !== undefined && produto_id !== null && produto_id !== '') {
      filtros.produtoId = Number(produto_id);
    }
    if (motivo !== undefined && motivo !== null && String(motivo).trim()) {
      const valor = String(motivo).trim().toLowerCase();
      if (!MOTIVOS_PERDA.includes(valor)) {
        throw new MotivoInvalidoError();
      }
      filtros.motivo = valor;
    }
    if (data_inicio !== undefined && data_inicio !== null && String(data_inicio).trim()) {
      filtros.dataInicio = normalizarData(data_inicio);
    }
    if (data_fim !== undefined && data_fim !== null && String(data_fim).trim()) {
      filtros.dataFim = normalizarData(data_fim);
    }
    if (ativo === undefined || ativo === null || ativo === '') {
      filtros.ativo = true;
    } else {
      filtros.ativo = Number(ativo) === 1 || ativo === true || ativo === 'true';
    }

    const { data, total } = await this.perdaRepository.listar(filtros);
    const pages = Math.max(1, Math.ceil(total / limite) || 1);

    return {
      data,
      pagination: {
        page: pagina,
        limit: limite,
        total,
        pages,
        hasPrevious: pagina > 1,
        hasNext: pagina < pages && total > 0,
      },
    };
  }
}
