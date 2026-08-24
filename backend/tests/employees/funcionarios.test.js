import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Usuario } from '../../src/modules/users/domain/Usuario.js';
import { Funcionario } from '../../src/modules/employees/domain/Funcionario.js';
import { OcorrenciaFolha } from '../../src/modules/employees/domain/OcorrenciaFolha.js';
import { calcularFolha } from '../../src/modules/employees/domain/calcularFolha.js';
import { SalarioInvalidoError } from '../../src/modules/employees/domain/erros.js';
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
    });
    assert.equal(resultado.valor_liquido, 1645);
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

    const { folha } = await new FecharFolha(deps).executar(
      {
        funcionario_id: funcionario.id,
        periodo_inicio: '2026-08-01',
        periodo_fim: '2026-08-15',
      },
      executor,
    );
    assert.equal(folha.valorLiquido, 1695);
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
      assert.equal(folha.valor_liquido, 1695);
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
      assert.equal(item.salario_base, 1800);
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
