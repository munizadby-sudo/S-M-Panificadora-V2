import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const EXTENSOES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

export class DiscoLogoStorage {
  constructor(pasta) {
    this.pasta = pasta;
  }

  async salvar(arquivo) {
    await mkdir(this.pasta, { recursive: true });
    const extensao = EXTENSOES[arquivo.mimetype] || extname(arquivo.originalname || '') || '.png';
    const nome = `logo${extensao}`;
    await writeFile(join(this.pasta, nome), arquivo.buffer);
    return `/uploads/${nome}`;
  }
}
