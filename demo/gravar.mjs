import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(RAIZ, 'pw-browsers');
const { chromium } = await import('playwright');
const BASE = process.env.DEMO_BASE || 'http://127.0.0.1:4173';
const DIR_VIDEO = path.join(RAIZ, 'video-raw');
const SAIDA_MP4 = path.join(RAIZ, 'sm-panificadora-demo.mp4');
const LARGURA = 1280;
const ALTURA = 800;

const CONTAS = [
  { usuario: process.env.DEMO_USER || 'demo', senha: process.env.DEMO_PASS || 'demo1234' },
  { usuario: 'admin', senha: 'admin123' },
];

const CURSOR_SCRIPT = `
(() => {
  const style = document.createElement('style');
  style.textContent = \`
    #__demo_cursor { position: fixed; width: 22px; height: 22px; border-radius: 50%;
      background: rgba(224, 145, 58, 0.95); border: 2px solid #fff; box-shadow: 0 0 8px rgba(0,0,0,.55);
      pointer-events: none; z-index: 2147483647; transform: translate(-50%, -50%); left: -100px; top: -100px; }
    #__demo_ripple { position: fixed; width: 10px; height: 10px; border-radius: 50%;
      border: 3px solid rgba(224,145,58,.95); pointer-events: none; z-index: 2147483646;
      transform: translate(-50%, -50%) scale(1); opacity: 0; left: -100px; top: -100px; }
    #__demo_ripple.ativo { animation: __demo_ripple_anim .45s ease-out; }
    @keyframes __demo_ripple_anim { 0% { opacity: .95; transform: translate(-50%,-50%) scale(1);} 100% { opacity: 0; transform: translate(-50%,-50%) scale(4);} }
    #__demo_caption { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%);
      background: rgba(20, 23, 28, .92); color: #eef1f5; padding: 10px 24px; border-radius: 999px;
      font: 600 16px/1.4 'Segoe UI', Tahoma, sans-serif; z-index: 2147483647; letter-spacing: .01em;
      box-shadow: 0 4px 20px rgba(0,0,0,.4); pointer-events: none; max-width: 90vw; text-align:center;
      border: 1px solid #2e3440; }
  \`;
  document.documentElement.appendChild(style);
  const cur = document.createElement('div'); cur.id = '__demo_cursor'; document.documentElement.appendChild(cur);
  const rip = document.createElement('div'); rip.id = '__demo_ripple'; document.documentElement.appendChild(rip);
  const cap = document.createElement('div'); cap.id = '__demo_caption'; cap.hidden = true; document.documentElement.appendChild(cap);
  window.__demoSetCursor = (x, y) => { cur.style.left = x + 'px'; cur.style.top = y + 'px'; };
  window.__demoClickFx = (x, y) => {
    rip.style.left = x + 'px'; rip.style.top = y + 'px';
    rip.classList.remove('ativo'); void rip.offsetWidth; rip.classList.add('ativo');
  };
  window.__demoCaption = (texto) => {
    if (!texto) { cap.hidden = true; return; }
    cap.hidden = false; cap.textContent = texto;
  };
})();
`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  fs.rmSync(DIR_VIDEO, { recursive: true, force: true });
  fs.mkdirSync(DIR_VIDEO, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--force-color-profile=srgb', '--hide-scrollbars'],
  });
  const context = await browser.newContext({
    viewport: { width: LARGURA, height: ALTURA },
    recordVideo: { dir: DIR_VIDEO, size: { width: LARGURA, height: ALTURA } },
    locale: 'pt-BR',
  });
  const page = await context.newPage();
  await page.addInitScript(CURSOR_SCRIPT);

  const log = [];
  const passo = async (nome, fn) => {
    process.stdout.write(`→ ${nome}...\n`);
    try {
      await fn();
      log.push({ nome, ok: true });
    } catch (erro) {
      log.push({ nome, ok: false, erro: String(erro?.message || erro) });
      process.stderr.write(`  ! ${nome}: ${erro?.message || erro}\n`);
    }
  };

  async function moverPara(x, y, steps = 18) {
    await page.mouse.move(x, y, { steps });
    await page.evaluate((mx, my) => window.__demoSetCursor?.(mx, my), x, y).catch(() => {});
  }

  async function clicarLocator(locator, { delay = 140 } = {}) {
    const alvo = locator.first();
    await alvo.scrollIntoViewIfNeeded();
    await sleep(80);
    const box = await alvo.boundingBox();
    if (!box) {
      await alvo.click({ timeout: 8000 });
      return;
    }
    const x = box.x + box.width / 2;
    const y = box.y + Math.min(box.height / 2, 18);
    await moverPara(x, y);
    await sleep(delay);
    await page.evaluate((mx, my) => window.__demoClickFx?.(mx, my), x, y).catch(() => {});
    await page.mouse.click(x, y);
  }

  async function caption(texto, ms = 900) {
    await page.evaluate((t) => window.__demoCaption?.(t), texto).catch(() => {});
    await sleep(ms);
  }

  async function preencher(locator, texto, { delay = 45 } = {}) {
    await clicarLocator(locator);
    await locator.first().fill('');
    await locator.first().pressSequentially(texto, { delay });
  }

  async function irParaMais(id) {
    const select = page.locator('select.menu-mais');
    await select.waitFor({ timeout: 8000 });
    const box = await select.boundingBox();
    if (box) await moverPara(box.x + box.width / 2, box.y + box.height / 2, 12);
    await select.selectOption(id);
    await sleep(700);
  }

  async function entrar() {
    await page.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#username', { timeout: 12000 });
    await caption('S&M Panificadora — login', 1100);

    let entrou = false;
    for (const conta of CONTAS) {
      await preencher(page.locator('#username'), conta.usuario);
      await preencher(page.locator('#senha'), conta.senha);
      await sleep(250);
      await clicarLocator(page.getByRole('button', { name: 'Entrar' }));
      try {
        await page.waitForURL(/index\.html/, { timeout: 8000 });
        entrou = true;
        break;
      } catch {
        const erro = (await page.locator('#login-erro').textContent()) || '';
        process.stderr.write(`  login ${conta.usuario}: ${erro || 'não entrou'}\n`);
      }
    }
    if (!entrou) throw new Error('Não foi possível entrar (demo/admin).');
    await page.waitForSelector('nav, #menu, [data-modulo-id], select.menu-mais, button', { timeout: 10000 });
    await sleep(600);
  }

  async function garantirCaixaAberto() {
    const banner = page.getByRole('button', { name: /Caixa (aberto|fechado)/i }).first();
    const texto = ((await banner.textContent().catch(() => '')) || '').toLowerCase();
    if (texto.includes('aberto')) return;
    await caption('Abrindo o turno de caixa', 700);
    await clicarLocator(banner);
    await page.getByRole('heading', { name: /Abrir turno/i }).waitFor({ timeout: 8000 });
    await sleep(400);
    await clicarLocator(page.getByRole('button', { name: 'Confirmar abertura' }));
    await page.getByRole('button', { name: /Caixa aberto/i }).waitFor({ timeout: 10000 });
    await sleep(500);
  }

  async function tourPdv() {
    await caption('PDV — nova venda', 800);
    const vendas = page.locator('[data-modulo-id="pdv"]');
    if (await vendas.count()) await clicarLocator(vendas);
    await page.locator('.pdv-produto').first().waitFor({ timeout: 10000 });
    await sleep(400);

    const produtos = page.locator('.pdv-produto');
    const qtd = await produtos.count();
    if (qtd === 0) throw new Error('Nenhum produto na grade do PDV.');
    await clicarLocator(produtos.nth(0));
    await sleep(350);
    await clicarLocator(produtos.nth(qtd > 1 ? 1 : 0));
    await sleep(400);
    await page.locator('#pdv-carrinho-itens li').first().waitFor({ timeout: 8000 });

    await caption('PDV — finalizar venda', 700);
    await clicarLocator(page.locator('#btn-finalizar-venda'));
    await page.locator('#modal-pdv-pagamento:not([hidden]) [data-forma="dinheiro"]').waitFor({ timeout: 8000 });
    await sleep(300);
    await clicarLocator(page.locator('[data-forma="dinheiro"]'));
    await page.locator('#pdv-recebido').waitFor({ state: 'visible', timeout: 8000 });
    await sleep(300);
    await preencher(page.locator('#pdv-recebido'), '50');
    await sleep(400);
    await clicarLocator(page.locator('#btn-confirmar-venda'));
    await page.getByText(/Venda confirmada/i).first().waitFor({ timeout: 10000 }).catch(() => {});
    await caption('Venda confirmada', 1400);
  }

  async function tourEstoque() {
    await caption('Estoque do dia', 700);
    await clicarLocator(page.locator('[data-modulo-id="estoque"]'));
    await sleep(1600);
  }

  async function tourFuncionarios() {
    await caption('Funcionários e folha', 700);
    await irParaMais('funcionarios');
    await page.getByRole('heading', { name: /Funcionários/i }).waitFor({ timeout: 8000 });
    await sleep(1200);
    await clicarLocator(page.locator('[data-aba="adiantamentos"]'));
    await sleep(900);
    await clicarLocator(page.locator('[data-aba="folha"]'));
    await sleep(1200);
    await clicarLocator(page.locator('[data-aba="cadastro"]'));
    await sleep(900);
  }

  async function tourRelatorios() {
    await caption('Relatórios — dashboard de vendas', 700);
    await irParaMais('relatorios');
    await page.getByRole('heading', { name: /Relatórios/i }).waitFor({ timeout: 8000 });
    await sleep(1800);
  }

  async function tourFluxo() {
    await caption('Fluxo de caixa — resumo do turno', 700);
    await clicarLocator(page.locator('[data-modulo-id="fluxo"]'));
    await sleep(1600);
    const descricao = page.getByPlaceholder('Ex: Pagamento fornecedor...');
    if (await descricao.count()) {
      await caption('Fluxo de caixa — lançamento de demonstração', 700);
      await preencher(descricao, 'Compra de sacolas (demo)');
      await sleep(250);
      const valor = page.locator('#fluxo-valor, input[name="valor"]').first();
      if (await valor.count()) await preencher(valor, '15');
      await sleep(300);
      const lancar = page.getByRole('button', { name: /Lançar/i });
      if (await lancar.count()) {
        await clicarLocator(lancar);
        await sleep(1100);
      }
      const linha = page.locator('tr, li, div').filter({ hasText: 'Compra de sacolas' }).filter({ has: page.getByRole('button', { name: 'Excluir' }) }).first();
      if (await linha.count()) {
        await caption('Excluindo o lançamento de teste', 700);
        await clicarLocator(linha.getByRole('button', { name: 'Excluir' }));
        await sleep(400);
        const motivo = page.locator('textarea').first();
        if (await motivo.count()) await preencher(motivo, 'Lancamento de demonstracao');
        const confirmar = page.getByRole('button', { name: /Confirmar exclusão/i });
        if (await confirmar.count()) await clicarLocator(confirmar);
        await sleep(900);
      }
    }
  }

  async function tourCaixa() {
    await caption('Caixa — conferência de turno', 700);
    await clicarLocator(page.getByRole('button', { name: /Caixa aberto/i }).first());
    await sleep(500);
    const fechar = page.getByRole('button', { name: 'Fechar caixa' });
    if (await fechar.count()) {
      await clicarLocator(fechar);
      await page.getByText(/ESPERADO|esperado|contagem/i).first().waitFor({ timeout: 8000 }).catch(() => {});
      await sleep(1400);
      await caption('Conferência de caixa (não finalizada nesta demonstração)', 1600);
      await page.keyboard.press('Escape');
      await sleep(400);
    }
  }

  await passo('login', entrar);
  await passo('caixa', garantirCaixaAberto);
  await passo('pdv', tourPdv);
  await passo('estoque', tourEstoque);
  await passo('funcionarios', tourFuncionarios);
  await passo('relatorios', tourRelatorios);
  await passo('fluxo', tourFluxo);
  await passo('caixa-conferencia', tourCaixa);
  await caption('Fim da demonstração', 1600);

  const video = page.video();
  await context.close();
  await browser.close();

  const webmOrigem = video ? await video.path() : null;
  if (!webmOrigem || !fs.existsSync(webmOrigem)) {
    throw new Error('Playwright não gerou o arquivo de vídeo.');
  }

  const webmDestino = path.join(RAIZ, 'sm-panificadora-demo.webm');
  fs.copyFileSync(webmOrigem, webmDestino);

  if (!ffmpegPath) throw new Error('ffmpeg-static não encontrado.');
  const conv = spawnSync(
    ffmpegPath,
    ['-y', '-i', webmDestino, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', SAIDA_MP4],
    { encoding: 'utf8' },
  );
  if (conv.status !== 0) {
    process.stderr.write(conv.stderr || conv.stdout || '');
    throw new Error('Falha ao converter o vídeo para MP4.');
  }

  fs.writeFileSync(path.join(RAIZ, 'run-log.json'), JSON.stringify({ log, saida: SAIDA_MP4 }, null, 2));
  console.log('OK', SAIDA_MP4);
}

main().catch((erro) => {
  console.error('ERRO_GRAVACAO', erro);
  process.exit(1);
});
