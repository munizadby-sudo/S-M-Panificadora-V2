import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { Funcionario } from '../../src/modules/employees/domain/Funcionario.js';
import { OcorrenciaFolha } from '../../src/modules/employees/domain/OcorrenciaFolha.js';
import { calcularFolha } from '../../src/modules/employees/domain/calcularFolha.js';
import {
  MotivoOcorrenciaInvalidoError,
  SalarioInvalidoError,
} from '../../src/modules/employees/domain/erros.js';
import {
  cargoSugereQuinzena,
  periodoPagaDia5,
  periodoPagaDia20,
  quinzenaSugerida,
  salarioDoPeriodo,
} from '../../src/modules/employees/domain/periodicidade.js';
import { CreateFuncionario } from '../../src/modules/employees/application/CreateFuncionario.js';
import { CreateAdiantamento } from '../../src/modules/employees/application/CreateAdiantamento.js';
import { CreateOcorrenciaFolha } from '../../src/modules/employees/application/CreateOcorrenciaFolha.js';
import { FecharFolha } from '../../src/modules/employees/application/FecharFolha.js';
import { MarcarFolhaComoPaga } from '../../src/modules/employees/application/MarcarFolhaComoPaga.js';
import { UpdateFuncionario } from '../../src/modules/employees/application/UpdateFuncionario.js';
import { MemoriaFuncionarioRepository } from '../helpers/MemoriaFuncionarioRepository.js';
import { MemoriaAdiantamentoRepository } from '../helpers/MemoriaAdiantamentoRepository.js';
import { MemoriaOcorrenciaFolhaRepository } from '../helpers/MemoriaOcorrenciaFolhaRepository.js';
import { MemoriaFolhaPagamentoRepository } from '../helpers/MemoriaFolhaPagamentoRepository.js';
import { comServidor, json, montarAppMemoria } from '../helpers/app-memoria.js';

describe('domínio funcionários/folha', () => {
  test('calcularFolha é puro e segue a fórmula', () => {
    const resultado = calcularFolha({
      salarioBase: 1800,
      totalAdiantamentos: 150,
      totalFaltas: 50,
      totalHorasExtras: 45,
      totalNaoCumprimento: 40,
    });
    assert.equal(resultado.valor_liquido, 1605);
    assert.equal(resultado.total_nao_cumprimento, 40);
  });

  test('padeiro e ajudante sugerem quinzena; salário do período é metade', () => {
    assert.equal(cargoSugereQuinzena('Padeiro'), true);
    assert.equal(cargoSugereQuinzena('Padeira'), true);
    assert.equal(cargoSugereQuinzena('Ajudante'), true);
    assert.equal(cargoSugereQuinzena('Caixa'), false);
    assert.equal(salarioDoPeriodo(1800, 'quinzenal'), 900);
    assert.equal(salarioDoPeriodo(1800, 'mensal'), 1800);
  });

  test('1ª quinzena é 16–fim (paga dia 5) e 2ª é 1–15 (paga dia 20)', () => {
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
    assert.deepEqual(quinzenaSugerida('2026-08-20'), {
      inicio: '2026-08-01',
      fim: '2026-08-15',
      paga_em: '2026-08-20',
    });
    assert.deepEqual(quinzenaSugerida('2026-08-05'), {
      inicio: '2026-07-16',
      fim: '2026-07-31',
      paga_em: '2026-08-05',
    });
  });

  test('atestado força valor 0', () => {
    const ocorrencia = new OcorrenciaFolha({
      funcionarioId: 1,
      tipo: 'atestado',
      data: '2026-08-10',
      valor: 99,
      usuarioId: 1,
    });
    assert.equal(ocorrencia.valor, 0);
  });

  test('não cumprimento exige motivo da whitelist e desconta na folha', () => {
    assert.throws(
      () =>
        new OcorrenciaFolha({
          funcionarioId: 1,
          tipo: 'nao_cumprimento',
          data: '2026-08-10',
          valor: 40,
          usuarioId: 1,
        }),
      MotivoOcorrenciaInvalidoError,
    );
    const ocorrencia = new OcorrenciaFolha({
      funcionarioId: 1,
      tipo: 'nao_cumprimento',
      data: '2026-08-10',
      valor: 40,
      motivo: 'nao_limpou_producao',
      usuarioId: 1,
    });
    assert.equal(ocorrencia.tipo, 'nao_cumprimento');
    assert.equal(ocorrencia.motivo, 'nao_limpou_producao');
    assert.equal(ocorrencia.paraPublico().motivo_rotulo, 'Não limparam a produção');
  });

  test('Funcionario rejeita salário inválido', () => {
    assert.throws(
      () =>
        new Funcionario({
          nome: 'Ana',
          cargo: 'Padeira',
          salarioBase: 0,
          dataAdmissao: '2026-01-01',
        }),
      SalarioInvalidoError,
    );
  });
});

describe('casos de uso com repositórios em memória', () => {
  test('fecha folha com snapshot e marca paga de forma idempotente', async () => {
    const funcionarioRepository = new MemoriaFuncionarioRepository();
    const adiantamentoRepository = new MemoriaAdiantamentoRepository({ funcionarioRepository });
    const ocorrenciaFolhaRepository = new MemoriaOcorrenciaFolhaRepository({
      funcionarioRepository,
    });
    const folhaPagamentoRepository = new MemoriaFolhaPagamentoRepository({
      funcionarioRepository,
    });
    const deps = {
      funcionarioRepository,
      adiantamentoRepository,
      ocorrenciaFolhaRepository,
      folhaPagamentoRepository,
      auditor: null,
    };
    const executor = { id: 1 };

    const funcionario = await new CreateFuncionario(deps).executar(
      {
        nome: 'João',
        cargo: 'Atendente',
        salario_base: 1800,
        data_admissao: '2026-01-01',
      },
      executor,
    );
    await new CreateAdiantamento(deps).executar(
      { funcionario_id: funcionario.id, valor: 150, data: '2026-08-05' },
      executor,
    );
    await new CreateOcorrenciaFolha(deps).executar(
      {
        funcionario_id: funcionario.id,
        tipo: 'hora_extra',
        data: '2026-08-06',
        valor: 45,
      },
      executor,
    );
    await new CreateOcorrenciaFolha(deps).executar(
      {
        funcionario_id: funcionario.id,
        tipo: 'nao_cumprimento',
        data: '2026-08-07',
        valor: 40,
        motivo: 'nao_limpou_cozinha',
      },
      executor,
    );

    const { folha } = await new FecharFolha(deps).executar(
      {
        funcionario_id: funcionario.id,
        periodo_inicio: '2026-08-01',
        periodo_fim: '2026-08-15',
      },
      executor,
    );
    assert.equal(folha.valorLiquido, 1655);
    assert.equal(folha.totalNaoCumprimento, 40);
    assert.equal(folha.salarioBase, 1800);

    await new UpdateFuncionario(deps).executar(
      { id: funcionario.id, salario_base: 2000 },
      executor,
    );
    const folhaLida = await folhaPagamentoRepository.buscarPorId(folha.id);
    assert.equal(folhaLida.salarioBase, 1800);

    const marcar = new MarcarFolhaComoPaga(deps);
    const paga = await marcar.executar({ id: folha.id }, executor);
    assert.equal(paga.status, 'paga');
    const deNovo = await marcar.executar({ id: folha.id }, executor);
    assert.equal(deNovo.status, 'paga');
  });

  test('fecha folha de padeiro com metade do salário mensal', async () => {
    const funcionarioRepository = new MemoriaFuncionarioRepository();
    const adiantamentoRepository = new MemoriaAdiantamentoRepository({ funcionarioRepository });
    const ocorrenciaFolhaRepository = new MemoriaOcorrenciaFolhaRepository({
      funcionarioRepository,
    });
    const folhaPagamentoRepository = new MemoriaFolhaPagamentoRepository({
      funcionarioRepository,
    });
    const deps = {
      funcionarioRepository,
      adiantamentoRepository,
      ocorrenciaFolhaRepository,
      folhaPagamentoRepository,
      auditor: null,
    };

    const funcionario = await new CreateFuncionario(deps).executar(
      {
        nome: 'João',
        cargo: 'Padeiro',
        salario_base: 1800,
        data_admissao: '2026-01-01',
      },
      { id: 1 },
    );
    assert.equal(funcionario.periodicidade, 'quinzenal');
    assert.equal(funcionario.paraPublico().salario_periodo, 900);

    const { folha } = await new FecharFolha(deps).executar(
      {
        funcionario_id: funcionario.id,
        periodo_inicio: '2026-08-01',
        periodo_fim: '2026-08-15',
      },
      { id: 1 },
    );
    assert.equal(folha.salarioBase, 900);
    assert.equal(folha.valorLiquido, 900);
  });
});

async function tokenAdmin(porta, ctx) {
  await ctx.usuarioRepository.salvar(
    new Usuario({
      nome: 'Administrador',
      username: 'admin',
      senhaHash: await ctx.hashService.hash('admin123'),
      role: 'admin',
    }),
  );
  const resposta = await fetch(`http://127.0.0.1:${porta}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', senha: 'admin123' }),
  });
  return (await json(resposta)).token;
}

async function tokenOperador(porta, ctx) {
  await ctx.usuarioRepository.salvar(
    new Usuario({
      nome: 'Operador',
      username: 'op',
      senhaHash: await ctx.hashService.hash('op123'),
      role: 'operador',
      permissoes: ['caixa', 'clientes', 'producao'],
    }),
  );
  const resposta = await fetch(`http://127.0.0.1:${porta}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'op', senha: 'op123' }),
  });
  return (await json(resposta)).token;
}

function headersJson(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

describe('HTTP funcionários e folha (SPEC-BE-013 §7)', () => {
  test('1) fechar duas vezes retorna 409', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const headers = headersJson(token);
      const origem = `http://127.0.0.1:${porta}`;

      const funcionario = await json(
        await fetch(`${origem}/api/funcionarios`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            nome: 'Maria',
            cargo: 'Padeira',
            salario_base: 1800,
            data_admissao: '2026-01-01',
          }),
        }),
      );

      const corpo = {
        funcionario_id: funcionario.id,
        periodo_inicio: '2026-08-01',
        periodo_fim: '2026-08-15',
      };
      const primeira = await fetch(`${origem}/api/folhas`, {
        method: 'POST',
        headers,
        body: JSON.stringify(corpo),
      });
      assert.equal(primeira.status, 200);

      const segunda = await fetch(`${origem}/api/folhas`, {
        method: 'POST',
        headers,
        body: JSON.stringify(corpo),
      });
      assert.equal(segunda.status, 409);
      assert.equal(ctx.folhaPagamentoRepository.itens.length, 1);
    });
  });

  test('2) atestado sempre persiste valor 0', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const headers = headersJson(token);
      const origem = `http://127.0.0.1:${porta}`;
      const funcionario = await json(
        await fetch(`${origem}/api/funcionarios`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            nome: 'Maria',
            cargo: 'Padeira',
            salario_base: 1800,
            data_admissao: '2026-01-01',
          }),
        }),
      );

      const ocorrencia = await json(
        await fetch(`${origem}/api/ocorrencias-folha`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            funcionario_id: funcionario.id,
            tipo: 'atestado',
            data: '2026-08-10',
            valor: 80,
          }),
        }),
      );
      assert.equal(ocorrencia.valor, 0);
    });
  });

  test('não cumprimento sem motivo retorna 400 e com motivo desconta na folha', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const headers = headersJson(token);
      const origem = `http://127.0.0.1:${porta}`;
      const funcionario = await json(
        await fetch(`${origem}/api/funcionarios`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            nome: 'Maria',
            cargo: 'Atendente',
            salario_base: 1800,
            data_admissao: '2026-01-01',
          }),
        }),
      );

      const semMotivo = await fetch(`${origem}/api/ocorrencias-folha`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          funcionario_id: funcionario.id,
          tipo: 'nao_cumprimento',
          data: '2026-08-10',
          valor: 40,
        }),
      });
      assert.equal(semMotivo.status, 400);

      const ocorrencia = await json(
        await fetch(`${origem}/api/ocorrencias-folha`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            funcionario_id: funcionario.id,
            tipo: 'nao_cumprimento',
            data: '2026-08-10',
            valor: 40,
            motivo: 'producao_incorreta',
          }),
        }),
      );
      assert.equal(ocorrencia.tipo, 'nao_cumprimento');
      assert.equal(ocorrencia.motivo, 'producao_incorreta');

      const folha = await json(
        await fetch(`${origem}/api/folhas`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            funcionario_id: funcionario.id,
            periodo_inicio: '2026-08-01',
            periodo_fim: '2026-08-15',
          }),
        }),
      );
      assert.equal(folha.total_nao_cumprimento, 40);
      assert.equal(folha.valor_liquido, 1760);
    });
  });

  test('3) valor_liquido segue a fórmula', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const headers = headersJson(token);
      const origem = `http://127.0.0.1:${porta}`;
      const funcionario = await json(
        await fetch(`${origem}/api/funcionarios`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            nome: 'Maria',
            cargo: 'Padeira',
            salario_base: 1800,
            data_admissao: '2026-01-01',
          }),
        }),
      );
      await fetch(`${origem}/api/adiantamentos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          funcionario_id: funcionario.id,
          valor: 150,
          data: '2026-08-05',
        }),
      });
      await fetch(`${origem}/api/ocorrencias-folha`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          funcionario_id: funcionario.id,
          tipo: 'hora_extra',
          data: '2026-08-06',
          valor: 45,
        }),
      });

      const folha = await json(
        await fetch(`${origem}/api/folhas`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            funcionario_id: funcionario.id,
            periodo_inicio: '2026-08-01',
            periodo_fim: '2026-08-15',
          }),
        }),
      );
      assert.equal(folha.valor_liquido, 795);
    });
  });

  test('4) marcar paga é idempotente', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const headers = headersJson(token);
      const origem = `http://127.0.0.1:${porta}`;
      const funcionario = await json(
        await fetch(`${origem}/api/funcionarios`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            nome: 'Maria',
            cargo: 'Padeira',
            salario_base: 1800,
            data_admissao: '2026-01-01',
          }),
        }),
      );
      const folha = await json(
        await fetch(`${origem}/api/folhas`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            funcionario_id: funcionario.id,
            periodo_inicio: '2026-08-01',
            periodo_fim: '2026-08-15',
          }),
        }),
      );

      const primeira = await fetch(`${origem}/api/folhas/${folha.id}/pagar`, {
        method: 'POST',
        headers,
      });
      assert.equal(primeira.status, 200);
      const segunda = await fetch(`${origem}/api/folhas/${folha.id}/pagar`, {
        method: 'POST',
        headers,
      });
      assert.equal(segunda.status, 200);
      assert.equal((await json(segunda)).status, 'paga');
    });
  });

  test('5) salario_base da folha é snapshot', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenAdmin(porta, ctx);
      const headers = headersJson(token);
      const origem = `http://127.0.0.1:${porta}`;
      const funcionario = await json(
        await fetch(`${origem}/api/funcionarios`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            nome: 'Maria',
            cargo: 'Padeira',
            salario_base: 1800,
            data_admissao: '2026-01-01',
          }),
        }),
      );
      const folha = await json(
        await fetch(`${origem}/api/folhas`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            funcionario_id: funcionario.id,
            periodo_inicio: '2026-08-01',
            periodo_fim: '2026-08-15',
          }),
        }),
      );
      await fetch(`${origem}/api/funcionarios/${funcionario.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          nome: 'Maria',
          cargo: 'Padeira',
          salario_base: 2500,
          data_admissao: '2026-01-01',
        }),
      });
      const listagem = await json(await fetch(`${origem}/api/folhas`, { headers }));
      const item = listagem.data.find((f) => f.id === folha.id);
      assert.equal(item.salario_base, 900);
    });
  });

  test('6) operador recebe 403', async () => {
    const ctx = montarAppMemoria();
    await comServidor(ctx.app, async (porta) => {
      const token = await tokenOperador(porta, ctx);
      const headers = headersJson(token);
      const origem = `http://127.0.0.1:${porta}`;
      const resposta = await fetch(`${origem}/api/funcionarios`, { headers });
      assert.equal(resposta.status, 403);
    });
  });
});
