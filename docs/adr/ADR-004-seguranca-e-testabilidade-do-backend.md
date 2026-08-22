# ADR-004 — Segurança técnica e testabilidade do backend

- **Status:** Aceita
- **Data:** 2026-08-22
- **Decisores:** Equipe do projeto
- **Escopo:** Backend do `S-M-Panificadora-V2` — autenticação, proteções de infraestrutura, testabilidade de domínio
- **Origem:** conteúdo extraído do `PRD-001-backend-S-M-Panificadora-V2.md` (antigas Seções 5.1, 5.2 e 5.4, e parte técnica da Seção 4.1) após revisão de código do José (2026-08-18/20), que citou justamente a menção a JWT dentro do PRD de autenticação como exemplo de mistura entre comportamento de produto e decisão de tecnologia.

---

## 1. Contexto

O V1 já valida em produção um conjunto de decisões técnicas de segurança: JWT stateless, hash de senha via bcrypt, rate limiting por IP no login. O V2 reconstrói o backend do zero (ADR-001), e precisa decidir explicitamente se reaproveita essas escolhas técnicas ou não — essa é uma decisão de arquitetura/tecnologia, não de comportamento de produto, e por isso não deveria viver dentro do PRD de autenticação (`PRD-001-backend-S-M-Panificadora-V2.md`, Seção 4.1), que descreve apenas o que o usuário e o sistema fazem, não como é implementado.

---

## 2. Decisão

**2.1 Autenticação stateless via JWT**
- Emissão de JWT contendo identidade e permissões do usuário, com expiração configurável (padrão 12h).
- Toda rota protegida exige header `Authorization: Bearer <token>`; token ausente/inválido/expirado retorna `401`.
- O processo deve abortar a subida se `JWT_SECRET` estiver ausente em produção — nunca um secret padrão.

**2.2 Hash de senha via bcrypt**
- Senha sempre validada via hash bcrypt, prática já validada em produção no V1.

**2.3 Rate limiting**
- Limitador de tentativas de login por IP.
- Limitador geral de API ativo em todas as rotas (no V1 estava definido no código mas não aplicado de fato — ver débito técnico correspondente no PRD backend, Seção 6).

**2.4 Arquitetura em camadas e organização modular**
- Reafirma a estrutura definida na ADR-001: `Controller → Use Case → Domain → Repository Interface → Infrastructure → Database`.
- Organização por domínio (`src/modules/{sales,products,inventory,cash-register,production,customers,users}`), não por tipo técnico de arquivo.
- Integrações externas (TEF, fiscal, impressora) sempre atrás de uma interface/contrato.

**2.5 Proteções HTTP**
- CORS restrito por whitelist de origem.
- Content Security Policy efetivamente habilitada (no V1 estava comentada como habilitada mas não estava, na prática — débito técnico correspondente).
- Nenhuma rota de diagnóstico/debug pública sem autenticação `admin`.
- Stack trace nunca exposto ao cliente; erros `500` genéricos em produção, log detalhado apenas no servidor.
- Transação de banco obrigatória em toda operação que afete múltiplas tabelas (venda, fechamento de caixa, perda com débito de estoque).

**2.6 Testabilidade de domínio**
- Regras de domínio (cálculo de diferença de caixa, disponibilidade de estoque, numeração sequencial) devem ser testáveis por unidade, sem dependência de banco real — o que exige que a lógica de domínio dependa de interfaces de repositório (Dependency Inversion, ADR-001), nunca de acesso direto ao driver de banco.
- Consultas de agregação (fechamento de turno, relatórios) devem ser indexadas adequadamente no banco para responder rápido mesmo com meses de operação acumulada.

---

## 3. Justificativa

- JWT stateless e bcrypt já são práticas validadas em produção no V1 — reaproveitá-las evita reintroduzir risco em algo que já funciona, coerente com a diretriz da ADR-001 de usar o V1 como referência funcional.
- Separar essas decisões do PRD de autenticação evita que uma mudança de tecnologia (ex.: trocar JWT por sessão stateful no futuro) exija reescrever o documento de comportamento — o comportamento observável (login, expiração, logout) permanece o mesmo independentemente da tecnologia por trás.
- Testabilidade sem banco real é o que viabiliza a cobertura de testes automatizados exigida como critério de aceite em todo módulo do PRD backend.

---

## 4. Alternativas consideradas

### 4.1 Sessão stateful com armazenamento em servidor
**Não adotada.** Exigiria storage compartilhado entre instâncias (Redis ou equivalente) sem necessidade comprovada para o volume de uso de uma padaria — aumenta complexidade operacional sem benefício claro nesta fase.

### 4.2 Reaproveitar JWT + bcrypt + rate limiting do V1
**Adotada.** São práticas já validadas em produção; a reconstrução do backend (ADR-001) não precisa reabrir decisões de segurança que já funcionam, apenas reimplementá-las na nova arquitetura em camadas.

---

## 5. Consequências

**Positivas**
- Reaproveita decisões de segurança já testadas em produção, reduzindo risco na reconstrução do backend.
- Desacopla o comportamento de autenticação (PRD) da tecnologia que o implementa (ADR), permitindo trocar a tecnologia sem reescrever o PRD.
- Domínio testável por unidade sem banco real, viabilizando a cobertura de testes exigida no Definition of Done de cada módulo.

**Negativas**
- JWT não pode ser revogado antes de expirar — um usuário desativado continua com acesso até o token expirar (mitigado pela expiração curta de 12h).
- Exige disciplina para manter a lógica de domínio livre de acesso direto ao banco (Dependency Inversion).

---

## 6. Relação com outros documentos

- `PRD-001-backend-S-M-Panificadora-V2.md`, Seção 4.1 — descreve o comportamento observável de autenticação (login, expiração, logout) que esta ADR sustenta tecnicamente.
- `ADR-001-clean-code-solid.md` — princípios gerais de arquitetura em camadas que esta ADR aplica especificamente à segurança e testabilidade do backend.

---

## 7. Critérios para revisão

Esta ADR poderá ser revisada quando:
- o volume de usuários simultâneos ou a necessidade de revogação imediata de acesso justificar migrar para sessão stateful;
- houver necessidade real de login social/SSO ou autenticação de dois fatores (hoje fora de escopo, ver PRD-002 frontend);
- a aplicação prática das proteções HTTP demonstrar lacunas não previstas aqui.
