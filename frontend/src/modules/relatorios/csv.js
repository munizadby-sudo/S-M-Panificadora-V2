/**
 * Gera e baixa um CSV no navegador a partir das linhas já exibidas.
 * Retorna o conteúdo gerado para facilitar testes.
 */
export function exportarCsv(nomeArquivo, cabecalhos, linhas) {
  const todas = [cabecalhos, ...(linhas || [])];
  const corpo = todas.map((linha) => linha.map(escaparCsv).join(';')).join('\r\n');
  const blob = new Blob([`\uFEFF${corpo}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo.endsWith('.csv') ? nomeArquivo : `${nomeArquivo}.csv`;
  const pai = document.body || document.documentElement;
  if (pai && typeof pai.appendChild === 'function') {
    pai.appendChild(link);
  }
  if (typeof link.click === 'function') {
    link.click();
  }
  if (typeof link.remove === 'function') {
    link.remove();
  } else if (pai && typeof pai.removeChild === 'function' && link.parentNode === pai) {
    pai.removeChild(link);
  }
  URL.revokeObjectURL(url);
  return { nomeArquivo: link.download, conteudo: corpo };
}

function escaparCsv(valor) {
  const texto = String(valor ?? '');
  if (/[;"\r\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}
