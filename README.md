<div align="center">

# 🏆 Bolão Copa do Mundo — Agropesg

**Da planilha cheia de fórmulas para um sistema web com apuração 100% automática.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## 📖 Sobre o projeto

Durante anos, o bolão da Copa do Mundo aqui na **Agropesg** foi feito em uma planilha cheia de fórmulas manuais: apuração de pontos, classificação de grupos e chaveamento do mata-mata, tudo calculado — e corrigido — à mão, jogo a jogo.

Este projeto é a modernização completa daquele processo: um sistema web dedicado, com **apuração automática de pontos**, **ranking detalhado por participante** e **atualizações ao vivo durante os jogos**, eliminando de vez a planilha e o trabalho manual.

<br>

## ✨ Funcionalidades

<table>
<tr>
<td width="50%" valign="top">

### 📝 Palpites
- Placar exato para cada jogo da fase de grupos
- Classificação (1º, 2º e melhores 3ºs) derivada automaticamente dos placares
- Indicação do vencedor em cada confronto do mata-mata, fase a fase
- Palpite de campeão e terceiro colocado

### 📊 Ranking & pontuação
- Apuração **100% automática**, recalculada a cada resultado novo
- Ranking geral com posição de cada participante
- Detalhamento ponto a ponto (breakdown do porquê de cada pontuação)

</td>
<td width="50%" valign="top">

### 🔴 Ao vivo
- Placar, tempo de jogo e eventos (gols, cartões, pênaltis) em tempo real
- Estatísticas da partida (posse, finalizações, escanteios etc.)
- Mini-ranking ao vivo: veja o impacto do resultado parcial na classificação

### ⚙️ Administração
- Gestão de participantes, partidas, resultados e overrides de chaveamento
- Sincronização automática de resultados via worker em segundo plano
- Controles do modo ao vivo (liga/desliga, orçamento de requisições, teste)
- Login simples por telefone, sem senha

</td>
</tr>
</table>

<br>

## 🧮 Como a pontuação é calculada

| Critério | Pontos |
|---|:---:|
| Resultado correto (vitória / empate / derrota) | **+3** |
| Placar exato de cada time | **+1** por time |
| Diferença de gols exata (com sinal) | **+2** |
| Diferença de gols em módulo | **+1** |
| Time classificado corretamente para a fase seguinte | **+3** por time |
| Acerto do time que disputa o 3º lugar | pontos da fase |
| Campeão certo | **+15** |
| Terceiro colocado certo | **+10** |

> Os pontos de um mesmo jogo podem se acumular — por exemplo, acertar o resultado *e* o placar exato *e* a diferença de gols soma tudo.

<br>

## 🔴 Acompanhamento ao vivo

O painel ao vivo consulta a [API-Football](https://www.api-football.com/) com um **modelo de orçamento dinâmico de requisições**, respeitando o limite do plano gratuito (100 req/dia):

```
reqPerGame = 92 ÷ jogos do dia          (entre 8 e 45 por jogo)
liveTTL    = 65% do orçamento → placar ao vivo
statsTTL   = 35% do orçamento → estatísticas
```

Quanto menos jogos no dia, mais frequente é a atualização — em um dia com 1 jogo, o placar atualiza a cada ~3,5 min; em um dia com 6 jogos, a cada ~11 min.

Um **worker em segundo plano** (`instrumentation.ts` + `lib/auto-sync-worker.ts`), iniciado junto com o servidor:

1. 🔁 Reinicia o processo (via PM2) no início de cada partida, garantindo um estado limpo do ranking ao vivo;
2. ✅ Sincroniza os resultados oficiais automaticamente após o término de cada jogo — sem qualquer intervenção manual.

<br>

## 🛠️ Stack técnica

| Camada | Tecnologia |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript |
| Estilo | [Tailwind CSS 4](https://tailwindcss.com) |
| Banco de dados | [Prisma 7](https://www.prisma.io) + PostgreSQL (via `@prisma/adapter-pg`) |
| Dados ao vivo | [API-Football](https://www.api-football.com/), com orçamento dinâmico e cache adaptativo |
| Sincronização | Worker próprio em segundo plano, orquestrado via PM2 |

> ⚠️ **Atenção:** este projeto usa o Next.js 16, que traz mudanças significativas em relação a versões anteriores. Antes de alterar código, consulte a documentação em `node_modules/next/dist/docs/`.

<br>

## 🚀 Rodando localmente

Pré-requisitos: **Node.js**, **[pnpm](https://pnpm.io)** e um banco **PostgreSQL**.

```bash
# 1. Instale as dependências
pnpm install

# 2. Configure a variável de ambiente DATABASE_URL apontando para o Postgres
#    e rode as migrations do Prisma
pnpm prisma migrate deploy

# 3. Inicie o servidor de desenvolvimento
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000) 🎉

### Scripts

| Comando | Descrição |
|---|---|
| `pnpm dev` | servidor de desenvolvimento |
| `pnpm build` | build de produção |
| `pnpm start` | inicia o build de produção |
| `pnpm lint` | checagem de lint |

Em [`scripts/`](scripts) também há utilitários de importação/migração de dados (`import-xlsx.ts`, `migrate-json-to-db.ts`), usados na migração inicial da planilha original para o banco de dados.

<br>

## 🗂️ Estrutura do projeto

```
app/
├─ admin/         # painel administrativo (participantes, partidas, resultados, palpites, controles do ao vivo)
├─ api/           # rotas da API (auth, palpites, ranking, resultados, ao vivo, admin)
├─ calendario/    # calendário de jogos
├─ jogos/         # lista de jogos por fase
├─ login/         # autenticação por telefone
├─ palpites/      # tela de preenchimento de palpites por participante
└─ ranking/       # ranking geral e ranking ao vivo

lib/               # regras de negócio: pontuação, chaveamento, dados, integração com API-Football, sync
prisma/            # schema e migrations do banco de dados
```

<br>

<div align="center">

Feito com 💚 e muito ⚽ para o bolão da **Agropesg**

</div>
