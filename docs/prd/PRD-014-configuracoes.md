# PRD-014 — Configurações (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-11
- **Módulo:** Parâmetros gerais da loja (nome, slogan, logotipo)
- **Referência/legado:** `S-M-Panificadora` (V1) — `tela-config` em `index.html` (`cfg-nome`, `cfg-slogan`, `logo-input`, `logo-nome`, `logo-preview`), função `aplicarLogo` em `app.js`
- **Depende de:** PRD-001, PRD-002. Restrito a `admin` para escrita; leitura pública para autenticados (nome/slogan) e pública sem autenticação para a tela de login (ver PRD-002, Seção 5).

---

## 1. Objetivo

Permitir que o administrador configure a identidade visual básica do sistema (nome da loja, slogan, logotipo), refletida tanto no shell autenticado quanto na tela de login.

---

## 2. Contexto (V1)

- Campos simples de nome e slogan (`cfg-nome`, `cfg-slogan`).
- Upload de logotipo com preview (`logo-input`, `logo-preview`), aplicado dinamicamente pela função `aplicarLogo`.
- Limite de 3MB, tipos aceitos: jpeg/png/gif/webp/svg+xml (regra de backend).

---

## 3. Requisitos funcionais

- Formulário de edição: nome da loja, slogan.
- Upload de logotipo com preview antes de salvar, validação de tamanho (máx. 3MB) e tipo de arquivo no próprio frontend, antes de enviar ao backend (feedback mais rápido ao usuário).
- Aplicação do logotipo/nome atualizado em tempo real no shell após salvar, sem exigir recarregar a página.
- Leitura de nome/slogan/logo disponível também para a tela de login, via endpoint público (ver correção no PRD-002).
- **Fundo de troco padrão** *(requisito novo, ligado ao PRD-004)*: campo de configuração com o valor padrão de fundo em espécie e em moedas que a loja costuma deixar na gaveta de um turno para o outro (ex.: R$ 40 espécie / R$ 10 moedas). Esse valor é usado apenas para **pré-preencher** o modal de abertura de turno (PRD-004) — não é aplicado automaticamente sem confirmação, e a balconista sempre pode ajustá-lo na hora da abertura conforme a contagem física real.

---

## 4. Regras herdadas do V1 (mantidas)

- Upload de logo com limite de 3MB e tipos aceitos definidos.
- Nome/slogan como pares simples de configuração.

---

## 5. Correções em relação ao V1

- A leitura de nome/logo para a tela de login deixa de depender de cache local (`sessionStorage` de uma sessão anterior) e passa a vir de um endpoint público de configuração básica — correção já detalhada no PRD-002, Seção 5, mas que depende deste módulo expor esse dado de forma pública e somente leitura.
- **Fundo de troco padrão** é um campo novo em relação ao V1, que não tinha nenhum conceito de valor padrão configurável para a abertura de caixa — cada abertura exigia digitação do zero.

---

## 6. Fora de escopo desta fase

- Tema de cores customizável.
- Múltiplas lojas/múltiplas configurações (fora de escopo também no backend).

---

## 7. Critérios de aceite

1. Alterar nome/slogan/logo reflete imediatamente no shell após salvar.
2. Upload rejeita arquivo acima de 3MB ou de tipo não permitido antes mesmo de enviar ao backend.
3. Tela de login exibe nome/logo corretos mesmo em navegador novo, sem sessão anterior.
4. O valor de fundo de troco configurado aqui aparece pré-preenchido no modal de abertura de turno (PRD-004), permanecendo editável.
