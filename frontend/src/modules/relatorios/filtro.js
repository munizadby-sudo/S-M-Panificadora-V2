import { escapar } from './html.js';

export function htmlFiltroPeriodo({ dataInicio, dataFim, erro = '' }) {
  return `<form id="form-filtro-relatorios" class="relatorios-filtros">
    <label>Data início
      <input type="date" id="relatorios-data-inicio" name="data_inicio" value="${escapar(dataInicio)}" required>
    </label>
    <label>Data fim
      <input type="date" id="relatorios-data-fim" name="data_fim" value="${escapar(dataFim)}" required>
    </label>
    <button type="submit">Filtrar</button>
    <button type="button" id="btn-relatorios-hoje">Hoje</button>
    <p class="relatorios-erro" id="relatorios-erro-filtro" role="alert">${escapar(erro)}</p>
  </form>`;
}
