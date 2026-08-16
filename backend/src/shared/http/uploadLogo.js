import multer from 'multer';
import { ArquivoLogoInvalidoError } from '../../modules/settings/domain/erros.js';
import { TAMANHO_MAXIMO_LOGO_BYTES } from '../../modules/settings/application/UploadLogo.js';

const receberLogo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO_LOGO_BYTES },
}).single('logo');

export function uploadCampoLogo(req, res, next) {
  receberLogo(req, res, (erro) => {
    if (erro?.code === 'LIMIT_FILE_SIZE') {
      next(new ArquivoLogoInvalidoError('O logo deve ter no máximo 3MB.'));
      return;
    }
    next(erro);
  });
}
