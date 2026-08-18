import { ErroDeDominio } from '../../modules/users/domain/erros.js';

export function mapeadorDeErros(erro, _req, res, next) {
  if (res.headersSent) {
    next(erro);
    return;
  }

  if (erro instanceof ErroDeDominio || (erro.status && erro.message)) {
    const corpo = { erro: erro.message };
    if (erro.codigo) {
      corpo.codigo = erro.codigo;
    }
    res.status(erro.status).json(corpo);
    return;
  }

  console.error(erro);
  res.status(500).json({ erro: 'Erro interno.' });
}
