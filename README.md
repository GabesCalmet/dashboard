# Upfront Portal

Sistema de gestão para escolas de inglês online: administração, coordenação
acadêmica, professores e alunos em um único portal, com autenticação,
controle de permissões por papel, agenda, financeiro, relatórios e histórico
de auditoria.

## Stack

- **Frontend:** Next.js (App Router) · TypeScript · TailwindCSS v4 · componentes
  no padrão Shadcn UI (Radix primitives escritos localmente, sem depender do
  registry remoto)
- **Backend:** Server Actions + Route Handlers do Next.js · Prisma ORM
- **Banco de dados:** PostgreSQL (Supabase)
- **Autenticação:** Supabase Auth (cookies via `@supabase/ssr`), com
  `Prisma.User` espelhando `auth.users` (mesmo `id`) para guardar papel,
  status e dados de perfil
- **Gráficos:** Recharts
- **Calendário:** FullCalendar (mês / semana / dia / lista)
- **Upload de arquivos:** Supabase Storage (bucket `avatars`)

## Papéis de acesso

| Papel | Pode |
|---|---|
| **Administrador** | tudo: cadastrar/editar/excluir alunos e professores, alterar planos/níveis, ver relatórios e financeiro completo, gerenciar usuários e permissões |
| **Coordenador** | cadastrar/editar alunos, ver agenda, professores, relatórios e progresso dos alunos — sem excluir usuários nem alterar permissões |
| **Professor** | dashboard próprio, ficha dos seus alunos, preencher relatório após cada aula, agenda própria |
| **Aluno** | dashboard próprio, progresso (nível, habilidades), histórico de aulas, estatísticas, materiais |

O controle de acesso é reforçado em três camadas: `middleware.ts` (sessão),
`requireRole()`/`requireUser()` em cada layout/página, e validação
novamente dentro de cada Server Action antes de tocar o banco.

## Configuração local

1. **Crie um projeto no [Supabase](https://supabase.com).**
2. Copie `.env.example` para `.env` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API)
   - `DATABASE_URL` (pooled, porta 6543) e `DIRECT_URL` (direta, porta 5432) —
     Project Settings → Database
3. No painel do Supabase, crie um bucket de **Storage** público chamado
   `avatars` (usado para foto de perfil de aluno/professor).
4. Aplique o schema no banco:
   ```bash
   npm install
   npm run db:push        # cria as tabelas a partir de prisma/schema.prisma
   ```
5. (Opcional, recomendado) Popule dados de demonstração — isso cria usuários
   reais no Supabase Auth via API admin, então precisa das credenciais
   configuradas acima:
   ```bash
   npm run db:seed
   ```
   Ao final, o script imprime os logins de demonstração (senha única:
   `Upfront@2026`) para Administrador, Coordenador, 2 Professores e 3 Alunos.
6. Rode o servidor:
   ```bash
   npm run dev
   ```

### Scripts úteis

- `npm run db:studio` — abre o Prisma Studio para inspecionar o banco
- `npm run db:migrate` — gera migrations versionadas (alternativa ao `db:push`
  para produção)
- `npm run build` / `npm run start` — build e execução em produção

## Como o cadastro de login funciona

Ao cadastrar um aluno ou professor, o backend cria automaticamente um usuário
no Supabase Auth (`supabase.auth.admin.createUser`) com uma senha temporária
gerada, e espelha `id/nome/email/papel` na tabela `users` do Postgres. Como
este ambiente não tem SMTP configurado, a senha temporária é exibida uma
única vez para quem cadastrou (toast na tela) — o ideal em produção é
conectar um provedor de e-mail no Supabase para envio automático do convite.

"Excluir" um aluno/professor/usuário **não apaga o registro do banco**: ele
desativa o login (flag `active=false` + ban no Supabase Auth) e some das
listagens ativas, mas todo o histórico de aulas, pagamentos e auditoria
permanece intacto — conforme o requisito de nunca apagar histórico.

## Segurança

- Senhas: gerenciadas inteiramente pelo Supabase Auth (nunca tocamos/hashamos
  senha na aplicação)
- Toda criação/edição/exclusão/promoção relevante gera um registro em
  `audit_logs` (com o nome/e-mail/papel do autor **denormalizados** no
  próprio registro, para que a trilha de auditoria sobreviva mesmo que a
  conta do autor seja desativada depois)
- **Atenção para produção:** o Prisma se conecta diretamente ao Postgres, não
  passa pelo PostgREST — ou seja, o Row Level Security do Supabase não está
  em vigor nessa arquitetura. Todo o controle de acesso está na camada da
  aplicação (Server Actions). Isso é normal para esse padrão (Prisma +
  Supabase-como-Postgres), mas reforce que nenhuma rota/Server Action nova
  seja criada sem repetir a checagem de papel.

## O que está implementado vs. preparado para o futuro

Totalmente funcional: autenticação e permissões, CRUD de alunos/professores,
agenda com FullCalendar e cores por status, relatório de aula pós-aula,
dashboard com KPIs e gráficos (admin/coordenador/professor/aluno), progresso
por nível e habilidades, financeiro (cobranças, inadimplência, fluxo de
caixa), notificações internas, exportação de relatórios em CSV (abre nativo
no Excel/Sheets), tema claro/escuro, busca global (⌘K), histórico de
auditoria.

Preparado no schema/infra, mas sem UI completa ainda (conforme pedido de
"deixar preparado" no briefing): exportação em PDF, integração com
Zoom/Meet/Teams, Google Calendar, WhatsApp, emissão de boletos/PIX e
gateways (Stripe/Mercado Pago/Asaas), certificados, biblioteca de materiais
(já existe listagem básica para alunos + modelo `Material`), quizzes/testes
de nivelamento (`Quiz`/`QuizQuestion`/`QuizAttempt`), gamificação
(`Achievement`/`StudentAchievement`), CRM educacional / funil de vendas
(`Lead`/`LeadInteraction`), app mobile e API REST pública.

Lembretes de aula (`/api/cron/lesson-reminders`), geração das próximas
semanas de aulas recorrentes (`/api/cron/generate-recurring-lessons`) e
geração mensal de cobranças (`generateMonthlyPayments`) existem como
rotinas prontas, mas precisam de um agendador externo (Vercel Cron,
Supabase `pg_cron`, GitHub Actions) para rodar automaticamente — não há
worker de cron dentro do Next.js
em si.
