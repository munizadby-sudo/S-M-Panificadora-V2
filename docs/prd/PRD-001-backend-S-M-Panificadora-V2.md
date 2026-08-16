# PRD — Backend do Sistema de Gestão Souza & Moraes Panificadora (V2.0)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11
- **Autor:** Adby Muniz (com apoio de IA)
- **Escopo:** Backend completo do sistema (`S-M-Panificadora-V2`)
- **Documentos relacionados:**
  - `docs/specs/` (V2) — cortes incrementais e testáveis deste PRD (`SPEC-001` … `SPEC-019`)
  - `docs/adr/ADR-001-clean-code-solid.md` (V2) — princípios de engenharia adotados
  - Repositório legado `S-M-Panificadora` (V1) — sistema em produção, usado como referência funcional
  - `docs/adr/*` (V1) — decisões técnicas já validadas em produção (JWT, RBAC, rate limiting, etc.)
  - `docs/modules/pdv/Regras_de_Negocio_Padaria_PDV.md` (V1) — engenharia reversa das regras reais
  - `docs/modules/financeiro/escopo.md` (V1) — proposta de Clean Architecture para o módulo de caixa

---

## 1. Resumo executivo

A Panificadora Souza & Moraes já opera com um sistema PDV em produção (V1: Node.js + Express + MySQL, frontend vanilla JS). O V1 cumpre sua função, mas foi construído de forma incremental e apresenta acoplamento entre rotas e SQL, duas implementações paralelas de caixa, bugs conhecidos e cobertura de auditoria parcial (ver Seção 9).

O V2 é uma **reconstrução do backend do zero**, guiada pela ADR-001 (Clean Code + SOLID, arquitetura em camadas: `Controller → Use Case → Domain → Repository Interface → Infrastructure → Database`), usando o V1 **como legado funcional de referência** — não como base de código a ser copiada.

Este PRD define **o que o backend V2 deve fazer**, módulo a módulo, incorporando as regras de negócio já validadas em produção no V1, corrigindo as inconsistências conhecidas, e adicionando os módulos previstos na ADR-001 que ainda não existem hoje (Produção, Clientes, Relatórios, TEF, Fiscal).

---

## 2. Objetivo do produto

Fornecer um backend único, íntegro e auditável que sustente a operação diária da padaria: venda no balcão, controle de estoque e produção, caixa por turno, encomendas, fluxo financeiro, gestão de usuários/permissões e, futuramente, folha de pagamento, relatórios gerenciais e integrações fiscais/TEF — substituindo processos manuais (caderno, planilha, memória) sem exigir infraestrutura cara.

### 2.1 Objetivos de negócio
- Eliminar a ambiguidade de fonte de verdade no controle de caixa (hoje existem dois sistemas coexistindo no V1).
- Garantir que toda operação sensível (venda, cancelamento, abertura/fechamento de caixa, alteração de estoque, alteração de usuário) seja auditável.
- Preparar o sistema para crescer para múltiplos módulos (folha, relatórios, fiscal, TEF) sem reescrever o núcleo.
- Manter a operação viável em um computador comum de loja, sem exigir internet de alta qualidade.

### 2.2 Objetivos técnicos
- Isolar regras de negócio de detalhes de infraestrutura (SQL, Express, bibliotecas externas), conforme ADR-001.
- Tornar as regras críticas (fechamento de caixa, baixa de estoque, numeração sequencial) testáveis por unidade, sem banco real.
- Corrigir, na V2, os débitos técnicos identificados no V1 (Seção 9) em vez de herdá-los.

---

## 3. Personas / usuários do sistema

| Papel | Descrição | Necessidade principal |
|---|---|---|
| **Operador de caixa** | Atendente que vende no balcão | Abrir/fechar turno, vender rápido, sem travar por erro técnico |
| **Administrador (dono/gerente)** | Adby ou responsável pela padaria | Visão completa: caixa, estoque, produtos, usuários, relatórios, custos |
| **Padeiro/produção** | Responsável pela produção diária | Lançar produção do dia, consultar estoque de insumos |
| **Financeiro (futuro)** | Responsável por conciliação e folha | Consultar fluxo de caixa consolidado, folha de pagamento |
| **Sistema (integrações)** | TEF, serviço fiscal | Consumir/alimentar dados de venda via contrato estável |

---

## 4. Escopo funcional (módulos)

Escopo herdado da ADR-001: PDV, produtos e categorias, estoque, produção, controle de caixa, clientes, usuários e permissões, relatórios, integração TEF, integração fiscal.

Cada módulo abaixo segue o padrão: **Objetivo → Requisitos funcionais → Regras de negócio → Regras herdadas do V1 (mantidas) → Correções em relação ao V1 → Fora de escopo desta fase.**

### 4.1 Autenticação e Sessão

**Objetivo:** garantir que só usuários válidos e ativos acessem o sistema, com sessão stateless.

**Requisitos funcionais**
- Login por `username` + senha.
- Emissão de JWT contendo identidade e permissões, com expiração configurável (padrão 12h).
- Toda rota protegida exige `Authorization: Bearer <token>`; token inválido/expirado retorna 401 e força novo login.

**Regras herdadas do V1 (mantidas)**
- Senha validada via hash (bcrypt); usuário inativo recebe a mesma mensagem genérica de erro que senha incorreta (evita enumeração de usuários).
- Rate limiting no login (tentativas por IP).

**Correções em relação ao V1**
- **Não haverá rota de debug pública** equivalente a `/api/debug/*` do V1 (que expunha dados sem autenticação). Qualquer rota de diagnóstico deve exigir `admin` e não expor amostras de dados de negócio.
- Seed de usuário admin padrão, se existir para ambiente de desenvolvimento, deve **forçar troca de senha no primeiro login** — não apenas avisar no console.
- Avaliar, como melhoria futura (fora do MVP), bloqueio por conta além de por IP.

---

### 4.2 Usuários e Permissões (RBAC)

**Objetivo:** controlar quem pode fazer o quê, por módulo.

**Requisitos funcionais**
- Dois papéis: `admin` (acesso irrestrito) e `operador` (permissões granulares por módulo).
- CRUD de usuário restrito a `admin`.
- Exclusão de usuário é sempre soft delete (`ativo = 0`).
- Um usuário não pode desativar a própria conta.

**Regras herdadas do V1 (mantidas)**
- Ao criar/editar um usuário `admin`, o conjunto de permissões é sempre o completo, independentemente do que foi enviado — admin não pode ter permissão parcial.
- Parsing de permissões deve ser defensivo: erro de formato **nega acesso**, nunca derruba o processo.

**Correções em relação ao V1**
- Nenhuma correção estrutural necessária; este módulo do V1 é considerado maduro e deve ser preservado como está, apenas reimplementado na nova arquitetura em camadas.

---

### 4.3 Produtos e Categorias

**Objetivo:** manter o catálogo de produtos vendáveis e seus custos/preços.

**Requisitos funcionais**
- Produto: nome, categoria, ícone/identificador visual, preço de venda, custo (usado em margem e em perdas).
- Categoria: nome, status ativo/inativo.
- Exclusão de produto/categoria é sempre soft delete, preservando histórico de vendas e estoque já lançado.
- Leitura pública para qualquer usuário autenticado; escrita exige permissão `produtos`; exclusão exige `admin`.

**Correções em relação ao V1**
- Adicionar validação de unicidade de nome por categoria (o V1 permite duplicatas sem aviso).
- Nenhum log de depuração com payload completo deve ir para produção (o V1 tinha `console.log` de debug ativo em rotas de produtos).

---

### 4.4 Estoque

**Objetivo:** saber, a qualquer momento, quanto de cada produto está disponível para venda.

**Requisitos funcionais**
- Estoque controlado por produto e por dia.
- Regra central: `disponível = inicial + produzido − vendido`.
- Se não existir registro do dia atual, o saldo final do dia anterior é copiado automaticamente como `inicial` do novo dia (rollover diário), zerando `produzido` e `vendido`.
- Débito de `vendido` ocorre **apenas na confirmação da venda**, dentro de transação, nunca ao adicionar item ao carrinho.
- Estoque insuficiente bloqueia a venda do item específico, com checagem que evite condição de corrida entre caixas simultâneos (lock a nível de linha).
- Upsert em lançamento individual e em lote.

**Correções em relação ao V1**
- Corrigir o bug confirmado no V1: erro de "estoque não lançado" referenciava uma variável inexistente (`periodo`) e gerava erro genérico 500 em vez de erro de negócio 400 com mensagem clara. Na V2, todo erro de regra de negócio deve ser uma exceção de domínio tratada explicitamente, nunca um erro não tratado.
- **Perdas devem debitar o estoque disponível.** No V1, o registro de perda é apenas contábil e não reduz o saldo mostrado — isso é uma inconsistência que a V2 deve eliminar (ver 4.10).
- Definir regra explícita para o campo `mínimo`: hoje é apenas informativo no V1; a V2 deve decidir se haverá bloqueio/alerta de venda abaixo do mínimo (a decidir em ADR específica de estoque).

---

### 4.5 Produção

> Módulo novo em relação ao V1 (que não separava "produção" de "estoque produzido" como conceito próprio).

**Objetivo:** registrar a produção diária de itens de padaria, alimentando o campo `produzido` do estoque de forma rastreável (quem produziu, quando, quanto).

**Requisitos funcionais**
- Registro de produção por produto, data e quantidade, vinculado ao usuário responsável.
- Cada registro de produção deve gerar (ou ser a origem de) o incremento de `produzido` no estoque do dia correspondente — sem permitir que o dado de estoque seja alterado diretamente sem rastro de produção.
- Consulta de produção por período, por produto.

**Fora de escopo desta fase**
- Controle de insumos/receita (ficha técnica com consumo de matéria-prima) — pode ser modelado futuramente a partir das fichas técnicas já existentes da padaria, mas não é obrigatório para o MVP do backend V2.

---

### 4.6 PDV / Vendas

**Objetivo:** registrar a venda no balcão com integridade entre venda, estoque e caixa.

**Requisitos funcionais**
- Venda só pode ser criada se: carrinho não vazio, total numérico maior que zero, e **houver turno de caixa aberto no momento** — validado no backend, independente do frontend.
- Todo item vendido deve ter vínculo com um produto do catálogo (item avulso sem vínculo de estoque é rejeitado).
- Numeração de pedido sequencial e atômica, segura sob concorrência.
- Criar venda é uma única transação: inserção da venda, inserção de itens, débito de estoque item a item, e lançamento automático da entrada correspondente no fluxo de caixa.
- Cancelamento de venda é sempre soft delete (`status = cancelada`), exige motivo, e é restrito a `admin`.
- Ao cancelar: lança estorno no fluxo de caixa com a data do cancelamento; reverte o estoque debitado usando a data original da venda.

**Correções em relação ao V1**
- A checagem de "caixa aberto" deve existir em **um único ponto** da arquitetura (o caso de uso `CreateSale`/`CriarVenda`), não duplicada entre middleware e service como hoje no V1 (que mantém `exigirCaixaAberto.js` órfão e a checagem duplicada dentro do service).
- Definir explicitamente, em ADR própria, se será permitido cancelar venda de um turno já fechado — hoje o V1 permite, e o estorno sempre vai para o fluxo do dia da ação, o que pode distorcer a conciliação do turno vigente.
- Consulta de vendas deve ter paginação obrigatória (no V1, a listagem de vendas não é paginada e pode retornar um intervalo de datas arbitrariamente grande).

---

### 4.7 Caixa (Turno)

**Objetivo:** controlar abertura, operação e fechamento do caixa por turno, com apuração de diferença por forma de pagamento.

**Decisão de arquitetura (herdada da análise do V1, a ser formalizada em ADR própria da V2):**
O V2 terá **um único modelo de caixa**, por turno — não haverá um sistema paralelo por "dia inteiro". Isso resolve a maior inconsistência identificada no V1 (dois sistemas de caixa coexistindo, um deles morto/vestigial mas ainda presente no código).

**Requisitos funcionais**
- Turno definido por período (ex.: manhã/tarde), com apenas um turno aberto por período por dia.
- Abertura de turno registra o fundo de caixa inicial (espécie e moedas).
- Fechamento calcula o **esperado por forma de pagamento** (dinheiro, PIX, cartão) somando os lançamentos do fluxo de caixa gerados desde a abertura do turno — não o dia inteiro.
- Esperado em dinheiro inclui o fundo de abertura somado às vendas em dinheiro do turno.
- Diferença = contado − esperado, calculada por forma de pagamento e no total, classificada como `bateu certo`, `sobra` ou `falta`.
- Toda venda é bloqueada com erro de negócio explícito (não erro genérico) se não houver turno aberto para o período atual.
- Endpoint de **prévia de fechamento** (calcular o esperado antes de confirmar o fechamento), permitindo ao operador conferir antes de encerrar o turno.

**Regras de domínio (`CaixaTurno`, `CaixaMovimento` — conforme proposta de Clean Architecture já validada para este módulo)**
- `Esperado = Valor Inicial + Total de Vendas − Total de Sangrias`
- `Diferença = Valor Contado − Valor Esperado`
- Não permitir abertura de novo turno se já houver um turno ativo no mesmo período.
- Rejeitar valores monetários negativos e exigir identificação do operador responsável.

**Correções em relação ao V1**
- O critério de qual período (manhã/tarde) um turno pertence deve ser fixado **no momento da abertura**, não recalculado dinamicamente a cada consulta — o V1 recalcula por horário do servidor no momento da consulta, o que pode fazer um turno mudar de período entre a abertura e o fechamento se a regra de corte mudar.
- Fechamento de caixa deve rodar dentro de transação SQL única (tudo ou nada).
- A visão de "Fluxo de Caixa" e a visão de "Fechamento de Turno" devem usar exatamente o mesmo critério de filtro (por turno, não por data corrida), eliminando a divergência do V1 onde uma tela filtra por data e outra por `aberto_em`.

---

### 4.8 Fluxo de Caixa

**Objetivo:** registrar entradas e saídas manuais (sangrias, suprimentos, contas) e consolidar com os lançamentos automáticos de venda/estorno.

**Requisitos funcionais**
- Lançamento manual exige tipo (entrada/saída), descrição, valor maior que zero e data.
- Lançamentos podem ser automáticos (gerados pelo sistema: venda, estorno) ou manuais.
- Lançamentos automáticos não podem ser excluídos por operadores comuns — apenas `admin`.
- Todo lançamento deve estar vinculado a um turno (ver 4.7), não apenas a uma data corrida.

---

### 4.9 Encomendas

**Objetivo:** registrar pedidos de clientes com itens, status e histórico.

**Requisitos funcionais**
- Numeração sequencial atômica própria, independente da numeração de vendas.
- Status possíveis: `pendente` (padrão), `pronto`, `entregue`, validados por whitelist.
- Total sempre recalculado no backend a partir dos itens enviados — nunca confia no total enviado pelo cliente.
- Edição de encomenda substitui todos os itens (não faz merge incremental).

**Correções em relação ao V1**
- Exclusão de encomenda deve ser **soft delete**, alinhada ao padrão do restante do sistema — no V1 é exclusão física, o que quebra o histórico/auditoria.
- Definir, em decisão de produto, se encomendas devem debitar/reservar estoque (hoje no V1 não debitam, diferente das vendas do PDV) — a decisão deve ser explícita, não implícita.

---

### 4.10 Perdas (quebra de estoque)

**Objetivo:** registrar quebra, vencimento, dano ou sobra de produto, com custo associado.

**Requisitos funcionais**
- Motivo obrigatório, restrito a whitelist (queimado, vencido, danificado, sobra).
- Custo da perda calculado automaticamente (custo do produto × quantidade), não editável manualmente.
- **Registrar uma perda deve debitar o estoque disponível** (correção em relação ao V1, onde a perda é um registro contábil paralelo que não afeta o saldo mostrado em Estoque).
- Exclusão/edição de perda deve seguir o mesmo padrão de permissão do restante do sistema (o V1 deixa a exclusão sem controle de permissão específico).

---

### 4.11 Clientes

> Módulo novo em relação ao V1 (que só tinha dados de cliente embutidos, informalmente, dentro de Encomendas).

**Objetivo:** manter um cadastro mínimo de clientes para vincular a encomendas e, futuramente, histórico de compras/fidelidade.

**Requisitos funcionais**
- Cadastro com nome e contato (telefone/whatsapp no mínimo).
- Vínculo opcional entre cliente e encomenda.
- Soft delete.

**Fora de escopo desta fase**
- Programa de fidelidade, crédito de cliente, histórico de consumo agregado.

---

### 4.12 Funcionários e Folha de Pagamento

> No V1 este módulo existe apenas como stub de rotas (`funcionarios`, `adiantamentos`, `retiradas`, `folha`), sem tabela de banco nem regra real, com uma PRD específica já produzida separadamente (`PRD-modulo-funcionarios.md` no legado).

**Requisitos funcionais (visão macro para este PRD; detalhamento fica na PRD específica do módulo)**
- Cadastro de funcionário.
- Pagamento quinzenal, vale/adiantamento, controle de falta, atestado e hora extra.
- Vínculo com auditoria (toda alteração de folha deve gerar registro).

**Fora de escopo desta fase**
- Cálculo de encargos trabalhistas (INSS/FGTS) — tratado como cálculo simplificado interno, não substitui contabilidade formal.

---

### 4.13 Configurações

**Objetivo:** manter parâmetros gerais da loja.

**Requisitos funcionais**
- Nome da loja, slogan, logotipo como pares chave/valor com upsert.
- Leitura pública para autenticados; escrita exige `admin`.
- Upload de logo com limite de tamanho e tipos de arquivo permitidos.

---

### 4.14 Auditoria

**Objetivo:** garantir rastreabilidade de ações sensíveis.

**Requisitos funcionais**
- Registro de: usuário, ação, tabela/entidade afetada, id do registro, estado antes/depois, IP, timestamp.
- Falha ao gravar auditoria nunca deve interromper a operação principal (best-effort), mas deve ser logada para investigação.

**Correções em relação ao V1**
- Cobertura de auditoria deve ser **completa para todos os módulos que alteram dinheiro ou estoque** — no V1, estoque, fluxo manual, perdas, encomendas e configurações não geravam auditoria. Na V2, isso é requisito, não opcional.

---

### 4.15 Relatórios

> Módulo novo/ampliado em relação ao V1 (que tinha apenas listagens brutas, sem relatórios gerenciais).

**Requisitos funcionais**
- Relatório de vendas por período, por forma de pagamento, por produto.
- Relatório de fechamento de caixa por turno/período.
- Curva ABC de produtos (mais vendidos por receita/quantidade).
- Relatório simplificado de resultado (entradas − saídas) por período.

**Fora de escopo desta fase**
- DRE contábil formal, exportação para sistemas contábeis externos.

---

### 4.16 Integração TEF

**Objetivo:** permitir pagamento com cartão via TEF integrado ao PDV.

**Requisitos funcionais (nível de contrato, não de implementação)**
- A aplicação deve depender de uma interface/contrato de pagamento, não de uma biblioteca TEF específica — permitindo trocar o provedor sem alterar o caso de uso de venda (conforme ADR-001, seção de integrações externas).
- Resultado da transação TEF (aprovada/negada/cancelada) deve refletir no status da venda e no fluxo de caixa.

**Fora de escopo desta fase**
- Escolha do provedor TEF específico e sua implementação concreta — a decisão de fornecedor será registrada em ADR própria quando houver necessidade real de negócio.

---

### 4.17 Integração Fiscal

**Objetivo:** viabilizar emissão de cupom/nota fiscal a partir da venda.

**Requisitos funcionais (nível de contrato)**
- A aplicação deve depender de uma interface de emissão fiscal, isolada da regra de venda, seguindo o mesmo princípio de desacoplamento do TEF.

**Fora de escopo desta fase**
- Implementação concreta de emissão de NFC-e — está explicitamente fora do escopo desta etapa, conforme já definido no documento de escopo financeiro do V1.

---

## 5. Requisitos não funcionais

Estes requisitos aplicam-se a todos os módulos e derivam diretamente da ADR-001 e das práticas de segurança já validadas em produção no V1.

### 5.1 Arquitetura
- Estrutura em camadas: `Controller → Use Case → Domain → Repository Interface → Infrastructure → Database`, conforme ADR-001.
- Organização modular por domínio (`src/modules/{sales,products,inventory,cash-register,production,customers,users}`), não por tipo técnico de arquivo.
- Regras de negócio isoladas de framework web e de driver de banco.
- Integrações externas (TEF, fiscal, impressora) sempre atrás de uma interface/contrato.

### 5.2 Segurança
- Autenticação JWT stateless, sem secret padrão em produção (processo deve abortar a subida se `JWT_SECRET` ausente em produção).
- CORS restrito por whitelist de origem.
- Content Security Policy **efetivamente habilitada** (não apenas comentada como estava divergente no V1).
- Rate limiting no login **e** um limitador geral de API — o V1 tinha o limitador geral definido mas não aplicado; na V2 ambos devem estar ativos.
- Nenhuma rota de diagnóstico/debug pode ficar pública sem autenticação.
- Stack trace nunca exposto ao cliente; erros 500 genéricos em produção, log detalhado apenas no servidor.
- Transações de banco obrigatórias em toda operação que afete múltiplas tabelas (venda, fechamento de caixa, perda com débito de estoque).

### 5.3 Performance
- Consultas de agregação (fechamento de turno, relatórios) devem ser indexadas adequadamente para responder de forma rápida mesmo em volume de meses de operação.
- Toda listagem que pode crescer sem limite (vendas, encomendas, fluxo, estoque histórico) deve ser paginada.

### 5.4 Testabilidade
- Regras de domínio (cálculo de diferença de caixa, disponibilidade de estoque, numeração sequencial) devem ser testáveis por unidade, sem dependência de banco real.
- Testes de integração cobrindo os fluxos críticos: criar venda, abrir/fechar turno, lançar/reverter estoque.

### 5.5 Operação
- Deve continuar sendo possível rodar em um computador comum de loja, sem exigir infraestrutura cara ou internet de alta qualidade — mantém a proposta de valor original do V1.

---

## 6. Débitos técnicos do V1 que a V2 deve resolver (rastreabilidade)

| # | Problema no V1 | Módulo | Tratamento na V2 |
|---|---|---|---|
| 1 | Dois sistemas de caixa coexistindo (`caixa_movimentos` vestigial + `caixa_turnos` real) | Caixa | V2 nasce com um único modelo de caixa por turno (Seção 4.7) |
| 2 | Checagem de "caixa aberto" duplicada entre middleware órfão e service | Caixa/Vendas | Único ponto de verificação, dentro do caso de uso `CreateSale` |
| 3 | `ReferenceError` (bug de variável inexistente) ao vender sem estoque lançado | Vendas | Exceções de domínio tratadas explicitamente, nunca erro não tratado |
| 4 | Exclusão de encomenda é hard delete | Encomendas | Soft delete obrigatório, alinhado ao restante do sistema |
| 5 | Perdas não debitam o estoque disponível | Estoque/Perdas | Perda passa a debitar estoque no registro |
| 6 | Rota de debug pública sem autenticação | Segurança | Nenhuma rota de diagnóstico pública; exige `admin` |
| 7 | CSP definida como desabilitada apesar do comentário dizer o contrário | Segurança | CSP efetivamente habilitada e testada |
| 8 | Limitador geral de API definido mas não aplicado | Segurança | Limitador geral ativo, além do limitador de login |
| 9 | Visão "Fluxo de Caixa" (por data) diverge da visão "Fechamento de Turno" (por `aberto_em`) | Caixa/Fluxo | Mesmo critério de filtro (por turno) nas duas visões |
| 10 | Auditoria incompleta (estoque, fluxo manual, perdas, encomendas, config fora do escopo) | Auditoria | Cobertura obrigatória para todo módulo que altera dinheiro/estoque |
| 11 | `console.log` de debug com payloads em rotas de produção | Produtos | Nenhum log de payload completo em produção |
| 12 | Seed de admin com senha padrão sem forçar troca | Auth | Troca de senha obrigatória no primeiro login do seed |

---

## 7. Fora de escopo deste PRD (mas mapeado para o futuro)

- Frontend (mantém-se vanilla JS por ora, conforme decisão original do V1; nova ADR pode revisitar isso).
- Implementação concreta de provedor TEF e de emissão fiscal (apenas o contrato/interface está neste escopo).
- Cálculo trabalhista completo (INSS/FGTS) no módulo de folha.
- Suporte multi-loja / múltiplos caixas em bancos separados.
- Migração de dados históricos do V1 para o V2 (deve ser tratada como projeto à parte, com ADR própria, se necessário).

---

## 8. Critérios de aceite (Definition of Done) por entrega

Uma entrega de módulo só é considerada concluída quando:
1. As regras de negócio do módulo estão implementadas na camada de domínio/caso de uso, sem SQL direto no controller.
2. Existem testes automatizados cobrindo a regra crítica do módulo (ex.: cálculo de diferença de caixa, disponibilidade de estoque).
3. Toda operação que altera dinheiro ou estoque gera registro de auditoria.
4. Erros de regra de negócio retornam código HTTP e mensagem de negócio claros — nunca stack trace ou erro genérico 500 para uma condição esperada.
5. A rota está protegida pela permissão correta (RBAC) e documentada.
6. O débito técnico correspondente da Seção 6 (se houver) foi resolvido, não apenas contornado.

---

## 9. Roadmap de entrega sugerido

A execução detalhada, com dependências e critérios de aceite testáveis por fatia, está em `docs/specs/README.md`. O agrupamento temático abaixo permanece válido; a ordem **implementável** ajusta caixa e perdas para antes do PDV (venda exige turno aberto; perda é o débito de estoque mais simples).

1. **Fundação:** Auth, Usuários/RBAC, Auditoria, estrutura de camadas (ADR-001 aplicada), Configurações. → SPEC-001 a SPEC-006
2. **Núcleo operacional:** Produtos/Categorias, Estoque, Produção. → SPEC-007 a SPEC-009
3. **Caixa unificado e estoque de perda:** Caixa por Turno + Fluxo + Perdas (modelo único de caixa; perda debita estoque). → SPEC-010 a SPEC-012
4. **PDV:** criar venda e cancelar venda (resolvendo débitos #2, #3). → SPEC-013 e SPEC-014
5. **Operação estendida:** Clientes, Encomendas. → SPEC-015 e SPEC-016
6. **Gestão:** Relatórios; Funcionários/Folha (macro; detalhe na PRD específica). → SPEC-017 e SPEC-018
7. **Integrações:** contratos de TEF e Fiscal (implementação concreta fica para quando houver necessidade real de negócio). → SPEC-019

---

## 10. Relação com outros documentos

- `docs/specs/` — specs incrementais (`SPEC-001` … `SPEC-019`) que fatiam este PRD em entregas testáveis.
- `ADR-001-clean-code-solid.md` (V2) — princípios de engenharia que todo módulo aqui descrito deve seguir.
- ADR de arquitetura do sistema (a criar) — vai formalizar a decisão de caixa único por turno (Seção 4.7).
- ADR de banco de dados (a criar).
- ADR de autenticação e autorização (a criar, pode referenciar as ADRs já validadas no V1).
- ADR de integração TEF e ADR de integração fiscal (a criar quando o provedor for escolhido).
- `PRD-modulo-funcionarios.md` (legado V1) — detalhamento do módulo de Folha, referenciado na Seção 4.12.

---

## 11. Aprovação

| Papel | Nome | Status |
|---|---|---|
| Autor / Desenvolvedor | Adby Muniz | Pendente de revisão |
| Decisor | Adby Muniz (dono do projeto) | Pendente |

