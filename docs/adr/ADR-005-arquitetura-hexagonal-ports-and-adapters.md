# ADR-005 — Arquitetura Hexagonal (Ports & Adapters) no Backend

- **Status:** Aceita
- **Data:** 2026-08-23
- **Decisores:** Equipe do projeto
- **Escopo:** Backend do `S-M-Panificadora-V2` — todos os módulos de domínio
- **Origem:** conversa com José Neto sobre a necessidade de construir o sistema "camada por camada", de forma que uma mudança de tecnologia de infraestrutura (ex.: trocar o banco de dados) exija apenas um ajuste pontual, nunca uma reescrita das regras de negócio. Esta ADR não muda nenhum código — **formaliza e nomeia** um padrão que já estava em prática desde a ADR-001, dando a ele um nome técnico de referência e um contrato explícito de verificação.

---

## 1. Contexto

A ADR-001 já definia a estrutura em camadas `Controller → Use Case → Domain → Repository Interface → Infrastructure → Database`, mas sem nomear o padrão arquitetural por trás dela. Isso gerou uma dúvida legítima: "o sistema está preparado para trocar de banco de dados sem reescrever a regra de negócio?" A resposta é sim, e o nome técnico desse preparo é **Arquitetura Hexagonal**, também chamada de **Ports & Adapters** (Alistair Cockburn) — a mesma família de ideia por trás da camada de "Repository Interface" que a ADR-001 já exigia.

A confusão de nomenclatura tem custo real: sem um nome e um contrato de verificação explícitos, é fácil um módulo novo "esquecer" a interface e acoplar direto à implementação concreta — foi exatamente isso que aconteceu com o módulo `audit`, identificado em revisão de código (2026-08-22) como o único módulo do backend sem uma interface de repositório formal, apesar de todos os outros já seguirem o padrão. Esta ADR fecha essa lacuna de nomenclatura e formaliza o contrato para que isso não se repita.

---

## 2. Decisão

O backend adota formalmente **Arquitetura Hexagonal (Ports & Adapters)** como o nome e o contrato de verificação da estrutura em camadas já definida na ADR-001.

### 2.1 O "hexágono" (núcleo da aplicação)
`domain/` + `application/` de cada módulo formam o núcleo — não importam nada de `infrastructure/`, não conhecem MySQL, Express, `bcrypt`, `jsonwebtoken`, ou qualquer biblioteca de infraestrutura. Só dependem de:
- Objetos e funções puras (`domain/`);
- Interfaces abstratas de repositório, definidas no próprio módulo em `application/ports.js` (`domain/erros.js` para exceções).

### 2.2 Ports (as interfaces)
Cada módulo com persistência declara sua própria interface em `application/ports.js`: uma classe cujos métodos lançam `Error('<Nome>.<metodo> não implementado')`. Exemplo real já em produção: `ProdutoRepository` (`backend/src/modules/products/application/ports.js`).

**Regra de verificação, não apenas de estilo:** todo módulo com uma tabela própria **deve** ter um `application/ports.js`. Isso é checável objetivamente — rodar `find backend/src/modules -maxdepth 1 -type d` e confirmar que cada módulo com uma implementação em `infrastructure/*Repository.js` tem um `ports.js` correspondente é o teste de conformidade desta ADR (foi assim que a lacuna do `audit` foi encontrada).

### 2.3 Adapters (as implementações concretas)
`infrastructure/` contém os adapters: `MySQLXxxRepository` (adapter de banco), `JwtTokenService`/`BcryptHashService` (adapters de autenticação), `DiscoLogoStorage` (adapter de armazenamento de arquivo). Cada um **estende** (`extends`) a interface do seu módulo — nunca existe uma implementação concreta sem herdar de uma interface abstrata. Os dublês de teste em memória (`backend/tests/helpers/Memoria*.js`) são adapters também — a mesma interface, uma implementação para testes em vez de para produção.

### 2.4 O que isso resolve na prática (exemplo concreto)
Se um dia o MySQL for substituído por outro banco: escreve-se um `PostgresProdutoRepository extends ProdutoRepository` implementando os mesmos métodos, aponta-se o `bootstrap.js` (composition root) para a nova classe, e **nenhuma linha de `domain/` ou `application/` muda** — nem a entidade `Produto`, nem os casos de uso `CreateProduto`/`ListProdutos`, nem os testes de domínio (que já rodam contra a interface, não contra MySQL). Isso já é verdade hoje para todo módulo que segue o padrão — não é uma promessa para o futuro, é a situação atual.

### 2.5 Nível de DDD adotado — tático, não estratégico
Esta ADR também nomeia o que já existe de Domain-Driven Design no projeto, para não ser confundido com uma proposta de DDD completo:
- **Adotado (tático):** entidades com invariantes que se auto-protegem no construtor (`Produto`, `Encomenda`, `CaixaTurno`), exceções de domínio nomeadas por regra de negócio, value objects calculados (`FechamentoCaixa`, `FolhaCalculada`), linguagem onipresente em português nos nomes de classes/métodos/erros.
- **Não adotado (estratégico) — deliberadamente fora de escopo:** bounded contexts formais, mapeamento de contexto entre módulos, agregados explicitamente modelados, eventos de domínio. Isso seria complexidade desproporcional ao tamanho do sistema, contra a diretriz da própria ADR-001 (Seção 4.6: "não criar camadas ou padrões sem necessidade"). Cada `modules/<nome>` já funciona como um bounded context informal — módulos não leem a tabela um do outro, sempre pela interface (ver ADR-004 e a correção do módulo `audit`) — mas isso não é formalizado com o aparato completo de DDD estratégico, e não precisa ser neste porte de sistema.

---

## 3. Justificativa

- Dá nome e contrato verificável a algo que já era exigido informalmente pela ADR-001, reduzindo a chance de um módulo novo pular a camada de interface (como aconteceu com `audit`).
- Responde diretamente à preocupação levantada: troca de tecnologia de infraestrutura (banco, serviço de hash, storage de arquivo) é hoje uma mudança isolada em `infrastructure/`, nunca uma reescrita de regra de negócio.
- Não exige nenhuma mudança de código — é o reconhecimento formal de uma decisão já em vigor, o que também facilita explicar a arquitetura para quem revisa o projeto de fora (como o José).

---

## 4. Alternativas consideradas

### 4.1 DDD estratégico completo (bounded contexts formais, agregados, eventos de domínio)
**Não adotada.** Complexidade desproporcional para um sistema do porte de uma padaria — módulos já se comportam como bounded contexts informais na prática, sem precisar do aparato completo.

### 4.2 Deixar sem nome formal, como estava
**Não adotada.** Já demonstrou custo real: a lacuna do módulo `audit` só foi pega em revisão manual, não por um contrato verificável. Nomear o padrão dá um critério objetivo de conformidade para módulos futuros.

### 4.3 Arquitetura Hexagonal / Ports & Adapters, formalizando o que já existe
**Adotada.** Mesmo padrão da ADR-001, agora com nome, contrato de verificação, e critério explícito de nível de DDD (tático, não estratégico).

---

## 5. Consequências

**Positivas**
- Critério objetivo e verificável: todo módulo com tabela própria tem `application/ports.js`, e toda implementação concreta usa `extends`.
- Vocabulário compartilhado com quem revisa o projeto de fora, alinhado a um nome de padrão reconhecido na indústria.
- Troca de banco de dados, biblioteca de hash, ou storage de arquivo permanece uma mudança isolada em `infrastructure/`.

**Negativas**
- Nenhuma nova — esta ADR não adiciona código nem camada nova, só nomeia e formaliza o que já existia.

---

## 6. Relação com outros documentos

- `ADR-001-clean-code-solid.md` — define a estrutura em camadas que esta ADR nomeia e formaliza.
- `ADR-004-seguranca-e-testabilidade-do-backend.md` — já exigia testabilidade de domínio sem banco real, pré-requisito direto de um núcleo hexagonal bem isolado.
- Achado do módulo `audit` (2026-08-22) — motivação concreta desta ADR; ver `SPEC-BE-003-auditoria-e-configuracoes.md`, Seção 3.1, para o registro da correção.

---

## 7. Critérios para revisão

Esta ADR poderá ser revisada se:
- o sistema crescer a ponto de bounded contexts formais e mapeamento de contexto trazerem benefício real (DDD estratégico deixar de ser overkill);
- surgir necessidade real de trocar uma peça de infraestrutura (banco, hash, storage) — nesse momento, esta ADR deve ser citada como o motivo de essa troca ser viável sem reescrever regra de negócio, validando (ou refutando, se algo não funcionar como esperado) a decisão registrada aqui.
