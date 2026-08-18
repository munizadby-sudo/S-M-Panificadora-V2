import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { ApiError, definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { criarPerda, mensagemErroPerda } from '../../src/modules/perdas/api.js';
import { htmlFormularioPerda } from '../../src/modules/perdas/formulario.js';
import { MOTIVOS_PERDA } from '../../src/modules/perdas/motivos.js';
import { calcularPreviaCusto, validarFormularioPerda } from '../../src/modules/perdas/validacao.js';

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['perdas'],
  });
});

function jsonOk(corpo, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async text() {
      return JSON.stringify(corpo);
    },
  };
}

describe('Passo 2 — formulário de registro', () => {
  test('motivo é sempre select fixo — nunca campo de texto livre', () => {
    const html = htmlFormularioPerda({
      formulario: { buscaProduto: '', produto: null, quantidade: '', motivo: 'queimado', data: '2026-08-17' },
      resultadosProduto: [],
      previaCusto: null,
    });
    assert.match(html, /<select[^>]*id="perda-motivo"/);
    for (const item of MOTIVOS_PERDA) {
      assert.match(html, new RegExp(`value="${item.valor}"`));
    }
    assert.doesNotMatch(html, /type="text"[^>]*motivo/i);
    assert.doesNotMatch(html, /textarea[^>]*motivo/i);
  });

  test('prévia de custo é calculada localmente para feedback instantâneo', () => {
    const previa = calcularPreviaCusto({ custo: 0.3 }, 5);
    assert.equal(previa, 1.5);
    const html = htmlFormularioPerda({
      formulario: {
        buscaProduto: 'Pão',
        produto: { id: 12, nome: 'Pão Francês', custo: 0.3 },
        quantidade: '5',
        motivo: 'queimado',
        data: '2026-08-17',
      },
      resultadosProduto: [],
      previaCusto: 1.5,
    });
    assert.match(html, /Prévia de custo/);
    assert.match(html, /estimativa local/);
  });

  test('confirmação após salvar exibe custo_calculado vindo do backend', () => {
    const html = htmlFormularioPerda({
      formulario: {},
      confirmacao: {
        perda: {
          produto_id: 12,
          data: '2026-08-17',
          quantidade: 5,
          custo_calculado: 1.55,
        },
        disponivel: null,
      },
    });
    assert.match(html, /Custo calculado \(backend\)/);
    assert.match(html, /R\$\s*1,55/);
    assert.doesNotMatch(html, /Prévia de custo/);
  });

  test('criarPerda envia POST /perdas', async () => {
    const urls = [];
    const corpos = [];
    globalThis.fetch = async (url, init) => {
      urls.push(String(url));
      corpos.push(JSON.parse(init.body));
      return jsonOk({
        id: 8,
        produto_id: 12,
        data: '2026-08-17',
        quantidade: 5,
        motivo: 'queimado',
        custo_calculado: 1.5,
      });
    };

    const resposta = await criarPerda({
      produto_id: 12,
      data: '2026-08-17',
      quantidade: 5,
      motivo: 'queimado',
    });
    assert.match(urls[0], /\/perdas$/);
    assert.equal(corpos[0].produto_id, 12);
    assert.equal(resposta.custo_calculado, 1.5);
  });

  test('validarFormularioPerda rejeita quantidade ≤ 0', () => {
    const invalido = validarFormularioPerda({
      produtoId: 12,
      quantidade: 0,
      motivo: 'queimado',
      data: '2026-08-17',
    });
    assert.equal(invalido.ok, false);
    assert.match(invalido.erros.quantidade, /maior que zero/);
  });

  test('mensagemErroPerda traduz estoque insuficiente', () => {
    const msg = mensagemErroPerda(
      new ApiError({ status: 400, mensagem: 'Estoque insuficiente.' }),
    );
    assert.equal(msg, 'Estoque insuficiente para registrar essa perda.');
  });
});
