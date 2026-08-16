import { ArquivoLogoInvalidoError } from '../domain/erros.js';

export const TAMANHO_MAXIMO_LOGO_BYTES = 3 * 1024 * 1024;
export const TIPOS_LOGO_PERMITIDOS = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);

export class UploadLogo {
  constructor({ configuracaoRepository, logoStorage, auditor }) {
    this.configuracaoRepository = configuracaoRepository;
    this.logoStorage = logoStorage;
    this.auditor = auditor;
  }

  async executar(arquivo, executor, ip = null) {
    validarArquivo(arquivo);

    const logoUrl = await this.logoStorage.salvar(arquivo);
    await this.configuracaoRepository.upsert('logo_url', logoUrl, executor?.id ?? null);

    if (this.auditor) {
      await this.auditor.registrar({
        usuarioId: executor?.id ?? null,
        acao: 'atualizar_logo',
        entidade: 'configuracoes',
        entidadeId: null,
        estadoDepois: { logo_url: logoUrl },
        ip,
      });
    }

    return { logo_url: logoUrl };
  }
}

function validarArquivo(arquivo) {
  if (!arquivo || !arquivo.buffer) {
    throw new ArquivoLogoInvalidoError('Envie um arquivo de logo.');
  }
  if (arquivo.size > TAMANHO_MAXIMO_LOGO_BYTES) {
    throw new ArquivoLogoInvalidoError('O logo deve ter no máximo 3MB.');
  }
  if (!TIPOS_LOGO_PERMITIDOS.has(arquivo.mimetype)) {
    throw new ArquivoLogoInvalidoError('Tipo de arquivo não permitido.');
  }
}
