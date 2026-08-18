import { formatarDataFiltro, TIPOS_LANCAMENTO } from '../domain/LancamentoFluxoCaixa.js';
import { TipoInvalidoError } from '../domain/erros.js';

export class ListLancamentos {
  constructor({ lancamentoRepository }) {
    this.lancamentoRepository = lancamentoRepository;
  }

  async executar({
    turno_id,
    categoria,
    tipo,
    gerado_auto,
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

    if (turno_id !== undefined && turno_id !== null && turno_id !== '') {
      filtros.turnoId = Number(turno_id);
    }
    if (categoria !== undefined && categoria !== null && String(categoria).trim()) {
      filtros.categoria = String(categoria).trim();
    }
    if (tipo !== undefined && tipo !== null && String(tipo).trim()) {
      const valor = String(tipo).trim().toLowerCase();
      if (!TIPOS_LANCAMENTO.includes(valor)) {
        throw new TipoInvalidoError();
      }
      filtros.tipo = valor;
    }
    if (gerado_auto !== undefined && gerado_auto !== null && gerado_auto !== '') {
      filtros.geradoAuto = Number(gerado_auto) === 1 || gerado_auto === true || gerado_auto === 'true';
    }
    if (data_inicio !== undefined && data_inicio !== null && String(data_inicio).trim()) {
      filtros.dataInicio = formatarDataFiltro(data_inicio);
    }
    if (data_fim !== undefined && data_fim !== null && String(data_fim).trim()) {
      filtros.dataFim = formatarDataFiltro(data_fim);
    }
    if (ativo === undefined || ativo === null || ativo === '') {
      filtros.ativo = true;
    } else {
      filtros.ativo = Number(ativo) === 1 || ativo === true || ativo === 'true';
    }

    const { data, total } = await this.lancamentoRepository.listar(filtros);
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
