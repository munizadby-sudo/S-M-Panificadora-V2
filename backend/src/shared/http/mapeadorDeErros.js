import { ErroDeDominio } from '../../modules/users/domain/erros.js';

export function mapeadorDeErros(erro, _req, res, next) {
  if (res.headersSent) {
    next(erro);
    return;
  }

  if (erro instanceof ErroDeDominio || (erro.status && erro.message)) {
    res.status(erro.status).json({ erro: erro.message });
    return;
  }

  console.error(erro);
  res.status(500).json({ erro: 'Erro interno.' });
}
