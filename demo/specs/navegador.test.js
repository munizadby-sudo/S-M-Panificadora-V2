import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, describe, test } from 'node:test';
import {
  ADMIN,
  OPERADOR,
  abrirLogin,
  abrirShell,
  abrirTurnoSeFechado,
  comPagina,
  entrar,
  esperarFormularioLogin,
  sessao,
} from './harness.mjs';

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'pw-browsers',
);
const { chromium } = await import('playwright');

let browser;

before(async () => {
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
});

describe('SPEC-FE-002 — autenticação no navegador', () => {
  test('passo 3: index.html sem sessão cai no login', async () => {
    await comPagina(browser, async (page) => {
      await abrirShell(page);
      await page.waitForURL(/login\.html/, { timeout: 10000 });
      await page.waitForSelector('#form-login');
      const dados = await sessao(page);
      assert.equal(dados.token, null);
    });
  });

  test('passo 2: senha errada permanece no login e não grava token', async () => {
    await comPagina(browser, async (page) => {
      await abrirLogin(page);
      await esperarFormularioLogin(page);
      await page.locator('#username').fill(ADMIN.usuario);
      await page.locator('#senha').fill('senha-errada');
      await page.getByRole('button', { name: 'Entrar' }).click();
      await page.locator('#login-erro').waitFor({ state: 'visible', timeout: 8000 });
      assert.match(await page.locator('#login-erro').innerText(), /Usuário ou senha incorretos/i);
      assert.match(page.url(), /login\.html/);
      const dados = await sessao(page);
      assert.equal(dados.token, null);
    });
  });

  test('passo 2 e 5: login válido abre o shell e mostra Nome (admin)', async () => {
    await comPagina(browser, async (page) => {
      const loginPost = page.waitForResponse(
        (res) => res.url().includes('/auth/login') && res.request().method() === 'POST',
      );
      await entrar(page, ADMIN);
      const resposta = await loginPost;
      assert.equal(resposta.status(), 200);
      const dados = await sessao(page);
      assert.ok(dados.token);
      assert.match(dados.usuario || '', /"role":"admin"/);
      assert.match(await page.locator('#usuario-logado').innerText(), /Administrador \(admin\)/);
    });
  });

  test('passo 8: GET público de identidade sem Authorization', async () => {
    await comPagina(browser, async (page) => {
      const publico = page.waitForResponse((res) => res.url().includes('/configuracoes/publico'));
      await abrirLogin(page);
      await esperarFormularioLogin(page);
      const resposta = await publico;
      assert.ok(resposta.ok());
      assert.equal(resposta.request().headers().authorization, undefined);
      assert.match(await page.locator('#nome-loja').innerText(), /S&M Panificadora/);
    });
  });

  test('passo 6: quem já está logado não vê o formulário de login', async () => {
    await comPagina(browser, async (page) => {
      await entrar(page, ADMIN);
      await abrirLogin(page);
      await page.waitForURL(/index\.html/, { timeout: 8000 });
      await page.waitForSelector('#usuario-logado');
      assert.equal(await page.locator('#form-login').count(), 0);
    });
  });

  test('passo 4: Sair limpa a sessão e a guarda devolve ao login', async () => {
    await comPagina(browser, async (page) => {
      await entrar(page, ADMIN);
      await page.locator('#btn-logout').click();
      await page.waitForURL(/login\.html/, { timeout: 8000 });
      const depois = await sessao(page);
      assert.equal(depois.token, null);
      assert.equal(depois.usuario, null);
      await abrirShell(page);
      await page.waitForURL(/login\.html/, { timeout: 8000 });
    });
  });

  test('passo 5: operador mostra Nome (operador)', async () => {
    await comPagina(browser, async (page) => {
      await entrar(page, OPERADOR);
      assert.match(await page.locator('#usuario-logado').innerText(), /Maria Silva \(operador\)/);
    });
  });

  test('passo 7: token inválido limpa a sessão e volta ao login', async () => {
    await comPagina(browser, async (page) => {
      await entrar(page, ADMIN);
      await page.evaluate(() => {
        localStorage.setItem('sm.panificadora.token', 'token-morto');
      });
      await abrirShell(page);
      await page.waitForURL(/login\.html/, { timeout: 10000 });
      const dados = await sessao(page);
      assert.equal(dados.token, null);
    });
  });
});

describe('SPEC-FE-007 — PDV com caixa fechado', () => {
  test('passo 1: tela de vendas mostra o aviso, não a grade', async () => {
    await comPagina(browser, async (page) => {
      await entrar(page, ADMIN);
      const pdv = page.locator('[data-modulo-id="pdv"]');
      if (await pdv.count()) await pdv.click();
      await page.locator('#aviso-caixa-fechado').waitFor({ timeout: 10000 });
      assert.equal(await page.locator('.pdv-produto').count(), 0);
    });
  });
});

describe('SPEC-FE-003 — caixa por turno', () => {
  test('passo 1: banner começa em Caixa fechado', async () => {
    await comPagina(browser, async (page) => {
      await entrar(page, ADMIN);
      await page.locator('#caixa-turno-banner').waitFor({ timeout: 8000 });
      await page.waitForFunction(
        () => document.getElementById('caixa-turno-banner')?.innerText.includes('Caixa fechado'),
        null,
        { timeout: 8000 },
      );
      assert.equal(await page.locator('#caixa-turno-banner').getAttribute('data-aberto'), 'false');
    });
  });

  test('passo 2: abrir turno muda o banner para Caixa aberto', async () => {
    await comPagina(browser, async (page) => {
      await entrar(page, ADMIN);
      await abrirTurnoSeFechado(page);
      assert.equal(await page.locator('#caixa-turno-banner').getAttribute('data-aberto'), 'true');
    });
  });
});

describe('SPEC-FE-007 — PDV com caixa aberto', () => {
  test('passos 2–3: grade, carrinho e venda em dinheiro', async () => {
    await comPagina(browser, async (page) => {
      await entrar(page, ADMIN);
      await abrirTurnoSeFechado(page);

      const pdv = page.locator('[data-modulo-id="pdv"]');
      if (await pdv.count()) await pdv.click();
      await page.locator('.pdv-produto').first().waitFor({ timeout: 10000 });
      await page.locator('.pdv-produto').first().click();
      await page.locator('#pdv-carrinho-itens li').first().waitFor({ timeout: 8000 });

      await page.locator('#btn-finalizar-venda').click();
      await page.locator('#modal-pdv-pagamento:not([hidden]) [data-forma="dinheiro"]').waitFor({
        timeout: 8000,
      });
      await page.locator('[data-forma="dinheiro"]').click();
      await page.locator('#pdv-recebido').waitFor({ state: 'visible', timeout: 8000 });
      await page.locator('#pdv-recebido').fill('50');
      await page.locator('#btn-confirmar-venda').click();
      await page.getByText(/Venda confirmada/i).first().waitFor({ timeout: 10000 });
    });
  });
});

describe('SPEC-FE-015 — layout estreito', () => {
  const celular = { viewport: { width: 390, height: 844 } };

  test('login em 390px não gera scroll horizontal da página', async () => {
    await comPagina(browser, async (page) => {
      await abrirLogin(page);
      await esperarFormularioLogin(page);
      const medida = await page.evaluate(() => ({
        scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        inner: window.innerWidth,
      }));
      assert.ok(
        medida.scroll <= medida.inner + 8,
        `login scrollWidth ${medida.scroll} > innerWidth ${medida.inner}`,
      );
    }, celular);
  });

  test('shell e PDV em 390px: sem scroll da página, menu rola, painel empilha', async () => {
    await comPagina(browser, async (page) => {
      await entrar(page, ADMIN);
      const shell = await page.evaluate(() => {
        const menu = document.getElementById('menu-principal');
        return {
          scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
          inner: window.innerWidth,
          menuOverflow: menu ? getComputedStyle(menu).overflowX : '',
        };
      });
      assert.ok(
        shell.scroll <= shell.inner + 8,
        `shell scrollWidth ${shell.scroll} > innerWidth ${shell.inner}`,
      );
      assert.equal(shell.menuOverflow, 'auto');

      await abrirTurnoSeFechado(page);
      const pdv = page.locator('[data-modulo-id="pdv"]');
      if (await pdv.count()) await pdv.click();
      await page.locator('.pdv-painel').waitFor({ timeout: 10000 });
      const colunas = await page.locator('.pdv-painel').evaluate((el) =>
        getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length,
      );
      assert.equal(colunas, 1);
    }, celular);
  });
});
