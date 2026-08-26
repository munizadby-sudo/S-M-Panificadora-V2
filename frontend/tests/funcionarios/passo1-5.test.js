import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { ApiError, definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import {
  criarFuncionario,
  fecharFolha,
  marcarFolhaPaga,
  mensagemErroFuncionarios,
} from '../../src/modules/funcionarios/api.js';
import {
  campoValorOcorrenciaDesabilitado,
  htmlFormularioFechamento,
  htmlFormularioOcorrencia,
  htmlTabelaFolhas,
  htmlTabelaFuncionarios,
  valorOcorrenciaParaTipo,
} from '../../src/modules/funcionarios/ui.js';
import moduloFuncionarios from '../../src/modules/funcionarios/index.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

beforeEach(() => {
  instalarAmbienteDeTeste();
  definirApiBaseUrl('/api');
  salvarSessao('token', {
    id: 1,
    nome: 'Admin',
    username: 'admin',
    role: 'admin',
    permissoes: [],
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

describe('Passo 1 — contrato e cadastro', () => {
  test('módulo exporta contrato SPEC-FE-001 / SPEC-FE-013', () => {
    assert.equal(moduloFuncionarios.id, 'funcionarios');
    assert.equal(moduloFuncionarios.label, 'Funcionários');
    assert.equal(moduloFuncionarios.icone, 'ti-users');
    assert.equal(moduloFuncionarios.permissao, 'admin');
    assert.equal(typeof moduloFuncionarios.montar, 'function');
    assert.equal(typeof moduloFuncionarios.desmontar, 'function');
  });

  test('index.html registra módulo só para admin', () => {
    const html = readFileSync(join(raiz, 'index.html'), 'utf8');
    assert.match(html, /getUsuario\(\)\?\.role === 'admin'/);
    assert.match(html, /registrarModulo\(moduloFuncionarios\)/);
  });

  test('criarFuncionario chama POST /funcionarios', async () => {
    const urls = [];
    globalThis.fetch = async (url, init) => {
      urls.push(String(url));
      assert.equal(init.method, 'POST');
      return jsonOk({
        id: 1,
        nome: 'Ana',
        cargo: 'Padeira',
        salario_base: 1800,
        data_admissao: '2026-01-01',
        ativo: 1,
      });
    };
    const salvo = await criarFuncionario({
      nome: 'Ana',
      cargo: 'Padeira',
      salario_base: 1800,
      data_admissao: '2026-01-01',
    });
    assert.equal(salvo.nome, 'Ana');
    assert.match(urls[0], /\/funcionarios$/);
  });

  test('tabela lista nome/cargo e usa Desativar/Reativar', () => {
    const html = htmlTabelaFuncionarios([
      {
        id: 1,
        nome: 'Ana',
        cargo: 'Padeira',
        salario_base: 1800,
        data_admissao: '2026-01-01',
        ativo: 1,
      },
      {
        id: 2,
        nome: 'Bia',
        cargo: 'Caixa',
        salario_base: 1600,
        data_admissao: '2026-02-01',
        ativo: 0,
      },
    ]);
    assert.match(html, /Ana/);
    assert.match(html, /Desativar/);
    assert.match(html, /Reativar/);
    assert.doesNotMatch(html, /Excluir/);
  });
});

describe('Passo 3 — ocorrência atestado', () => {
  test('atestado desabilita valor e força 0 na UI', () => {
    assert.equal(campoValorOcorrenciaDesabilitado('atestado'), true);
    assert.equal(valorOcorrenciaParaTipo('atestado', 99), 0);
    assert.equal(valorOcorrenciaParaTipo('hora_extra', 45), 45);

    const html = htmlFormularioOcorrencia({
      funcionarios: [{ id: 1, nome: 'Ana', ativo: 1 }],
      formulario: { tipo: 'atestado', valor: 50 },
    });
    assert.match(html, /id="ocor-valor"[^>]*disabled/);
    assert.match(html, /value="0"/);
    assert.match(html, /funcionarios-modal/);
  });
});

describe('Passo 4–5 — fechamento e pagamento', () => {
  test('líquido exibido vem do backend', () => {
    const html = htmlFormularioFechamento({
      funcionarios: [{ id: 1, nome: 'Ana', ativo: 1 }],
      resultado: {
        salario_base: 1800,
        total_adiantamentos: 150,
        total_faltas: 0,
        total_horas_extras: 45,
        valor_liquido: 1695,
      },
    });
    assert.match(html, /data-valor-liquido="1695"/);
    assert.match(html, /modal-form-folha/);
  });

  test('409 vira mensagem de negócio', () => {
    const msg = mensagemErroFuncionarios(
      new ApiError({
        status: 409,
        mensagem: 'Já existe folha fechada para este funcionário neste período.',
      }),
    );
    assert.match(msg, /folha|período|periodo/i);
  });

  test('fecharFolha e marcarFolhaPaga usam rotas corretas', async () => {
    const urls = [];
    globalThis.fetch = async (url, init) => {
      urls.push({ url: String(url), method: init?.method || 'GET' });
      if (String(url).includes('/pagar')) {
        return jsonOk({ id: 9, status: 'paga', valor_liquido: 1695 });
      }
      return jsonOk({
        id: 9,
        funcionario_id: 1,
        periodo_inicio: '2026-08-01',
        periodo_fim: '2026-08-15',
        salario_base: 1800,
        total_adiantamentos: 150,
        total_faltas: 0,
        total_horas_extras: 45,
        valor_liquido: 1695,
        status: 'pendente',
      });
    };

    const folha = await fecharFolha({
      funcionario_id: 1,
      periodo_inicio: '2026-08-01',
      periodo_fim: '2026-08-15',
    });
    assert.equal(folha.valor_liquido, 1695);
    assert.match(urls[0].url, /\/folhas$/);
    assert.equal(urls[0].method, 'POST');

    const paga = await marcarFolhaPaga(9);
    assert.equal(paga.status, 'paga');
    assert.match(urls[1].url, /\/folhas\/9\/pagar/);

    const tabela = htmlTabelaFolhas([
      {
        id: 9,
        funcionario_id: 1,
        funcionario_nome: 'Ana',
        periodo_inicio: '2026-08-01',
        periodo_fim: '2026-08-15',
        salario_base: 1800,
        valor_liquido: 1695,
        status: 'pendente',
      },
    ]);
    assert.match(tabela, /Marcar como paga/);
  });
});
