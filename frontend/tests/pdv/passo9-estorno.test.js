import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { ApiError, definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { invalidarCacheTurno } from '../../src/modules/caixa-turno/estado.js';
import {
  estornarVenda,
  listarVendas,
  mensagemErroEstorno,
} from '../../src/modules/pdv/api.js';
import { htmlListaVendasTurno } from '../../src/modules/pdv/lista-turno.js';
import { htmlModalEstornoVenda } from '../../src/modules/pdv/modal-estorno-venda.js';
import moduloPdv from '../../src/modules/pdv/index.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  invalidarCacheTurno();
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: ['caixa'],
  });
});

afterEach(() => {
  moduloPdv.desmontar();
  invalidarCacheTurno();
});

function jsonOk(corpo) {
  return {
    status: 200,
    ok: true,
    async text() {
      return JSON.stringify(corpo);
    },
  };
}

function criarContainerPdv() {
  return {
    _html: '',
    get innerHTML() {
      return this._html;
    },
    set innerHTML(valor) {
      this._html = String(valor || '');
    },
    querySelector(sel) {
      if (sel?.startsWith('#') && this._html.includes(`id="${sel.slice(1)}"`)) {
        return {
          textContent: '',
          value: '',
          addEventListener() {},
        };
      }
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

const vendaTurno = {
  id: 481,
  numero: 1024,
  total: 12.75,
  forma_pagamento: 'dinheiro',
  status: 'confirmada',
  criado_em: '2026-08-30T18:05:00.000-03:00',
};

describe('Passo 9 — estorno do turno aberto (alternativa C)', () => {
  test('lista mostra número, hora, total e forma', () => {
    const html = htmlListaVendasTurno({ vendas: [vendaTurno], ehAdmin: false });
    assert.match(html, /pdv-vendas-turno/);
    assert.match(html, /Nº 1024/);
    assert.match(html, /R\$ 12,75/);
    assert.match(html, /Dinheiro/);
    const hora = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(vendaTurno.criado_em));
    assert.match(html, new RegExp(hora.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(html, /data-estornar-venda/);
  });

  test('Estornar só aparece para admin em venda confirmada', () => {
    const admin = htmlListaVendasTurno({ vendas: [vendaTurno], ehAdmin: true });
    const operador = htmlListaVendasTurno({ vendas: [vendaTurno], ehAdmin: false });
    const cancelada = htmlListaVendasTurno({
      vendas: [{ ...vendaTurno, status: 'cancelada' }],
      ehAdmin: true,
    });

    assert.match(admin, /data-estornar-venda="481"/);
    assert.match(admin, />Estornar</);
    assert.doesNotMatch(operador, /data-estornar-venda/);
    assert.doesNotMatch(cancelada, /data-estornar-venda/);
    assert.match(cancelada, /Estornada/);
  });

  test('modal pede motivo e avisa que não dá para desfazer', () => {
    const html = htmlModalEstornoVenda({ venda: vendaTurno, erro: '' });
    assert.match(html, /Estornar venda/);
    assert.match(html, /Não dá para desfazer/);
    assert.match(html, /id="pdv-estorno-motivo"/);
    assert.match(html, /btn-confirmar-estorno-venda/);
    assert.match(html, /Nº 1024/);
  });

  test('listarVendas e estornarVenda usam o contrato existente', async () => {
    const chamadas = [];
    globalThis.fetch = async (url, init) => {
      chamadas.push({ url: String(url), method: init?.method, body: init?.body });
      return jsonOk({ data: [vendaTurno], pagination: { limit: 20, total: 1 } });
    };

    await listarVendas({ turno_id: 7, limit: 20 });
    await estornarVenda(481, 'Item lançado em dobro');

    assert.match(chamadas[0].url, /\/vendas\?/);
    assert.match(chamadas[0].url, /turno_id=7/);
    assert.equal(chamadas[0].method, 'GET');
    assert.equal(chamadas[1].method, 'DELETE');
    assert.match(chamadas[1].url, /\/vendas\/481$/);
    assert.equal(JSON.parse(chamadas[1].body).motivo, 'Item lançado em dobro');
  });

  test('403 de estorno vira mensagem para o balcão', () => {
    const erro = new ApiError({
      status: 403,
      mensagem: 'Acesso restrito a administradores.',
      codigo: 'SO_ADMIN',
    });
    assert.equal(mensagemErroEstorno(erro), 'Só o administrador pode estornar venda.');
  });

  test('PDV do admin lista vendas do turno e mostra Estornar', async () => {
    globalThis.fetch = async (url) => {
      const href = String(url);
      if (href.includes('caixa-turno/status')) {
        return jsonOk({ aberto: true, turno: { id: 7, periodo: 'tarde', status: 'aberto' } });
      }
      if (href.includes('/vendas')) {
        return jsonOk({ data: [vendaTurno], pagination: { limit: 20, total: 1 } });
      }
      return jsonOk({ data: [{ id: 12, nome: 'Pão Francês', preco: 1.5 }] });
    };

    const container = criarContainerPdv();
    await moduloPdv.montar(container);

    assert.match(container.innerHTML, /pdv-vendas-turno/);
    assert.match(container.innerHTML, /Nº 1024/);
    assert.match(container.innerHTML, /data-estornar-venda="481"/);
    assert.match(container.innerHTML, /pdv-grade/);
    assert.match(container.innerHTML, /btn-finalizar-venda/);
  });

  test('operador vê a lista e não vê Estornar', async () => {
    salvarSessao('token', {
      id: 2,
      nome: 'Balcão',
      username: 'caixa',
      role: 'caixa',
      permissoes: ['caixa'],
    });

    globalThis.fetch = async (url) => {
      const href = String(url);
      if (href.includes('caixa-turno/status')) {
        return jsonOk({ aberto: true, turno: { id: 7, periodo: 'tarde', status: 'aberto' } });
      }
      if (href.includes('/vendas')) {
        return jsonOk({ data: [vendaTurno], pagination: { limit: 20, total: 1 } });
      }
      return jsonOk({ data: [{ id: 12, nome: 'Pão Francês', preco: 1.5 }] });
    };

    const container = criarContainerPdv();
    await moduloPdv.montar(container);

    assert.match(container.innerHTML, /Nº 1024/);
    assert.doesNotMatch(container.innerHTML, /data-estornar-venda/);
    assert.doesNotMatch(container.innerHTML, />Estornar</);
  });

  test('módulo consulta vendas pelo turno do estado, nunca status direto', () => {
    const indexFonte = readFileSync(join(frontend, 'src', 'modules', 'pdv', 'index.js'), 'utf8');
    assert.match(indexFonte, /obterTurnoId/);
    assert.match(indexFonte, /listarVendas/);
    assert.match(indexFonte, /estornarVenda/);
    assert.match(indexFonte, /ehAdmin/);
    assert.doesNotMatch(indexFonte, /caixa-turno\/status/);
  });
});
