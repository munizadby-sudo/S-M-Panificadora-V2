import { produtoIdDoErroLote } from './api.js';
import { escapar, formatarQuantidade } from './html.js';
import { parseDecimal, validarLancamentoEstoque } from './validacao.js';

export function quantidade(valor) {
  return Math.round((Number(valor) || 0) * 1000) / 1000;
}

export function calcularDisponivelPreview(inicial, produzido, vendido) {
  const inicialNum = parseDecimalOuZero(inicial);
  const produzidoNum = parseDecimalOuZero(produzido);
  if (inicialNum == null || produzidoNum == null) {
    return null;
  }
  return quantidade(inicialNum + produzidoNum - quantidade(vendido));
}

export function atualizarDisponivelPreviaLinha(container, produtoId, vendido) {
  const id = String(produtoId);
  const inicial = container.querySelector?.(`[data-lote-inicial="${id}"]`)?.value;
  const produzido = container.querySelector?.(`[data-lote-produzido="${id}"]`)?.value;
  const disponivel = calcularDisponivelPreview(inicial, produzido, vendido);
  const celula = container.querySelector?.(`[data-lote-disponivel="${id}"]`);
  if (!celula) {
    return;
  }
  celula.textContent = disponivel == null ? '—' : formatarQuantidade(disponivel);
}

export function ligarPreviaDisponivelLote(container, linhas) {
  const vendidoPorId = new Map((linhas || []).map((item) => [String(item.produto_id), item.vendido]));
  for (const input of container.querySelectorAll?.('[data-lote-inicial], [data-lote-produzido]') || []) {
    const id = input.getAttribute('data-lote-inicial') || input.getAttribute('data-lote-produzido');
    const atualizar = () => {
      atualizarDisponivelPreviaLinha(container, id, vendidoPorId.get(String(id)) ?? 0);
    };
    input.addEventListener('input', atualizar);
    input.addEventListener('change', atualizar);
  }
}

export function htmlTabelaLoteEstoque(linhas) {
  if (!Array.isArray(linhas) || linhas.length === 0) {
    return '<p class="estado-vazio">Nenhum item de estoque encontrado.</p>';
  }

  const corpo = linhas
    .map((item) => {
      const erro = item.erro ? ' estoque-linha-lote-erro' : '';
      return `<tr class="${erro.trim()}" data-lote-produto="${escapar(item.produto_id)}">
        <td>${escapar(item.nome)}${item.erro ? ` <span class="estoque-alerta-minimo">${escapar(item.erro)}</span>` : ''}</td>
        <td><input type="text" inputmode="decimal" data-lote-inicial="${escapar(item.produto_id)}" value="${escapar(valorCampo(item.inicial))}"></td>
        <td><input type="text" inputmode="decimal" data-lote-produzido="${escapar(item.produto_id)}" value="${escapar(valorCampo(item.produzido))}"></td>
        <td class="estoque-somente-leitura">${formatarQuantidade(item.vendido)}</td>
        <td class="estoque-disponivel" data-lote-disponivel="${escapar(item.produto_id)}">${formatarQuantidade(calcularDisponivelPreview(item.inicial, item.produzido, item.vendido) ?? item.disponivel)}</td>
        <td><input type="text" inputmode="decimal" data-lote-minimo="${escapar(item.produto_id)}" value="${escapar(valorCampo(item.minimo))}"></td>
      </tr>`;
    })
    .join('');

  return `<table class="estoque-tabela estoque-lote">
    <thead>
      <tr>
        <th>Produto</th>
        <th>Inicial</th>
        <th>Produzido</th>
        <th>Vendido</th>
        <th>Disponível</th>
        <th>Mínimo</th>
      </tr>
    </thead>
    <tbody>${corpo}</tbody>
  </table>`;
}

export function lerLinhasLoteDoDom(container, linhas) {
  return (linhas || []).map((item) => {
    const id = item.produto_id;
    return {
      ...item,
      inicial: container.querySelector(`[data-lote-inicial="${id}"]`)?.value ?? item.inicial,
      produzido: container.querySelector(`[data-lote-produzido="${id}"]`)?.value ?? item.produzido,
      minimo: container.querySelector(`[data-lote-minimo="${id}"]`)?.value ?? item.minimo,
      erro: '',
    };
  });
}

export function validarLinhasLote(linhas) {
  const atualizadas = (linhas || []).map((item) => {
    const validacao = validarLancamentoEstoque(item);
    return {
      ...item,
      erro: validacao.ok ? '' : Object.values(validacao.erros)[0],
      valores: validacao.ok ? validacao.valores : null,
    };
  });
  const invalida = atualizadas.find((item) => item.erro);
  return {
    ok: !invalida,
    linhas: atualizadas,
    produtoIdErro: invalida?.produto_id ?? null,
  };
}

export function aplicarErroLote(linhas, erro) {
  const produtoId = produtoIdDoErroLote(erro);
  const mensagem = erro?.mensagem || erro?.message || 'Item inválido no lote.';
  return (linhas || []).map((item) => ({
    ...item,
    erro: produtoId != null && Number(item.produto_id) === Number(produtoId) ? mensagem : '',
  }));
}

function valorCampo(valor) {
  if (valor === undefined || valor === null || valor === '') {
    return '';
  }
  return String(valor);
}

function parseDecimalOuZero(valor) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    return 0;
  }
  const numero = parseDecimal(valor);
  if (Number.isNaN(numero)) {
    return null;
  }
  return numero;
}
