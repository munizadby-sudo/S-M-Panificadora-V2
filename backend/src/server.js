import 'dotenv/config';
import {
  aplicarSchemaAuditoria,
  aplicarSchemaCaixaTurnos,
  aplicarSchemaConfiguracoes,
  aplicarSchemaEstoque,
  aplicarSchemaPerdas,
  aplicarSchemaProdutos,
  aplicarSchemaUsuarios,
  aplicarSchemaVendas,
  aplicarSchemaFluxoCaixa,
  criarPool,
  garantirDatabase,
  semearConfiguracoes,
} from './infrastructure/database/db.js';
import { padroesParaSeed } from './modules/settings/domain/chaves.js';
import { montarAplicacao } from './bootstrap.js';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('JWT_SECRET é obrigatório.');
  process.exit(1);
}

await garantirDatabase();
const pool = criarPool();
await aplicarSchemaUsuarios(pool);
await aplicarSchemaConfiguracoes(pool);
await aplicarSchemaAuditoria(pool);
await aplicarSchemaCaixaTurnos(pool);
await aplicarSchemaProdutos(pool);
await aplicarSchemaEstoque(pool);
await aplicarSchemaPerdas(pool);
await aplicarSchemaVendas(pool);
await aplicarSchemaFluxoCaixa(pool);
await semearConfiguracoes(pool, padroesParaSeed());

const { app } = montarAplicacao({
  pool,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES || '12h',
});

const porta = Number(process.env.PORTA || process.env.PORT || 3001);
app.listen(porta, '127.0.0.1', () => {
  process.stdout.write(`API em http://127.0.0.1:${porta}\n`);
});
