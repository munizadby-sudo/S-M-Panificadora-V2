/**
 * Item 6, docs/depois-do-teste.md — leitura da etiqueta da balança no PDV.
 *
 * O PDV não fala com a balança. O leitor de código de barras entra no PC como
 * teclado, digitando o código na busca; aqui só traduzimos esse código pro
 * produto + peso, segundo o perfil configurado. Trocar de marca de balança é
 * trocar o perfil (docs/depois-do-teste.md) — nada no caixa muda.
 *
 * Formato "padrão balança" (confirmado com etiqueta real da Filizola Platina
 * em 2026-09-12, docs/depois-do-teste.md item 6): EAN-13 de 13 dígitos —
 * prefixo (2) + código do produto/PLU (5) + valor total em centavos (5) +
 * dígito verificador EAN-13 (1). A etiqueta traz o VALOR já calculado
 * (peso × preço/kg), nunca o peso puro.
 */
export const PERFIS_BALANCA = Object.freeze({
  filizola: Object.freeze({ nome: 'Filizola Platina', prefixo: '20' }),
});

export function perfisDisponiveis() {
  return Object.entries(PERFIS_BALANCA).map(([id, dados]) => ({ id, nome: dados.nome }));
}

/**
 * @returns {{ codigoProduto: string, valorCentavos: number } | null} `null` quando o código não é
 * de 13 dígitos, não bate com o prefixo do perfil, ou o dígito verificador está errado — nesses
 * casos o PDV deve avisar "não reconheci" e deixar o operador lançar na mão, nunca travar.
 */
export function decodificarCodigoBalanca(codigo, perfil = 'filizola') {
  const config = PERFIS_BALANCA[perfil];
  if (!config) {
    return null;
  }
  const digitos = String(codigo ?? '').trim();
  if (!/^\d{13}$/.test(digitos) || !digitos.startsWith(config.prefixo)) {
    return null;
  }
  if (!digitoVerificadorEan13Bate(digitos)) {
    return null;
  }
  return {
    codigoProduto: digitos.slice(2, 7),
    valorCentavos: Number(digitos.slice(7, 12)),
  };
}

function digitoVerificadorEan13Bate(digitos) {
  const nums = digitos.split('').map(Number);
  let somaImpar = 0;
  let somaPar = 0;
  for (let i = 0; i < 12; i += 1) {
    if (i % 2 === 0) {
      somaImpar += nums[i];
    } else {
      somaPar += nums[i];
    }
  }
  const calculado = (10 - ((somaImpar + somaPar * 3) % 10)) % 10;
  return calculado === nums[12];
}

/**
 * Peso derivado do valor da etiqueta ÷ preço/kg do cadastro — nunca calculamos preço na hora do
 * scan (decisão do item 6): quem manda no preço é o cadastro do produto, a etiqueta só diz quanto
 * pesou. `null` quando o produto não tem preço/kg válido (não deveria acontecer, mas não quebra).
 */
export function pesoDoCodigoBalanca(valorCentavos, precoPorKg) {
  const preco = Number(precoPorKg);
  if (!(preco > 0)) {
    return null;
  }
  return Math.round(((Number(valorCentavos) || 0) / 100 / preco) * 1000) / 1000;
}
