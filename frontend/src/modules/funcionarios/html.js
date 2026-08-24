export function escapar(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatarMoeda(valor) {
  const numero = Number(valor) || 0;
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const formatarDinheiro = formatarMoeda;

export function dataHoje() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Recife',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function htmlOpcoesFuncionarios(funcionarios, selecionado = '') {
  const opcoes = ['<option value="">Selecione</option>'];
  for (const item of funcionarios || []) {
    const sel = String(item.id) === String(selecionado) ? ' selected' : '';
    opcoes.push(
      `<option value="${escapar(item.id)}"${sel}>${escapar(item.nome)} — ${escapar(item.cargo)}</option>`,
    );
  }
  return opcoes.join('');
}

export function htmlTabelaFuncionarios(funcionarios) {
  if (!Array.isArray(funcionarios) || funcionarios.length === 0) {
    return '<p class="estado-vazio">Nenhum funcionário encontrado.<span class="estado-vazio-dica">Aqui aparece a equipe. Cadastre o primeiro funcionário pelo formulário.</span></p>';
  }
  const linhas = funcionarios
    .map((item) => {
      const inativo = Number(item.ativo) === 0;
      const acoes = inativo
        ? `<button type="button" data-reativar-funcionario="${escapar(item.id)}">Reativar</button>`
        : `<button type="button" data-editar-funcionario="${escapar(item.id)}">Editar</button>
           <button type="button" data-desativar-funcionario="${escapar(item.id)}">Desativar</button>`;
      return `<tr class="${inativo ? 'funcionarios-linha-inativa' : ''}">
        <td>${escapar(item.nome)}</td>
        <td>${escapar(item.cargo)}</td>
        <td>${escapar(formatarMoeda(item.salario_base))}</td>
        <td>${escapar(item.data_admissao)}</td>
        <td>${acoes}</td>
      </tr>`;
    })
    .join('');
  return `<table class="funcionarios-tabela">
    <thead><tr><th>Nome</th><th>Cargo</th><th>Salário</th><th>Admissão</th><th>Ações</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>`;
}

export function htmlTabelaAdiantamentos(itens) {
  if (!Array.isArray(itens) || itens.length === 0) {
    return '<p class="estado-vazio">Nenhum adiantamento.<span class="estado-vazio-dica">Aqui aparecem os adiantamentos do período selecionado.</span></p>';
  }
  const linhas = itens
    .map(
      (item) => `<tr>
      <td>${escapar(item.funcionario_nome || item.funcionario_id)}</td>
      <td>${escapar(formatarMoeda(item.valor))}</td>
      <td>${escapar(item.data)}</td>
      <td>${escapar(item.observacao || '')}</td>
    </tr>`,
    )
    .join('');
  return `<table class="funcionarios-tabela">
    <thead><tr><th>Funcionário</th><th>Valor</th><th>Data</th><th>Obs.</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>`;
}

export function htmlTabelaOcorrencias(itens) {
  if (!Array.isArray(itens) || itens.length === 0) {
    return '<p class="estado-vazio">Nenhuma ocorrência.<span class="estado-vazio-dica">Aqui aparecem faltas, atestados e horas extras lançadas.</span></p>';
  }
  const rotulos = { falta: 'Falta', atestado: 'Atestado', hora_extra: 'Hora extra' };
  const linhas = itens
    .map(
      (item) => `<tr>
      <td>${escapar(item.funcionario_nome || item.funcionario_id)}</td>
      <td>${escapar(rotulos[item.tipo] || item.tipo)}</td>
      <td>${escapar(item.data)}</td>
      <td>${escapar(formatarMoeda(item.valor))}</td>
      <td>${escapar(item.observacao || '')}</td>
    </tr>`,
    )
    .join('');
  return `<table class="funcionarios-tabela">
    <thead><tr><th>Funcionário</th><th>Tipo</th><th>Data</th><th>Valor</th><th>Obs.</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>`;
}

export function htmlTabelaFolhas(itens) {
  if (!Array.isArray(itens) || itens.length === 0) {
    return '<p class="estado-vazio">Nenhuma folha.<span class="estado-vazio-dica">Aqui aparecem as folhas fechadas. Use Fechar folha para gerar a primeira.</span></p>';
  }
  const linhas = itens
    .map((item) => {
      const pagar =
        item.status === 'pendente'
          ? `<button type="button" data-pagar-folha="${escapar(item.id)}">Marcar como paga</button>`
          : 'Paga';
      return `<tr>
        <td>${escapar(item.funcionario_nome || item.funcionario_id)}</td>
        <td>${escapar(item.periodo_inicio)} a ${escapar(item.periodo_fim)}</td>
        <td>${escapar(formatarMoeda(item.salario_base))}</td>
        <td>${escapar(formatarMoeda(item.valor_liquido))}</td>
        <td>${escapar(item.status)}</td>
        <td>${pagar}</td>
      </tr>`;
    })
    .join('');
  return `<table class="funcionarios-tabela">
    <thead><tr><th>Funcionário</th><th>Período</th><th>Salário</th><th>Líquido</th><th>Status</th><th>Ações</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>`;
}

export function htmlResumoFolha(folha) {
  if (!folha) return '';
  return `<div class="funcionarios-resumo-folha" data-valor-liquido="${escapar(folha.valor_liquido)}">
    <h3>Folha fechada</h3>
    <p>Salário base: <strong>${escapar(formatarMoeda(folha.salario_base))}</strong></p>
    <p>Adiantamentos: <strong>${escapar(formatarMoeda(folha.total_adiantamentos))}</strong></p>
    <p>Faltas: <strong>${escapar(formatarMoeda(folha.total_faltas))}</strong></p>
    <p>Horas extras: <strong>${escapar(formatarMoeda(folha.total_horas_extras))}</strong></p>
    <p>Líquido: <strong id="folha-valor-liquido">${escapar(formatarMoeda(folha.valor_liquido))}</strong></p>
  </div>`;
}
