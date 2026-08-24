import { Funcionario } from '../domain/Funcionario.js';
import { FuncionarioRepository } from '../application/ports.js';

export class MySQLFuncionarioRepository extends FuncionarioRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async listar({ ativo, busca, page = 1, limit = 20 } = {}) {
    const clausulas = [];
    const params = [];
    if (ativo !== undefined) {
      clausulas.push('ativo = ?');
      params.push(ativo ? 1 : 0);
    }
    if (busca) {
      clausulas.push('(nome LIKE ? OR cargo LIKE ?)');
      const termo = `%${busca}%`;
      params.push(termo, termo);
    }
    const where = clausulas.length ? `WHERE ${clausulas.join(' AND ')}` : '';
    const [[contagem]] = await this.pool.query(
      `SELECT COUNT(*) AS total FROM funcionarios ${where}`,
      params,
    );
    const offset = (page - 1) * limit;
    const [linhas] = await this.pool.query(
      `SELECT * FROM funcionarios ${where} ORDER BY nome ASC, id ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return {
      data: linhas.map(deLinha),
      total: Number(contagem.total) || 0,
    };
  }

  async buscarPorId(id) {
    const [linhas] = await this.pool.query('SELECT * FROM funcionarios WHERE id = ? LIMIT 1', [id]);
    return linhas[0] ? deLinha(linhas[0]) : null;
  }

  async salvar(funcionario) {
    const [resultado] = await this.pool.query(
      `INSERT INTO funcionarios (nome, cargo, salario_base, data_admissao, ativo)
       VALUES (?, ?, ?, ?, ?)`,
      [
        funcionario.nome,
        funcionario.cargo,
        funcionario.salarioBase,
        funcionario.dataAdmissao,
        funcionario.ativo ? 1 : 0,
      ],
    );
    return this.buscarPorId(resultado.insertId);
  }

  async atualizar(funcionario) {
    await this.pool.query(
      `UPDATE funcionarios
          SET nome = ?, cargo = ?, salario_base = ?, data_admissao = ?, ativo = ?
        WHERE id = ?`,
      [
        funcionario.nome,
        funcionario.cargo,
        funcionario.salarioBase,
        funcionario.dataAdmissao,
        funcionario.ativo ? 1 : 0,
        funcionario.id,
      ],
    );
    return this.buscarPorId(funcionario.id);
  }
}

function deLinha(linha) {
  return new Funcionario({
    id: linha.id,
    nome: linha.nome,
    cargo: linha.cargo,
    salarioBase: linha.salario_base,
    dataAdmissao: formatarData(linha.data_admissao),
    ativo: linha.ativo,
    criadoEm: linha.criado_em,
  });
}

function formatarData(valor) {
  if (typeof valor === 'string') {
    return valor.slice(0, 10);
  }
  if (valor instanceof Date) {
    const yyyy = valor.getUTCFullYear();
    const mm = String(valor.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(valor.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return String(valor).slice(0, 10);
}
