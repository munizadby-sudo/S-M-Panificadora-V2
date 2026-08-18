import { rotuloOrigem, rotuloTipo } from './html.js';

export function validarFormularioLancamento({ tipo, descricao, categoria, forma, valor }) {
  const erros = {};
  if (!['entrada', 'saida'].includes(String(tipo))) {
    erros.tipo = 'Tipo inválido.';
  }
  if (!String(descricao ?? '').trim()) {
    erros.descricao = 'Descrição é obrigatória.';
  }
  if (!String(categoria ?? '').trim()) {
    erros.categoria = 'Categoria é obrigatória.';
  }
  if (!String(forma ?? '').trim()) {
    erros.forma = 'Forma é obrigatória.';
  }
  const numero = Number(valor);
  if (!(numero > 0)) {
    erros.valor = 'Valor deve ser maior que zero.';
  }

  if (Object.keys(erros).length) {
    return { ok: false, erros };
  }

  return {
    ok: true,
    valores: {
      tipo: String(tipo),
      descricao: String(descricao).trim(),
      categoria: String(categoria).trim(),
      forma: String(forma).trim(),
      valor: Math.round(numero * 100) / 100,
    },
  };
}

export function validarMotivoExclusao(motivo) {
  const texto = String(motivo ?? '').trim();
  if (!texto) {
    return { ok: false, erro: 'Motivo da exclusão é obrigatório.' };
  }
  return { ok: true, valor: texto };
}

export function montarLinhasCsv(itens) {
  const cabecalho = ['tipo', 'descricao', 'categoria', 'forma', 'valor', 'origem', 'usuario', 'data'];
  const linhas = [cabecalho.join(';')];

  for (const item of itens) {
    linhas.push(
      [
        rotuloTipo(item.tipo),
        csvCelula(item.descricao),
        csvCelula(item.categoria),
        csvCelula(item.forma),
        Number(item.valor).toFixed(2).replace('.', ','),
        rotuloOrigem(item.gerado_auto),
        csvCelula(item.usuario || ''),
        csvCelula(item.data || ''),
      ].join(';'),
    );
  }

  return linhas.join('\n');
}

function csvCelula(valor) {
  const texto = String(valor ?? '').replace(/"/g, '""');
  return `"${texto}"`;
}
