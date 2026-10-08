# OrbiCore

**Plataforma de gestao inteligente para pequenos negocios.**

Painel completo que centraliza contratos, receita recorrente (MRR), pipeline de vendas, estoque, folha de pagamento e metas — tudo em uma interface visual moderna, pronta para uso.

Desenvolvido pela **Orbitamos**.

---

## O que o OrbiCore faz

| Modulo | Funcionalidade |
|---|---|
| **Dashboard** | Visao consolidada com cards de MRR, pipeline ponderado, risco de churn, concentracao de clientes e graficos cruzados |
| **Contratos** | Gestao de contratos recorrentes com calculo automatico de MRR por ano, trimestre e projecao futura |
| **Reunioes** | Pipeline de vendas com funil visual, performance por canal, alertas de retorno e taxa de conversao |
| **Produtos** | Cadastro com controle de estoque, custo, preco de venda, margem e alertas de reposicao |
| **Vendas** | Lancamento de vendas vinculadas a produtos com calculo automatico de lucro e margem |
| **Folha de Pagamento** | Calculo de salario com INSS e IRRF progressivos, DSR sobre comissao e home office |
| **Metas** | Definicao de metas anuais com acompanhamento mensal e trimestral |
| **Exportacao** | Export completo dos dados para Excel (.xlsx) |

### Simulador de comissão comercial

Em **Contratos e remuneração**, informe o valor mensal de um contrato. O simulador multiplica pelo prazo desse contrato (12 meses inicialmente, ajustável na própria simulação), mostra o valor bruto, cada tributo informado e o líquido estimado. Em seguida, compara a venda mensal com a meta (R$ 3.900 inicialmente), aplica as faixas de atingimento abaixo de 60%, 60%, 100%, 120% e 150% e calcula a comissão sobre o líquido ou bruto conforme a configuração. É possível somar um valor já vendido no mês ao atingimento; essa soma não aumenta a base de comissão do contrato simulado.

As configurações ficam no perfil e só são gravadas ao clicar em **Salvar configurações**. As taxas iniciais são ISS 5%, PIS 0,65%, COFINS 3%, IRRF da empresa 1,5% e CSLL 1%; são parâmetros editáveis de simulação, não apuração tributária. A Receita Federal indica PIS 0,65% e COFINS 3% nesse conjunto de retenções, embora os nomes aparecessem invertidos no print do pedido. O valor digitado no simulador não cria contrato nem altera dados de vendas. **Preencher comissão na folha abaixo** copia somente a comissão estimada para a folha em edição, que continua exigindo **Salvar** para gravar o mês; a folha aplica separadamente seus cálculos de DSR, INSS e IRRF pessoais. Os novos ajustes são opcionais no perfil JSONB, sem migration ou recálculo dos registros anteriores.

### Comissões por venda

Em **Cálculo de Remuneração**, escolha o mês/ano e o modo **Calcular por contratos e percentuais próprios**. É possível configurar faixas por valor do contrato, como "a partir de R$ 0, 5%" e "a partir de R$ 10.000, 7%". Ao informar o valor do contrato, o sistema aplica a faixa vigente; uma taxa manual no lançamento substitui a sugestão quando necessário. Esse método anterior permanece disponível independentemente do novo simulador por atingimento da meta. Como a planilha original não traz uma tabela de comissão, nenhuma taxa vem pré-cadastrada nesse método. A comissão é arredondada por lançamento e somada no mês.

O resultado mostra a comissão bruta, DSR, descontos adicionais atribuíveis à comissão e o líquido estimado acrescentado à folha. O total mensal inclui salário, home office e outros descontos, sem descontá-los duas vezes. O cálculo preserva as fórmulas da planilha original, com referência de 2026, inclusive sua redução simplificada de IRRF; não representa uma atualização fiscal nem substitui validação do contador/DP. Selecionar outro ano não atualiza as tabelas tributárias.

Os lançamentos de comissão são independentes dos contratos, das vendas da loja e do estoque. Nada é gravado ao abrir ou simular: use **Salvar** para atualizar somente a competência selecionada. Folhas antigas continuam manuais, com os mesmos valores e fórmulas. Alternar entre os modos preserva tanto o valor manual quanto os lançamentos, mas somente o modo escolhido entra na folha.

Os novos campos são opcionais no JSON existente: não há migração SQL, limpeza ou recálculo em lote. Cada novo lançamento pode receber o valor mensal e a duração do contrato (12 meses por padrão) ou o valor total; registros antigos continuam sendo interpretados como valor total. As faixas são aplicadas sobre o valor total do contrato e o percentual efetivamente usado fica registrado, de modo que editar faixas no futuro não reescreve comissões de meses anteriores. O backup JSON preserva faixas e lançamentos; o Excel inclui as abas **Comissões por Venda** e **Faixas de Comissão**, com valor informado, duração, total do contrato e origem da taxa. Os testes em `src/lib/commission.test.ts` cobrem cálculos, limites das faixas, compatibilidade com a folha original, isolamento entre competências e round-trip do backup.

## Stack

- **Framework:** Next.js 15 (App Router, Server Components)
- **Linguagem:** TypeScript
- **Estilizacao:** Tailwind CSS v4 + shadcn/ui
- **Graficos:** Recharts
- **Backend:** Supabase (Auth + PostgreSQL)
- **Export:** ExcelJS
- **Deploy:** Vercel

## Arquitetura

```
src/
  app/
    (auth)/login/       # Tela de login/cadastro
    (app)/              # Rotas protegidas (dashboard, contratos, etc.)
    api/cron/           # Endpoint keep-alive para Supabase free tier
    auth/callback/      # OAuth callback
  lib/
    supabase/           # Clients (browser, server, middleware)
    store.ts            # State management com dual-layer (localStorage + Supabase)
    types.ts            # Tipagem completa do dominio
    calculations.ts     # Funcoes de calculo (MRR, churn, concentracao, pipeline)
    seed-data.ts        # Dados iniciais de exemplo
    format.ts           # Formatacao (moeda BRL, datas, percentuais)
  components/
    ui/                 # Componentes shadcn/ui
    app-sidebar.tsx     # Navegacao principal
    store-provider.tsx  # Context provider global
  middleware.ts         # Protecao de rotas autenticadas
supabase/
  schema.sql            # Schema do banco (executar no SQL Editor)
```

**Persistencia:** Dual-layer — localStorage como cache rapido + Supabase como source of truth. Dados sincronizados automaticamente a cada operacao.

**Autenticacao:** Supabase Auth com email/senha. Middleware protege todas as rotas do app. RLS no banco garante isolamento por usuario.

## Setup

### Pre-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com) (free tier funciona)
- Conta na [Vercel](https://vercel.com) (para deploy)

### Instalacao

```bash
git clone <repo-url>
cd orbicore
npm install
```

### Configuracao do Supabase

1. Crie um projeto no Supabase
2. Execute o conteudo de `supabase/schema.sql` no SQL Editor
3. Em **Authentication > Providers > Email**, desabilite "Confirm email" para cadastro direto (opcional)
4. Copie a **URL** e **Anon Key** de **Project Settings > API**

### Variaveis de ambiente

Crie o arquivo `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
CRON_SECRET=uma-senha-aleatoria-para-proteger-o-cron
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

### Desenvolvimento

```bash
npm run dev
```

### Deploy (Vercel)

1. Conecte o repositorio na Vercel
2. Adicione as mesmas variaveis de ambiente no painel da Vercel
3. Deploy automatico a cada push na `main`

### Cron keep-alive (opcional)

Para evitar cold start no Supabase free tier, configure um cron externo (ex: [cron-job.org](https://cron-job.org)):

```
GET https://seu-dominio.vercel.app/api/cron?secret=sua-senha-do-cron
Frequencia: 1x por dia
```

## Licenca

Proprietario — Orbitamos. Todos os direitos reservados.
