export class ConfigInvalidaError extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ConfigInvalidaError';
  }
}

export function carregarConfig(env = process.env) {
  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret) {
    throw new ConfigInvalidaError('JWT_SECRET é obrigatório.');
  }

  return {
    jwtSecret,
    jwtExpiresIn: env.JWT_EXPIRES || '12h',
    porta: Number(env.PORTA || env.PORT || 3001),
    corsOrigin: env.CORS_ORIGIN || '*',
  };
}
