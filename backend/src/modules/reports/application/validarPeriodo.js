import { PeriodoInvalidoError } from '../domain/erros.js';

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;

export function validarPeriodo({ data_inicio, data_fim } = {}) {
  const dataInicio = String(data_inicio ?? '').trim();
  const dataFim = String(data_fim ?? '').trim();

  if (!REGEX_DATA.test(dataInicio) || !REGEX_DATA.test(dataFim)) {
    throw new PeriodoInvalidoError();
  }
  if (dataInicio > dataFim) {
    throw new PeriodoInvalidoError();
  }

  return { dataInicio, dataFim };
}
