# AGNES.DEV

Hub pessoal desktop para organizar e acessar rapidamente projetos, arquivos e pastas favoritas — tudo em um só lugar.

## O que faz

- Salva atalhos de arquivos e pastas de projetos
- Abre qualquer item salvo com um clique
- Interface customizada, sem a barra padrão do Windows
- Roda local, sem depender de conta ou nuvem

## Stack

- Electron (processo principal em `main.cjs`, `preload.cjs`, `local-projects.cjs`)
- React + Vite (interface em `renderer/`)
- Tailwind CSS

## Estrutura

```
main.cjs             # processo principal do Electron (janela, protocolo agnes://, IPC)
preload.cjs           # ponte segura entre main e renderer
local-projects.cjs    # registro local dos projetos salvos (arquivo/pasta)
package.json
icon.ico
renderer/
  index.html
  assets/              # build do frontend (js/css)
  *.svg, *.png, *.gif  # ícones e imagens usadas na interface
```

## Sobre estes arquivos

Estes arquivos foram extraídos de dentro do `app.asar` de uma build já compilada do app (não havia mais o repositório fonte original disponível). Por isso:

- `main.cjs`, `preload.cjs` e `local-projects.cjs` são o código real do processo principal, sem alterações de conteúdo.
- Os arquivos em `renderer/assets/*.js` são o **bundle de produção minificado** do frontend (gerado pelo Vite) — nomes de variáveis, componentes e comentários originais não existem mais nesse estágio e não podem ser recuperados.
- Os arquivos `renderer/assets/*.css` foram reformatados apenas com quebras de linha/indentação para facilitar a leitura, sem alterar nenhuma regra ou valor.

Se você ainda tiver a pasta do projeto original (com `src/`, `package.json` com dependências e scripts de build), use ela como fonte de verdade em vez destes arquivos.

## Como rodar (a partir do fonte original, se você tiver)

```bash
npm install
npm run dev
```
