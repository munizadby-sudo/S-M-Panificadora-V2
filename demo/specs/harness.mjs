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
  await page.getByRole('button', { name: /Caixa aberto/i }).waitFor({ timeout: 10000 });
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
