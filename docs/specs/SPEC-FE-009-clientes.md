# SPEC-FE-009 — Clientes (Frontend)

- **Status:** Rascunho para revisão
- **Data:** 2026-08-18
- **Módulo:** `frontend/src/modules/clientes`
- **Depende de:** SPEC-FE-001 (Fundação), SPEC-BE-009 (contrato de API)
- **PRD de origem:** `PRD-011-clientes.md`
- **Consumido por:** SPEC-FE-010 (Encomendas) — o formulário de encomenda vai reaproveitar o componente de busca/seleção de cliente daqui.

---

## 1. Objetivo técnico

Especificar o cadastro de clientes: listagem com busca, cadastro/edição simples, e um componente de seleção reaproveitável que a tela de Encomendas vai usar depois — incluindo a possibilidade de cadastrar um cliente novo sem sair do fluxo de outra tela.

---

## 2. Contrato de módulo (segue SPEC-FE-001, Seção 6.1)

```js
// modules/clientes/index.js
export default {
  id: 'clientes',
  label: 'Clientes',
  icone: 'ti-users',
  permissao: 'clientes',
  async montar(container) { /* ... */ },
  desmontar() { /* ... */ }
}
```

---

## 3. Passos de implementação (incrementais, cada um testável isoladamente)

### Passo 1 — Listagem com busca (somente leitura)
- Consumir `GET /api/clientes` (SPEC-BE-009, Seção 5.1), busca por nome ou telefone.
- **Testável:** ver a lista carregada de verdade, buscar por nome parcial e por telefone parcial.

### Passo 2 — Cadastro e edição
- Modal simples: nome, telefone.
- Tratamento do erro 409 (telefone duplicado) como mensagem de negócio clara, sem fechar o modal — mesmo padrão já usado em Produtos (SPEC-FE-004).
- **Testável:** cadastrar um cliente, editar, e tentar cadastrar telefone duplicado vendo a mensagem aparecer.

### Passo 3 — Desativação e reativação
- Mesmo padrão de Produtos (SPEC-FE-004, Passo 4): botão "Desativar" (nunca "Excluir"), alternância "Mostrar inativos", botão "Reativar" nos inativos visíveis.
- **Testável:** desativar um cliente, ver sumir da lista padrão, ligar "Mostrar inativos", reativar.

### Passo 4 — Componente `SeletorCliente` reaproveitável
- Componente isolado: busca incremental por nome/telefone (`GET /api/clientes?busca=...`), exibindo resultados conforme o usuário digita.
- **Inclui a opção de cadastrar um cliente novo sem sair do contexto** — um link/botão "Cliente não encontrado? Cadastrar novo" que abre o formulário do Passo 2 dentro do mesmo fluxo (ex.: modal sobre modal, ou painel inline), sem perder o que já estava sendo preenchido na tela que chamou o seletor.
- Este componente é construído aqui, mas pertence à interface pública do módulo — é o que SPEC-FE-010 (Encomendas) vai importar e reaproveitar, não duplicar.
- **Testável:** buscar um cliente existente e selecioná-lo; buscar um que não existe, cadastrar na hora, e ver ele já vir selecionado automaticamente depois de criado.

---

## 4. Componentes de UI

| Componente | Responsabilidade |
|---|---|
| `ListaClientes` | Tabela com busca, ativos/inativos |
| `ModalCliente` | Cadastro/edição |
| `SeletorCliente` | Busca + seleção reaproveitável, com atalho de cadastro rápido (usado por Encomendas) |

---

## 5. Tratamento de erro

| Erro do backend | Tratamento na UI |
|---|---|
| `409` — telefone duplicado | Mensagem de negócio clara, modal permanece aberto |
| `400` — nome/telefone vazio | Mensagem inline no campo |

---

## 6. Critérios de aceite técnicos

1. "Desativar" nunca aparece como "Excluir" em nenhum texto.
2. `SeletorCliente` permite cadastrar um cliente novo sem perder o contexto da tela que o chamou (ex.: um formulário de encomenda parcialmente preenchido não é perdido).
3. Erro de telefone duplicado sempre aparece como mensagem de negócio, nunca técnica.
4. Cada um dos 4 passos da Seção 3 é individualmente testável no navegador, na ordem descrita.
