# Implementation Plan: Agendamento Profissional

## Overview

Implementação do Web App de Agendamento Profissional (SaaS) com Next.js 14, Tailwind CSS e Supabase. O foco principal é o mecanismo de "Kill Switch" que bloqueia totalmente o sistema quando a assinatura não está ativa.

## Tasks

- [x] 1. Setup inicial do projeto e configuração do banco de dados
  - [x] 1.1 Criar projeto Next.js 14 com TypeScript e Tailwind CSS
    - Inicializar projeto com `create-next-app`
    - Configurar Tailwind com tema personalizado (tons pastéis e rosê gold)
    - Configurar estrutura de pastas (app router)
    - _Requirements: 3.7_

  - [x] 1.2 Configurar Supabase e criar schema do banco de dados
    - Criar projeto no Supabase
    - Executar migrations para criar tabelas (subscription, admin_user, services, time_slots, bookings)
    - Configurar variáveis de ambiente
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 1.3 Escrever teste de propriedade para persistência de dados
    - **Property 8: Round-Trip de Persistência de Dados**
    - **Validates: Requirements 6.2, 7.1, 7.2, 7.3, 7.4**

- [x] 2. Implementar middleware de verificação de assinatura (Kill Switch)
  - [x] 2.1 Criar serviço de consulta de status da assinatura
    - Implementar função `getSubscriptionStatus()` que consulta o banco
    - Retornar status: 'active', 'inactive', 'expired', ou 'trial'
    - Calcular dias restantes do trial quando aplicável
    - Implementar cache de curta duração para evitar consultas excessivas
    - _Requirements: 1.1, 8.1_

  - [x] 2.2 Implementar middleware Next.js para verificação
    - Criar middleware que intercepta todas as requisições
    - Verificar status antes de renderizar qualquer página
    - Permitir acesso se status == 'active' OU (status == 'trial' E dias <= 7)
    - Redirecionar admin para tela de pagamento se inativo/expirado
    - Renderizar tela de manutenção para cliente se inativo/expirado
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 8.2_

  - [x] 2.3 Implementar verificação automática de expiração do trial
    - Criar job/cron que verifica trials expirados
    - Atualizar status para 'expired' quando trial > 7 dias sem pagamento
    - _Requirements: 8.3_

  - [x] 2.4 Escrever teste de propriedade para bloqueio total
    - **Property 1: Bloqueio Total com Assinatura Inativa**
    - **Validates: Requirements 1.2, 1.4, 1.6, 1.7**

  - [x] 2.5 Escrever teste de propriedade para liberação automática
    - **Property 2: Liberação Automática com Assinatura Ativa ou Trial**
    - **Validates: Requirements 1.3, 3.1, 4.2, 8.2**

  - [x] 2.6 Escrever teste de propriedade para expiração do trial
    - **Property 13: Expiração Automática do Trial**
    - **Validates: Requirements 8.3**

- [x] 3. Checkpoint - Verificar Kill Switch funcionando
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implementar integração com Mercado Pago (Webhooks)
  - [x] 4.1 Criar endpoint de webhook para receber notificações
    - Implementar rota `/api/webhooks/mercadopago`
    - Validar assinatura HMAC do Mercado Pago
    - Parsear payload e identificar tipo de evento
    - _Requirements: 2.5_

  - [x] 4.2 Implementar lógica de atualização de status
    - Mapear eventos do MP para status do sistema (approved→active, rejected→inactive, expired→expired)
    - Atualizar banco de dados com novo status
    - Garantir liberação imediata após pagamento
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 4.3 Escrever teste de propriedade para webhook
    - **Property 3: Webhook Atualiza Status Corretamente**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [x] 4.4 Escrever teste de propriedade para validação de webhook
    - **Property 4: Validação de Autenticidade do Webhook**
    - **Validates: Requirements 2.5**

- [x] 5. Implementar sistema de autenticação
  - [x] 5.1 Criar serviço de autenticação
    - Implementar hash de senha com bcrypt
    - Implementar verificação de senha
    - Criar/validar sessões com JWT ou cookies seguros
    - _Requirements: 5.4, 7.5_

  - [x] 5.2 Criar página de login e middleware de autenticação
    - Implementar página `/admin/login`
    - Criar middleware para proteger rotas `/admin/*`
    - Redirecionar para login se não autenticado
    - _Requirements: 4.1, 5.1, 5.2, 5.3, 5.5_

  - [x] 5.3 Escrever teste de propriedade para proteção de rotas
    - **Property 5: Proteção de Rotas Administrativas**
    - **Validates: Requirements 4.1, 5.1**

  - [x] 5.4 Escrever teste de propriedade para autenticação
    - **Property 6: Autenticação Funciona Corretamente**
    - **Validates: Requirements 5.2, 5.3, 5.5**

  - [x] 5.5 Escrever teste de propriedade para hash de senhas
    - **Property 7: Senhas Armazenadas com Hash**
    - **Validates: Requirements 5.4, 7.5**

- [x] 6. Checkpoint - Verificar autenticação e webhooks
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implementar CRUD de serviços
  - [x] 7.1 Criar API routes para serviços
    - Implementar `GET /api/services` (listar)
    - Implementar `POST /api/services` (criar)
    - Implementar `PUT /api/services/[id]` (editar)
    - Implementar `DELETE /api/services/[id]` (excluir)
    - _Requirements: 4.4_

  - [x] 7.2 Criar interface de gestão de serviços no painel admin
    - Implementar página `/admin/services`
    - Formulário para criar/editar serviço (nome, preço, duração)
    - Lista de serviços com ações de editar/excluir
    - _Requirements: 4.4_

  - [x] 7.3 Escrever teste de propriedade para CRUD de serviços
    - **Property 11: CRUD de Serviços**
    - **Validates: Requirements 4.4**

- [x] 8. Implementar CRUD de horários
  - [x] 8.1 Criar API routes para horários
    - Implementar `GET /api/timeslots` (listar)
    - Implementar `POST /api/timeslots` (criar)
    - Implementar `PUT /api/timeslots/[id]` (editar)
    - Implementar `DELETE /api/timeslots/[id]` (excluir)
    - _Requirements: 4.5_

  - [x] 8.2 Criar interface de gestão de horários no painel admin
    - Implementar página `/admin/timeslots`
    - Formulário para definir horários por dia da semana
    - Visualização de grade de horários
    - _Requirements: 4.5_

  - [x] 8.3 Escrever teste de propriedade para CRUD de horários
    - **Property 12: CRUD de Horários**
    - **Validates: Requirements 4.5**

- [x] 9. Implementar sistema de agendamento (cliente)
  - [x] 9.1 Criar página de seleção de serviço
    - Implementar página `/agendar` com lista de serviços
    - Design feminino, luxuoso, tons pastéis e rosê gold
    - Serviços exibidos como cards clicáveis
    - _Requirements: 3.2, 3.7_

  - [x] 9.2 Criar página de seleção de horário
    - Implementar página `/agendar/[serviceId]`
    - Exibir calendário com horários disponíveis
    - Filtrar horários já ocupados
    - _Requirements: 3.3_

  - [x] 9.3 Criar formulário de dados do cliente
    - Implementar modal/página para Nome e WhatsApp
    - Validação de formato de WhatsApp
    - Botão de confirmação
    - _Requirements: 3.4, 3.6_

  - [x] 9.4 Implementar criação de agendamento e notificação WhatsApp
    - Criar agendamento no banco de dados
    - Gerar link de WhatsApp com mensagem pronta
    - Redirecionar para WhatsApp da Keyla
    - _Requirements: 3.5, 6.2_

  - [x] 9.5 Escrever teste de propriedade para conflito de horários
    - **Property 9: Prevenção de Conflito de Horários**
    - **Validates: Requirements 6.3**

- [x] 10. Implementar visualização de agendamentos (admin)
  - [x] 10.1 Criar página de listagem de agendamentos
    - Implementar página `/admin/bookings`
    - Listar agendamentos ordenados por data/hora
    - Exibir serviço, cliente, WhatsApp, status
    - _Requirements: 6.1, 6.4_

  - [x] 10.2 Escrever teste de propriedade para ordenação
    - **Property 10: Ordenação de Agendamentos**
    - **Validates: Requirements 6.4**

- [x] 11. Implementar dashboard administrativo
  - [x] 11.1 Criar página principal do dashboard
    - Implementar página `/admin`
    - Exibir status da assinatura (ativo/trial/inativo, data de vencimento)
    - Exibir dias restantes do trial quando aplicável
    - Exibir resumo de agendamentos do dia
    - Links para gestão de serviços, horários e agendamentos
    - _Requirements: 4.3, 4.6, 8.4_

  - [x] 11.2 Implementar banner de trial
    - Exibir banner com dias restantes quando em trial
    - Exibir alerta mais proeminente quando restam 2 dias ou menos
    - Incluir botão/link para página de assinatura
    - _Requirements: 8.4, 8.5_

- [x] 12. Implementar telas de bloqueio
  - [x] 12.1 Criar tela de manutenção (cliente)
    - Implementar página `/manutencao`
    - Design consistente com o tema
    - Mensagem "Serviço Temporariamente Indisponível"
    - _Requirements: 1.5_

  - [x] 12.2 Criar tela de pagamento pendente (admin)
    - Implementar página `/admin/pagamento-pendente`
    - Mensagem "Sua assinatura está pendente. Regularize para reativar seu sistema."
    - Link/botão para página de pagamento do Mercado Pago
    - _Requirements: 1.3, 1.4_

- [x] 13. Checkpoint final - Verificar sistema completo
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Todas as tasks são obrigatórias, incluindo testes de propriedade
- Cada task referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Testes de propriedade validam garantias universais de corretude
- Testes unitários validam exemplos específicos e casos de borda
