import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(aqui, '..');
const src = process.argv[2];
if (!src) {
  console.error('uso: node gerar-logo-cupom-data-uri.mjs <caminho-do-png>');
  process.exit(1);
}

const buf = fs.readFileSync(src);
const pngDestino = path.join(frontend, 'assets', 'logo-horizontal-cupom-576px-1bit.png');
const jsDestino = path.join(frontend, 'src', 'modules', 'caixa-turno', 'logo-cupom-data-uri.js');
fs.mkdirSync(path.dirname(pngDestino), { recursive: true });
fs.writeFileSync(pngDestino, buf);

const uri = `data:image/png;base64,${buf.toString('base64')}`;
const js = `/** Fonte: frontend/assets/logo-horizontal-cupom-576px-1bit.png (1-bit, 576 px). Embutida porque a janela de impressão é about:blank. */\nexport const LOGO_CUPOM_DATA_URI = ${JSON.stringify(uri)};\n`;
fs.writeFileSync(jsDestino, js);

console.log('copiedBytes', buf.length);
console.log('jsBytes', Buffer.byteLength(js));
console.log('uriKind', uri.slice(0, 22));
