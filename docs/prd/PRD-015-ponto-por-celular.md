# PRD-015 — Ponto por Celular (App Separado + Aprovação para Folha)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-12
- **Módulo:** Registro de ponto de funcionários via app dedicado, offline-first, com reconhecimento facial — integrado ao sistema principal apenas via contrato de API
- **Depende de:** PRD do backend Seção 4.12 (Funcionários e Folha), PRD do backend Seção 4.14 (Auditoria)
- **Decisão de arquitetura:** este é um **produto separado** do sistema web `S-M-Panificadora-V2` — tecnologia própria (nativo ou PWA independente), sem compartilhar codebase. A integração entre os dois sistemas acontece **exclusivamente pelo contrato de API** descrito na Seção 4. Recomenda-se registrar esta decisão como ADR própria (`ADR-00X-ponto-como-sistema-separado.md`).

---

## 1. Objetivo

Registrar entrada/saída/intervalo de funcionários por reconhecimento facial, num aparelho fixo dedicado, funcionando mesmo sem internet ou energia — e entregar esses registros ao sistema principal de forma confiável, para que a gestão revise e aprove antes de qualquer cálculo de folha de pagamento.

---

## 2. Por que separar do sistema principal

- O problema técnico mais difícil deste módulo (reconhecimento facial funcionando **offline**, modo quiosque, câmera, cache local de rostos) é isolado, específico de dispositivo móvel, e não tem relação com a stack web do restante do sistema (ADR-001).
- Separar os dois sistemas evita que essa complexidade "vaze" para o sistema principal — o sistema principal só precisa saber **ler um formato de dado bem definido**, não como o app funciona por dentro.
- Em troca, a integração entre os dois **precisa ser tratada como um contrato formal e estável** (Seção 4) — é esse contrato, não o compartilhamento de código, que garante que "os relatórios sejam compatíveis com o sistema".

---

## 3. Requisitos funcionais do app de ponto (visão de produto — implementação é do time do app)

- Modo quiosque num aparelho fixo, compartilhado por todos os funcionários.
- Reconhecimento facial automático, com cache local dos rostos de referência para funcionar sem internet.
- Registro local imediato de cada batida, com identificador único gerado no aparelho (evita duplicidade na sincronização).
- Fila de sincronização: ao recuperar conexão, envia todos os registros pendentes ao backend do sistema principal, na ordem em que ocorreram.
- Cadastro facial (enrolamento) com consentimento explícito do funcionário antes da primeira captura (LGPD — dado biométrico é dado sensível).
- Comprovante (texto, sem foto) enviado por e-mail e WhatsApp, tanto para o funcionário quanto para a gestão, assim que houver conexão.

*(Estes requisitos já estavam na versão anterior deste PRD; aqui eles descrevem o comportamento esperado do app como produto — a especificação técnica de como implementá-los fica com quem construir o app, fora do escopo deste sistema.)*

---

## 4. Contrato de integração (a parte que o sistema principal precisa)

Esta é a única superfície de acoplamento entre os dois sistemas. Deve ser tratada como uma API estável e versionada.

### 4.1 Autenticação do app
- O app se autentica com uma **credencial de dispositivo/serviço**, distinta do login de usuário humano (não é um `Usuario` do SPEC-BE-001) — evita que a saída do app dependa de sessão de uma pessoa específica.
- Essa credencial deve poder ser revogada isoladamente (ex.: se o aparelho for trocado ou comprometido), sem afetar usuários do sistema principal.

### 4.2 Endpoint de sincronização — `POST /api/ponto/sincronizar`

**Request (lote de registros pendentes no aparelho):**
```json
{
  "dispositivo_id": "kiosk-001",
  "registros": [
    {
      "id_local": "b3f1c2e0-...",
      "funcionario_id": 7,
      "tipo": "entrada",
      "capturado_em": "2026-08-12T08:01:32-03:00",
      "confianca_reconhecimento": 0.94
    }
  ]
}
```

**Regras do contrato:**
- `id_local` é a chave de idempotência — reenviar o mesmo `id_local` nunca cria um segundo registro.
- `capturado_em` é o horário do aparelho no momento da batida (não o horário de chegada no servidor) — o backend registra os dois horários separadamente, para permitir detectar divergência de relógio (ver 4.3).
- `confianca_reconhecimento` é repassado pelo app; o sistema principal pode usar esse valor para priorizar a fila de aprovação (Seção 5) — batidas com confiança baixa entram destacadas para revisão.

**Response:**
```json
{ "recebidos": ["b3f1c2e0-..."], "duplicados": [], "rejeitados": [] }
```
- `duplicados`: `id_local` já recebido antes — não é erro, é confirmação de que o app pode remover da fila local com segurança.
- `rejeitados`: ex. `funcionario_id` inexistente/inativo — o app deve manter esse registro isolado para o operador do quiosque decidir o que fazer, não descartar silenciosamente.

### 4.3 Verificação de confiabilidade do horário
- No recebimento, o backend compara `capturado_em` (horário do aparelho) com o horário do servidor no momento da sincronização.
- Divergência acima de um limite configurável gera um alerta de auditoria vinculado ao registro — não bloqueia o recebimento, mas o registro entra sinalizado na fila de aprovação (Seção 5).

---

## 5. Aprovação de ponto antes da folha (requisito novo, decidido nesta conversa)

**Decisão confirmada:** nenhum ponto sincronizado alimenta o cálculo de folha automaticamente. Todo registro passa por uma fila de aprovação humana antes disso.

### 5.1 Tela de aprovação (esta sim faz parte do sistema principal — módulo de Funcionários/Folha)
- Lista de registros de ponto sincronizados, com status: `pendente`, `aprovado`, `rejeitado`, `ajustado`.
- Registros sinalizados (baixa confiança de reconhecimento facial, ou divergência de horário — Seções 4.2 e 4.3) aparecem destacados/priorizados na fila.
- RH/gestão pode: aprovar como está, ajustar o horário manualmente (com motivo obrigatório, registrado em auditoria), ou rejeitar (ex.: batida claramente indevida).
- Só registros com status `aprovado` ou `ajustado` entram no cálculo de folha de pagamento (PRD do backend, Seção 4.12).

### 5.2 Regras
- Um registro nunca é apagado, mesmo rejeitado — fica no histórico com o status e o responsável pela decisão, para auditoria.
- Cálculo de folha de um período só pode ser fechado se não houver mais registros `pendente` daquele período (ou com decisão explícita de "ignorar pendências", registrada e auditada).

---

## 6. Regras de negócio

- Um funcionário só pode ter uma batida "em aberto" de cada tipo por vez — essa checagem de sequência é feita no sistema principal no momento da sincronização (não depende do app garantir isso sozinho, já que o app pode estar offline por dias).
- Funcionário desligado (inativo no cadastro) deve ser sinalizado para exclusão do cache do app na próxima sincronização — a forma exata desse aviso ao app faz parte do contrato de API, a detalhar em SPEC.

---

## 7. Tratamento de dado sensível (LGPD)

Mantém-se integralmente o que já estava definido: consentimento explícito antes do cadastro facial, direito de revogação, armazenamento criptografado do dado biométrico, retenção limitada após desligamento, e nenhuma foto trafegando nos comprovantes de e-mail/WhatsApp. Como o cadastro facial e o armazenamento das referências agora vivem no app separado, o **responsável técnico pelo app** também é responsável por essas garantias — o contrato de integração (Seção 4) não transmite nem armazena a foto em si, só o resultado da batida.

---

## 8. Fora de escopo desta fase

- Especificação técnica interna do app (fica com quem construir o app; este PRD define o contrato e as regras de negócio do lado do sistema principal).
- Múltiplos dispositivos/quiosques simultâneos.
- Cálculo automático de folha sem aprovação humana (explicitamente descartado nesta decisão).
- Escolha do provedor de e-mail/WhatsApp usado pelo app para o comprovante — fica a critério de quem constrói o app.

---

## 9. Critérios de aceite

1. O sistema principal nunca calcula folha em cima de um registro de ponto que ainda esteja `pendente`.
2. Reenviar o mesmo `id_local` (ex.: app tentando sincronizar de novo por falha de rede no meio do envio) nunca duplica o registro no sistema principal.
3. Registro com baixa confiança de reconhecimento ou divergência de horário aparece destacado na fila de aprovação, não misturado sem prioridade com os demais.
4. Todo ajuste manual de horário feito por RH/gestão fica registrado em auditoria, com motivo e responsável.
5. Rejeitar um registro não o apaga — ele continua consultável com o status e quem decidiu.
6. A credencial de autenticação do app pode ser revogada sem exigir alteração de nenhum usuário humano do sistema.
