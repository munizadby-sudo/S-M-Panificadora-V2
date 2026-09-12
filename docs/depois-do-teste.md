# Depois do período de teste (V2 neste PC)

**Piloto não fiscal: 14 dias.**  
Início: **2026-08-30**. Fim: **2026-09-13**.

Cupom e operação neste prazo são **não fiscais**. TEF e emissão fiscal não entram.

Congelado de propósito. Não implementar da lista abaixo enquanto o piloto estiver rodando. No dia 13/09 (ou no expediente seguinte), atacar **nesta ordem**, uma coisa por vez.

| # | O quê | Onde |
|---|---|---|
| ~~1~~ | ~~Login: 5 erros / **2 min** / acertar a senha **zera**~~ — feito 2026-09-12 | ISSUE-015 |
| 2 | Ensaio de verdade: reiniciar o Windows e só o atalho | `deploy/COMO-LIGAR.md` |
| 3 | Backup diário agendado + um restore de prova | `deploy/backup.ps1`, `deploy/restaurar.ps1` |
| 4 | E2E além do Chromium da demo | ISSUE-014 — só se doer |
| 5 | **CI/CD da V2** — GitHub Actions rodando `npm test` (backend + frontend) e `cd demo && npm run testar` a cada push/PR. **Não** publicar sozinho neste PC da loja (o caixa continua atalho + PM2) | ADR-006 §5.2; hoje **não existe** `.github/` |
| 6 | Balança: leitor na etiqueta → item na venda. Digitação se falhar. Estoque em kg ou unidade; tipo do produto dá para trocar. **Balança não fica presa na Filizola** (Prix ou outra) | Filizola agora; Prix/outra depois — ver abaixo |
| 7 | Venda: quantidade manual no item (hoje o PDV incrementa 1 a 1) | SPEC-FE-007 / PDV |
| 8 | Pagamento com **duas formas** na mesma venda (dinheiro + cartão, dinheiro + PIX) | SPEC-BE-007 / PDV |

**Fora desta lista (não entra no “vamos pra cima” do piloto):** Electron, Edge, Cypress, TEF, fiscal, pasta `e2e/` com três motores.

### O que é o item 5 (CI/CD), em uma frase

Robô no GitHub que testa o código quando sobe. A V2 **não tem** isso ainda. Depois do piloto, entra. O PDV da padaria **não** atualiza sozinho pela nuvem.

### O que é o item 6 (balança / leitor), decisão 2026-09-12

**Não** calcular custo/preço na hora do scan. Custo e preço ficam no **cadastro do produto**. A venda só lê a etiqueta.

**Fluxo no balcão (qualquer produto pesado):**

1. Pesa na balança (hoje **Filizola Platina**; amanhã pode ser **Prix** ou outra).
2. A impressora da balança imprime a etiqueta com código de barras (hoje **302.10F**).
3. O caixa passa o **leitor**.
4. O sistema reconhece o produto e o peso e **insere sozinho** na venda.

**Se o leitor não ler:** o operador coloca o item **na mão** (produto + peso).

**Estoque — dois tipos, e dá para mudar:**

- **Por unidade:** pão hoje, lata, etc. Baixa 1, 2, 3…
- **Por peso (kg):** queijo, frios; e o pão **no mês que passar a ser por peso**. Baixa o peso da etiqueta.

O mesmo produto **não fica preso** no tipo. Exemplo combinado: pão cadastrado por unidade; no mês seguinte o operador (ou admin) muda para **peso**. Vale o contrário também (peso → unidade), se um dia precisar.

Vendas antigas **não mudam** (o que vendeu por unidade continua por unidade no histórico).

**Cuidado no estoque na hora da troca:** 40 pães **não** viram 40 kg sozinhos. Ao mudar o tipo, o saldo precisa ser **acertado na mão** (zerar e lançar de novo em kg, ou informar o peso que tem na prateleira). Sem isso o estoque mente.

**Trocar de balança não pode quebrar o PDV.** Filizola, Prix e outras imprimem o código **de jeitos diferentes** (tamanho, se manda peso ou preço, código do produto). Se o sistema nascer “só Filizola”, na troca a leitura erra ou a venda trava.

Regra para quando for fazer:

- O PDV **não** fala com a balança. Só recebe o que o **leitor** digita (como teclado).
- A tradução “código → produto + peso” fica num **perfil de balança** (Filizola, Prix, outro), escolhido na configuração — não espalhado no caixa.
- Código que não bater com o perfil: **não quebra**. Avisa “não reconheci” e o operador lança na mão.
- Trocar de marca = trocar o perfil (e, se precisar, cadastrar um perfil novo). Venda, estoque e cadastro **não** reescrevem.

Antes de codar: uma etiqueta real da balança **atual** na mesa (se o código traz peso ou preço). O leitor em geral entra no PC como teclado.

### Itens 7 e 8 (PDV), em uma frase cada

- **7:** no balcão, digitar a quantidade do item em vez de clicar várias vezes.
- **8:** uma venda, dois meios — cliente paga parte em dinheiro e o resto em cartão ou PIX.
