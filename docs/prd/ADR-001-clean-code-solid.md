# ADR-001 — Adoção de Clean Code e SOLID

- **Status:** Aceita
- **Data:** 2026-08-11
- **Decisores:** Equipe do projeto
- **Escopo:** Sistema de Gestão da Souza & Moraes Panificadora

## 1. Contexto

O sistema da Souza & Moraes Panificadora será reconstruído a partir do zero, utilizando como referência as funcionalidades e regras de negócio identificadas no sistema existente.

O novo sistema deverá evoluir para atender, entre outras necessidades:

- PDV;
- produtos e categorias;
- estoque;
- produção;
- controle de caixa;
- clientes;
- usuários e permissões;
- relatórios;
- integração com TEF;
- integração com serviços fiscais.

O crescimento previsto do sistema aumenta a necessidade de uma base de código organizada, legível, testável e de fácil manutenção.

O projeto anterior apresentou situações em que responsabilidades poderiam ficar concentradas em arquivos ou funções muito grandes, aumentando o acoplamento e o risco de alterações em uma funcionalidade afetarem outras partes do sistema.

Diante disso, é necessário estabelecer desde o início princípios de desenvolvimento que orientem a construção e a evolução do código.

## 2. Decisão

Adotar **Clean Code** e os princípios **SOLID** como diretrizes obrigatórias de desenvolvimento do novo sistema.

Esses princípios serão aplicados de forma pragmática, evitando complexidade arquitetural desnecessária.

### 2.1 Clean Code

O código deverá priorizar:

- nomes claros e significativos;
- funções pequenas e com responsabilidade bem definida;
- baixo acoplamento;
- alta coesão;
- tratamento explícito de erros;
- eliminação de código duplicado quando apropriado;
- comentários somente quando agregarem contexto relevante;
- organização consistente dos módulos;
- facilidade de leitura e manutenção.

### 2.2 SOLID

Serão adotados os cinco princípios SOLID:

**S — Single Responsibility Principle**

Cada classe, módulo ou componente deverá possuir uma responsabilidade principal e uma razão clara para mudar.

**O — Open/Closed Principle**

Os componentes deverão ser estruturados para permitir extensão sem exigir alterações desnecessárias em código estável.

**L — Liskov Substitution Principle**

Implementações derivadas deverão respeitar os contratos definidos pelas abstrações que implementam.

**I — Interface Segregation Principle**

Interfaces e contratos deverão ser específicos, evitando obrigar consumidores a depender de métodos que não utilizam.

**D — Dependency Inversion Principle**

As regras de negócio não deverão depender diretamente de detalhes de infraestrutura. Dependências importantes deverão ser abstraídas quando isso trouxer benefício real para o projeto.

## 3. Justificativa

A adoção desses princípios tem como objetivo:

1. reduzir o acoplamento entre os módulos;
2. facilitar testes automatizados;
3. facilitar manutenção e evolução;
4. diminuir o risco de regressões;
5. tornar as regras de negócio mais isoladas;
6. facilitar futuras integrações externas;
7. permitir substituição de tecnologias de infraestrutura sem reescrever as regras de negócio;
8. melhorar a legibilidade e a compreensão do código por outros desenvolvedores.

No contexto do sistema da padaria, isso é especialmente importante porque funcionalidades como PDV, estoque, caixa, produção, TEF e integração fiscal possuem regras diferentes, mas precisam trabalhar de forma integrada.

## 4. Princípios de aplicação

A aplicação de Clean Code e SOLID deverá seguir algumas regras práticas.

### 4.1 Regras de negócio isoladas

Regras importantes do negócio não deverão ficar diretamente acopladas à interface do usuário ou ao banco de dados.

Exemplo conceitual:

```text
Controller
    ↓
Use Case
    ↓
Domain / Business Rules
    ↓
Repository Interface
    ↓
Infrastructure
    ↓
Database
```

### 4.2 Controllers enxutos

Controllers deverão ser responsáveis principalmente por:

- receber requisições;
- validar entradas básicas;
- chamar o caso de uso apropriado;
- devolver a resposta.

Não deverão concentrar regras complexas de negócio.

### 4.3 Casos de uso

Operações importantes do sistema deverão ser representadas por casos de uso quando isso melhorar a organização da regra de negócio.

Exemplos:

```text
CreateSale
CancelSale
OpenCashRegister
CloseCashRegister
RegisterStockEntry
RegisterProduction
```

### 4.4 Integrações externas

Integrações como TEF, serviços fiscais, impressoras ou APIs externas deverão ser isoladas da regra de negócio.

A aplicação deverá depender de contratos, permitindo substituir uma implementação externa sem alterar toda a aplicação.

### 4.5 Código duplicado

Duplicação deverá ser eliminada quando houver uma regra realmente compartilhada.

Não deverá ser criada uma abstração apenas para evitar algumas linhas repetidas se isso tornar o código mais difícil de entender.

### 4.6 Complexidade

Clean Code e SOLID não deverão ser utilizados como justificativa para criar camadas, interfaces ou padrões sem necessidade.

A regra será:

> A arquitetura deve ser simples o suficiente para ser entendida e estruturada o suficiente para permitir evolução.

## 5. Alternativas consideradas

### 5.1 Continuar utilizando a estrutura atual

**Não adotada.**

A estrutura existente pode ser utilizada como referência funcional, mas não será utilizada como base arquitetural obrigatória para o novo sistema.

### 5.2 Utilizar código sem princípios arquiteturais definidos

**Não adotada.**

Essa abordagem poderia acelerar o início do desenvolvimento, porém aumenta o risco de acoplamento, duplicação e dificuldade de manutenção conforme o sistema cresce.

### 5.3 Adotar Clean Code e SOLID

**Adotada.**

Oferece uma base organizada para crescimento do sistema sem exigir, neste momento, uma arquitetura distribuída ou excessivamente complexa.

### 5.4 Utilizar microserviços desde o início

**Não adotada.**

O sistema não possui, neste momento, necessidade suficiente para justificar a complexidade operacional de uma arquitetura de microserviços.

O projeto poderá evoluir futuramente caso requisitos reais justifiquem essa mudança.

## 6. Consequências positivas

A decisão deverá proporcionar:

- maior legibilidade;
- melhor separação de responsabilidades;
- maior facilidade para testes;
- menor acoplamento;
- facilidade para manutenção;
- maior segurança para evolução do sistema;
- melhor organização das integrações externas;
- possibilidade de substituir componentes de infraestrutura com menor impacto.

## 7. Consequências negativas

A adoção desses princípios também apresenta custos:

- maior quantidade de arquivos;
- necessidade de maior disciplina durante o desenvolvimento;
- curva inicial de aprendizado;
- algumas funcionalidades simples poderão possuir mais camadas do que uma implementação direta;
- desenvolvimento inicial pode ser um pouco mais lento.

Esses custos são considerados aceitáveis diante da expectativa de evolução do sistema.

## 8. Diretriz para o projeto

A partir desta ADR, novas funcionalidades deverão ser implementadas respeitando:

1. separação clara de responsabilidades;
2. regras de negócio independentes da interface;
3. baixo acoplamento;
4. alta coesão;
5. dependências controladas;
6. código legível;
7. testes para regras críticas;
8. simplicidade arquitetural.

Quando uma decisão futura entrar em conflito com esta ADR, deverá ser criada uma nova ADR explicando a mudança.

## 9. Exemplo de estrutura esperada

Uma possível organização inicial do projeto poderá seguir o conceito:

```text
src/
├── modules/
│   ├── sales/
│   ├── products/
│   ├── inventory/
│   ├── cash-register/
│   ├── production/
│   ├── customers/
│   └── users/
│
├── shared/
│   ├── errors/
│   ├── types/
│   └── utils/
│
└── infrastructure/
    ├── database/
    ├── repositories/
    └── integrations/
```

A estrutura acima é uma referência inicial e poderá ser refinada por ADRs posteriores.

## 10. Relação com outros documentos

Esta ADR deverá ser considerada em conjunto com:

- **PRD do Sistema da Souza & Moraes Panificadora** — define requisitos e escopo do produto;
- ADR de arquitetura do sistema;
- ADR de banco de dados;
- ADR de autenticação e autorização;
- ADR de integração TEF;
- ADR de integração fiscal.

## 11. Critérios para revisão

Esta ADR poderá ser revisada quando:

- o projeto atingir uma escala que exija mudança arquitetural;
- novos requisitos conflitarem com as decisões atuais;
- uma nova tecnologia alterar significativamente a arquitetura;
- a aplicação prática dos princípios demonstrar problemas recorrentes.

Qualquer mudança relevante deverá ser registrada em uma nova ADR ou em uma atualização formal desta decisão.

## 12. Conclusão

O novo sistema da Souza & Moraes Panificadora adotará Clean Code e SOLID como princípios de engenharia de software.

A intenção não é criar uma arquitetura complexa, mas construir uma base organizada, sustentável e preparada para evolução.

O sistema será desenvolvido de forma modular, mantendo as regras de negócio isoladas dos detalhes de infraestrutura sempre que isso trouxer benefício real.

**Decisão final: ACEITA.**
