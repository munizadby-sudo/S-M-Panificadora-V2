import { normalizarData } from '../../inventory/domain/EstoqueDiario.js';
import { TIPOS_OCORRENCIA } from '../domain/OcorrenciaFolha.js';
import { TipoOcorrenciaInvalidoError } from '../domain/erros.js';

export class ListOcorrenciasFolha {
  constructor({ ocorrenciaFolhaRepository }) {
    this.ocorrenciaFolhaRepository = ocorrenciaFolhaRepository;
  }

  async executar({
    funcionario_id,
    tipo,
    data_inicio,
    data_fim,
    page = 1,
    limit = 20,
  } = {}) {
    const pagina = Math.max(1, Number(page) || 1);
    const limite = Math.max(1, Math.min(100, Number(limit) || 20));
    const filtros = { page: pagina, limit: limite };

    if (funcionario_id !== undefined && funcionario_id !== null && funcionario_id !== '') {
      filtros.funcionarioId = Number(funcionario_id);
    }
    if (tipo !== undefined && tipo !== null && String(tipo).trim()) {
      const valor = String(tipo).trim().toLowerCase();
      if (!TIPOS_OCORRENCIA.includes(valor)) {
        throw new TipoOcorrenciaInvalidoError();
      }
      filtros.tipo = valor;
    }
    if (data_inicio) {
      filtros.dataInicio = normalizarData(data_inicio);
    }
    if (data_fim) {
      filtros.dataFim = normalizarData(data_fim);
    }

    const { data, total } = await this.ocorrenciaFolhaRepository.listar(filtros);
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
