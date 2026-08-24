import 'dotenv/config';
import {
  aplicarSchemaAuditoria,
  aplicarSchemaCaixaTurnos,
  aplicarSchemaConfiguracoes,
  aplicarSchemaEncomendas,
  aplicarSchemaEstoque,
  aplicarSchemaPerdas,
  aplicarSchemaProducao,
  aplicarSchemaProdutos,
  aplicarSchemaUsuarios,
  aplicarSchemaVendas,
  aplicarSchemaFluxoCaixa,
  aplicarSchemaClientes,
  aplicarSchemaFuncionarios,
  criarPool,
  garantirDatabase,
  semearConfiguracoes,
} from './infrastructure/database/db.js';
import { padroesParaSeed } from './modules/settings/domain/chaves.js';
import { montarDependencias } from './bootstrap.js';
import { carregarConfig, ConfigInvalidaError } from './config.js';

let config;
try {
  config = carregarConfig();
} catch (erro) {
  if (erro instanceof ConfigInvalidaError) {
    console.error(erro.message);
    process.exit(1);
  }
  throw erro;
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
await aplicarSchemaProducao(pool);
await aplicarSchemaVendas(pool);
await aplicarSchemaFluxoCaixa(pool);
await aplicarSchemaClientes(pool);
await aplicarSchemaEncomendas(pool);
await aplicarSchemaFuncionarios(pool);
await semearConfiguracoes(pool, padroesParaSeed());

const { app } = montarDependencias({ pool, config });

app.listen(config.porta, '127.0.0.1', () => {
  process.stdout.write(`API em http://127.0.0.1:${config.porta}\n`);
});
