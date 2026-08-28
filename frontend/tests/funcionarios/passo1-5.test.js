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
import {
  periodoPagaDia5,
  periodoPagaDia20,
  periodoPagaDia5Vigente,
  periodoMesAnterior,
  quinzenaSugerida,
} from '../../src/modules/funcionarios/quinzena.js';
import { htmlHolerite } from '../../src/modules/funcionarios/holerite.js';
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

  test('padeiro aparece como quinzenal (dia 5 e 20) na listagem', () => {
    const html = htmlTabelaFuncionarios([
      {
        id: 1,
        nome: 'João',
        cargo: 'Padeiro',
        salario_base: 1800,
        periodicidade: 'quinzenal',
        salario_periodo: 900,
        data_admissao: '2026-01-01',
        ativo: 1,
      },
    ]);
    assert.match(html, /dias 5 e 20/);
    assert.match(html, /Quinzena/);
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

  test('atalhos de quinzena aparecem para padeiro', () => {
    const html = htmlFormularioFechamento({
      funcionarios: [{ id: 1, nome: 'João', cargo: 'Padeiro', periodicidade: 'quinzenal', ativo: 1 }],
      formulario: { funcionario_id: 1 },
    });
    assert.match(html, /data-quinzena="dia5"/);
    assert.match(html, /data-quinzena="dia20"/);
    assert.match(html, /1ª quinzena \(paga dia 5\)/);
    assert.match(html, /2ª quinzena \(paga dia 20\)/);
  });

  test('balconista mensal sugere mês anterior', () => {
    assert.deepEqual(periodoMesAnterior('2026-08-28'), {
      inicio: '2026-07-01',
      fim: '2026-07-31',
    });
    const html = htmlFormularioFechamento({
      funcionarios: [{ id: 2, nome: 'Ana', cargo: 'Balconista', periodicidade: 'mensal', ativo: 1 }],
      formulario: { funcionario_id: 2, periodo_inicio: '2026-07-01', periodo_fim: '2026-07-31' },
    });
    assert.match(html, /data-mes-anterior/);
    assert.match(html, /Mês anterior/);
    assert.doesNotMatch(html, /data-quinzena/);
  });

  test('períodos da quinzena: 1ª (16–fim) e 2ª (1–15)', () => {
    assert.deepEqual(periodoPagaDia5('2026-08-27'), {
      inicio: '2026-07-16',
      fim: '2026-07-31',
      paga_em: '2026-08-05',
    });
    assert.deepEqual(periodoPagaDia20('2026-08-27'), {
      inicio: '2026-08-01',
      fim: '2026-08-15',
      paga_em: '2026-08-20',
    });
    assert.deepEqual(quinzenaSugerida('2026-08-28'), {
      inicio: '2026-08-16',
      fim: '2026-08-31',
      paga_em: '2026-09-05',
    });
    assert.deepEqual(periodoPagaDia5Vigente('2026-08-28'), {
      inicio: '2026-08-16',
      fim: '2026-08-31',
      paga_em: '2026-09-05',
    });
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
    assert.match(tabela, /data-imprimir-folha="9"/);
    assert.match(tabela, /Imprimir \(2 vias\)/);
  });
});

describe('Holerite e não cumprimento', () => {
  test('formulário de ocorrência oferece não cumprimento com motivos', () => {
    const html = htmlFormularioOcorrencia({
      funcionarios: [{ id: 1, nome: 'Ana', ativo: 1 }],
      formulario: { tipo: 'nao_cumprimento', valor: 40 },
    });
    assert.match(html, /value="nao_cumprimento"/);
    assert.match(html, /id="ocor-motivo"/);
    assert.match(html, /nao_limpou_producao/);
    assert.match(html, /nao_limpou_cozinha/);
    assert.match(html, /producao_incorreta/);
    assert.match(html, /Não limparam a produção/);
    assert.equal(campoValorOcorrenciaDesabilitado('nao_cumprimento'), false);
  });

  test('holerite imprime duas vias com cálculo detalhado', () => {
    const html = htmlHolerite({
      folha: {
        funcionario_nome: 'Ana',
        periodo_inicio: '2026-08-01',
        periodo_fim: '2026-08-15',
        salario_base: 900,
        total_horas_extras: 45,
        total_faltas: 0,
        total_nao_cumprimento: 40,
        total_adiantamentos: 150,
        valor_liquido: 755,
        status: 'pendente',
      },
      funcionario: { nome: 'Ana', cargo: 'Padeira', periodicidade: 'quinzenal' },
      ocorrencias: [
        {
          tipo: 'nao_cumprimento',
          data: '2026-08-10',
          valor: 40,
          motivo: 'nao_limpou_producao',
        },
      ],
      adiantamentos: [{ data: '2026-08-05', valor: 150, observacao: 'Vale' }],
    });
    assert.match(html, /Recibo de pagamento de salário/);
    assert.match(html, /VIA EMPRESA/);
    assert.match(html, /VIA FUNCIONÁRIO/);
    assert.match(html, /Proventos/);
    assert.match(html, /Descontos/);
    assert.match(html, /Valor líquido/);
    assert.match(html, /Assinatura do funcionário/);
    assert.match(html, /Assinatura da empresa/);
    assert.match(html, /Não cumprimento/);
    assert.match(html, /Não limparam a produção/);
    assert.match(html, /Adiantamento/);
    assert.match(html, /size: A4/);
    assert.match(html, /page-break-after/);
  });
});
