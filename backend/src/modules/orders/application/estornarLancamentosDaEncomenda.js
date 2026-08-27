export async function estornarLancamentosDaEncomenda(
  fluxoCaixaRepository,
  encomendaId,
  executor,
  motivo,
) {
  const lista = (await fluxoCaixaRepository?.listarAtivosPorEncomendaId?.(encomendaId)) || [];
  for (const lancamento of lista) {
    await fluxoCaixaRepository.marcarExcluido({
      id: lancamento.id,
      excluidoPor: executor?.id,
      motivoExclusao: motivo,
    });
  }
}
