import { CHAVE_STORAGE_TOKEN, CHAVE_STORAGE_USUARIO } from '../../frontend/src/core/session.js';

export const ADMIN = { usuario: 'admin', senha: 'admin123', nome: 'Administrador', role: 'admin' };
export const OPERADOR = { usuario: 'maria', senha: 'maria123', nome: 'Maria Silva', role: 'operador' };

export function urls() {
  const front = process.env.SM_E2E_FRONT;
  const api = process.env.SM_E2E_API;
  if (!front || !api) {
    throw new Error('Rode via npm run testar na pasta demo/ — o runner sobe front e API de teste.');
  }
  return { front, api };
}

export async function comPagina(browser, fn, opcoes = {}) {
  const { api } = urls();
  const context = await browser.newContext({
    locale: 'pt-BR',
    viewport: opcoes.viewport || { width: 1280, height: 800 },
  });
  await context.addInitScript((url) => {
    globalThis.__SM_API_BASE = url;
    window.print = () => {};
    const abrir = window.open.bind(window);
    window.open = (...args) => {
      const janela = abrir(...args);
      if (janela) {
        try {
          janela.print = () => {};
        } catch {
          /* popup pode recusar atribuição */
        }
      }
      return janela;
    };
  }, api);
  const page = await context.newPage();
  try {
    await fn(page);
  } finally {
    await context.close();
  }
}

export async function abrirLogin(page) {
  const { front } = urls();
  await page.goto(`${front}/login.html`, { waitUntil: 'domcontentloaded' });
}

export async function esperarFormularioLogin(page) {
  await page.waitForSelector('#username', { timeout: 10000 });
}

export async function esperarBannerCaixa(page) {
  await page.getByRole('button', { name: /Caixa (aberto|fechado)/i }).waitFor({ timeout: 10000 });
}

export async function abrirShell(page) {
  const { front } = urls();
  await page.goto(`${front}/index.html`, { waitUntil: 'domcontentloaded' });
}

export async function entrar(page, conta = ADMIN) {
  await abrirLogin(page);
  await esperarFormularioLogin(page);
  await page.locator('#username').fill(conta.usuario);
  await page.locator('#senha').fill(conta.senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/index\.html/, { timeout: 10000 });
  await page.waitForSelector('#usuario-logado', { timeout: 10000 });
  await esperarBannerCaixa(page);
}

export async function abrirTurnoSeFechado(page) {
  const banner = page.locator('#caixa-turno-banner');
  await esperarBannerCaixa(page);
  if (((await banner.innerText()) || '').includes('aberto')) {
    return;
  }
  await banner.click();
  await page.locator('#form-abrir-caixa').waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: 'Confirmar abertura' }).click();
  await page.locator('#modal-caixa-turno').waitFor({ state: 'hidden', timeout: 10000 });
  await page.getByRole('button', { name: /Caixa aberto/i }).waitFor({ timeout: 10000 });
}

export async function fecharTurnoSeAberto(page) {
  const banner = page.locator('#caixa-turno-banner');
  await esperarBannerCaixa(page);
  if (((await banner.innerText()) || '').includes('fechado')) {
    return;
  }
  await banner.click();
  await page.locator('#btn-fechar-caixa').waitFor({ timeout: 10000 });
  await page.locator('#btn-fechar-caixa').click();
  await page.locator('#form-contagem-caixa').waitFor({ timeout: 10000 });
  await page.locator('#fechamento-dinheiro').fill('40');
  await page.locator('#fechamento-moedas').fill('10');
  await page.locator('#fechamento-pix').fill('0');
  await page.locator('#fechamento-cartao').fill('0');
  await page.getByRole('button', { name: 'Revisar fechamento' }).click();
  await page.locator('#btn-imprimir-comprovante').waitFor({ timeout: 10000 });
  await page.locator('#btn-imprimir-comprovante').click();
  await page.waitForFunction(
    () => {
      const botao = document.getElementById('btn-confirmar-fechamento');
      return Boolean(botao && !botao.disabled);
    },
    null,
    { timeout: 10000 },
  );
  await page.locator('#btn-confirmar-fechamento').click();
  await page.getByText(/Turno fechado/i).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: /Caixa fechado/i }).waitFor({ timeout: 10000 });
  await page.locator('#btn-fechar-modal-caixa').click();
  await page.locator('#modal-caixa-turno').waitFor({ state: 'hidden', timeout: 8000 });
}

export async function sessao(page) {
  return page.evaluate(
    ([chaveToken, chaveUsuario]) => ({
      token: localStorage.getItem(chaveToken),
      usuario: localStorage.getItem(chaveUsuario),
    }),
    [CHAVE_STORAGE_TOKEN, CHAVE_STORAGE_USUARIO],
  );
}
