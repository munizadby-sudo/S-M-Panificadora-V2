export const TIPOS_OCORRENCIA = Object.freeze([
  'falta',
  'atestado',
  'hora_extra',
  'nao_cumprimento',
]);

export const ROTULOS_TIPO_OCORRENCIA = Object.freeze({
  falta: 'Falta',
  atestado: 'Atestado',
  hora_extra: 'Hora extra',
  nao_cumprimento: 'Não cumprimento',
});

export const MOTIVOS_NAO_CUMPRIMENTO = Object.freeze([
  {
    id: 'nao_limpou_producao',
    rotulo: 'Não limparam a produção',
  },
  {
    id: 'nao_limpou_cozinha',
    rotulo: 'Não limparam a cozinha',
  },
  {
    id: 'producao_incorreta',
    rotulo: 'Não fizeram a produção correta',
  },
]);

export const ROTULOS_MOTIVO_NAO_CUMPRIMENTO = Object.freeze(
  Object.fromEntries(MOTIVOS_NAO_CUMPRIMENTO.map((item) => [item.id, item.rotulo])),
);

export function rotuloTipoOcorrencia(tipo) {
  return ROTULOS_TIPO_OCORRENCIA[tipo] || tipo || '';
}

export function rotuloMotivoOcorrencia(motivo) {
  return ROTULOS_MOTIVO_NAO_CUMPRIMENTO[motivo] || '';
}

export function textoDetalheOcorrencia(item) {
  const motivo = rotuloMotivoOcorrencia(item?.motivo);
  const obs = String(item?.observacao || '').trim();
  if (motivo && obs) return `${motivo} — ${obs}`;
  return motivo || obs;
}
