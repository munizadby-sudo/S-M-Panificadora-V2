import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import { invalidarCacheTurno } from '../../src/modules/caixa-turno/estado.js';
import { listarFluxoCaixa } from '../../src/modules/fluxo-caixa/api.js';
import { htmlContextoTurno, htmlFiltrosFluxo, htmlTabelaFluxo } from '../../src/modules/fluxo-caixa/lista.js';
import moduloFluxo from '../../src/modules/fluxo-caixa/index.js';

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
    permissoes: ['fluxo', 'caixa'],
  });
});

afterEach(() => {
  moduloFluxo.desmontar();
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

const itemFluxo = {
  id: 12,
  turno_id: 7,
  tipo: 'entrada',
  descricao: 'Venda #3',
  categoria: 'vendas',
  forma: 'dinheiro',
  valor: 4.5,
  gerado_auto: 1,
  usuario: 'Admin',
  data: '2026-08-17',
  ativo: 1,
};

describe('Passo 1 — listagem por turno', () => {
  test('módulo exporta o contrato da SPEC-FE-001', () => {
    assert.equal(moduloFluxo.id, 'fluxo');
    assert.equal(moduloFluxo.label, 'Fluxo de Caixa');
    assert.equal(moduloFluxo.icone, 'ti-chart-line');
    assert.equal(moduloFluxo.permissao, 'fluxo');
    assert.equal(typeof moduloFluxo.montar, 'function');
    assert.equal(typeof moduloFluxo.desmontar, 'function');
  });

  test('listarFluxoCaixa consome GET /fluxo-caixa com turno_id', async () => {
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(String(url));
      return jsonOk({
        data: [itemFluxo],
        pagination: { page: 1, limit: 100, total: 1, pages: 1, hasPrevious: false, hasNext: false },
      });
    };

    const resposta = await listarFluxoCaixa({ turno_id: 7, ativo: 1 });
    assert.equal(resposta.data[0].descricao, 'Venda #3');
    assert.match(urls[0], /\/fluxo-caixa/);
    assert.match(urls[0], /turno_id=7/);
  });

  test('tabela mostra tipo, descrição, categoria, forma, valor, origem e usuário', () => {
    const html = htmlTabelaFluxo([itemFluxo, { ...itemFluxo, id: 13, gerado_auto: 0, descricao: 'Sangria', tipo: 'saida' }]);
    assert.match(html, /Tipo/);
    assert.match(html, /Origem/);
    assert.match(html, /Automático/);
    assert.match(html, /Manual/);
    assert.match(html, /Venda #3/);
    assert.match(html, /Sangria/);
  });

  test('sem turno aberto mostra filtros de período', () => {
    const html = htmlFiltrosFluxo({
      filtros: { dataInicio: '2026-08-01', dataFim: '2026-08-17', categoria: '', tipo: '', geradoAuto: '' },
      turnoAberto: false,
    });
    assert.match(html, /fluxo-data-inicio/);
    assert.match(html, /fluxo-data-fim/);

    const contexto = htmlContextoTurno({
      turnoAberto: false,
      turnoId: null,
      modoConsulta: 'periodo',
    });
    assert.match(contexto, /Sem turno aberto/);
  });

  test('com turno aberto indica contexto do turno atual', () => {
    const html = htmlContextoTurno({
      turnoAberto: true,
      turnoId: 7,
      turnoPeriodo: 'tarde',
      modoConsulta: 'turno',
    });
    assert.match(html, /turno aberto/);
    assert.match(html, /tarde/);
    assert.match(html, /id 7/);
  });

  test('módulo fluxo-caixa nunca chama GET caixa-turno/status diretamente', () => {
    const raiz = join(frontend, 'src', 'modules', 'fluxo-caixa');
    const arquivos = readdirSync(raiz)
      .filter((entrada) => extname(entrada) === '.js')
      .map((entrada) => join(raiz, entrada));

    for (const arquivo of arquivos) {
      const fonte = readFileSync(arquivo, 'utf8');
      assert.doesNotMatch(fonte, /caixa-turno\/status/, `${arquivo} não pode consultar status direto`);
    }

    const indexFonte = readFileSync(join(raiz, 'index.js'), 'utf8');
    assert.match(indexFonte, /caixa-turno\/estado\.js/);
    assert.match(indexFonte, /getTurnoAtual/);
  });
});
