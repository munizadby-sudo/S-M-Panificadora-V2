import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { instalarAmbienteDeTeste } from '../helpers/ambiente.js';
import { ApiError, definirApiBaseUrl } from '../../src/core/api.js';
import { salvarSessao } from '../../src/core/session.js';
import moduloFuncionarios, {
  htmlFormularioFechamento,
  htmlFormularioOcorrencia,
  htmlTabelaFolhas,
  mensagemErroFuncionarios,
  valorOcorrenciaParaTipo,
  campoValorOcorrenciaDesabilitado,
} from '../../src/modules/funcionarios/index.js';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const indexHtml = readFileSync(join(frontend, 'index.html'), 'utf8');

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

describe('Passo 1 — módulo admin-only', () => {
  test('contrato do módulo', () => {
    assert.equal(moduloFuncionarios.id, 'funcionarios');
    assert.equal(moduloFuncionarios.label, 'Funcionários');
    assert.equal(moduloFuncionarios.permissao, 'admin');
    assert.equal(typeof moduloFuncionarios.montar, 'function');
  });

  test('index.html registra só para admin', () => {
    assert.match(indexHtml, /moduloFuncionarios/);
    assert.match(indexHtml, /getUsuario\(\)\?\.role === 'admin'/);
    assert.match(indexHtml, /registrarModulo\(moduloFuncionarios\)/);
  });
});

describe('Passo 3 — atestado desabilita valor', () => {
  test('campo valor desabilitado e forçado a 0 para atestado', () => {
    assert.equal(campoValorOcorrenciaDesabilitado('atestado'), true);
    assert.equal(valorOcorrenciaParaTipo('atestado', 80), 0);
    const html = htmlFormularioOcorrencia({
      funcionarios: [{ id: 1, nome: 'Ana', ativo: 1 }],
      formulario: { tipo: 'atestado', valor: 50 },
    });
    assert.match(html, /id="ocor-valor"[^>]*disabled/);
    assert.match(html, /value="0"/);
    assert.match(html, /funcionarios-modal/);
    assert.match(html, /modal-form-ocorrencia/);
  });
});

describe('Passo 4 — líquido do backend e 409', () => {
  test('resumo exibe valor_liquido devolvido sem recalcular', () => {
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
    assert.match(html, /1\.695,00|1695/);
    assert.match(html, /modal-form-folha/);
  });

  test('mensagem de 409 é de negócio', () => {
    const msg = mensagemErroFuncionarios(
      new ApiError({
        status: 409,
        mensagem: 'Já existe folha fechada para este funcionário neste período.',
      }),
    );
    assert.match(msg, /folha fechada/i);
  });
});

describe('Passo 5 — marcar paga idempotente na UI', () => {
  test('listagem tem botão marcar como paga', () => {
    const html = htmlTabelaFolhas([
      {
        id: 9,
        funcionario_id: 1,
        periodo_inicio: '2026-08-01',
        periodo_fim: '2026-08-15',
        salario_base: 1800,
        valor_liquido: 1695,
        status: 'pendente',
      },
    ]);
    assert.match(html, /data-pagar-folha="9"/);
  });
});
