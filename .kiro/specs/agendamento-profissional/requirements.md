# Requirements Document

## Introduction

Sistema Web App de Agendamento Profissional (SaaS) para o nicho de beleza, focado na profissional Keyla. O sistema implementa um "Kill Switch" que bloqueia totalmente o acesso quando a assinatura do Mercado Pago está vencida ou não paga, tanto para a administradora quanto para os clientes.

## Glossary

- **Sistema**: O Web App de Agendamento Profissional
- **Keyla**: A profissional de beleza que administra o sistema (Admin)
- **Cliente**: Usuário público que acessa o sistema para agendar serviços
- **Assinatura**: Plano de pagamento mensal via Mercado Pago
- **Status_Assinatura**: Estado atual da assinatura ('active', 'inactive', 'expired', 'trial')
- **Trial**: Período de 7 dias grátis para novos usuários testarem o sistema
- **Kill_Switch**: Mecanismo de bloqueio total do sistema quando assinatura não está ativa
- **Middleware_Verificacao**: Componente que verifica status da assinatura antes de cada requisição
- **Webhook**: Endpoint que recebe notificações automáticas do Mercado Pago

## Requirements

### Requirement 1: Verificação de Status da Assinatura (Kill Switch)

**User Story:** Como proprietário do SaaS, eu quero que o sistema bloqueie totalmente o acesso quando a assinatura estiver vencida, para garantir que o serviço só funcione com pagamento em dia.

#### Acceptance Criteria

1. WHEN qualquer página é requisitada, THE Middleware_Verificacao SHALL consultar o status_assinatura no banco de dados antes de renderizar
2. WHILE status_assinatura == 'inactive' OR status_assinatura == 'expired', THE Sistema SHALL bloquear o carregamento de todas as funcionalidades
3. WHILE status_assinatura == 'active' OR status_assinatura == 'trial', THE Sistema SHALL permitir acesso normal às funcionalidades
4. WHEN Keyla tenta acessar o painel administrativo com assinatura inativa, THE Sistema SHALL redirecionar para a tela de pagamento do Mercado Pago
5. WHEN Keyla é redirecionada para pagamento, THE Sistema SHALL exibir a mensagem "Sua assinatura está pendente. Regularize para reativar seu sistema."
6. WHEN Cliente acessa o link de agendamento com assinatura inativa, THE Sistema SHALL exibir tela de "Serviço Temporariamente Indisponível"
7. WHEN Cliente vê tela de manutenção, THE Sistema SHALL impedir qualquer visualização da agenda ou agendamento

### Requirement 8: Período de Trial (7 Dias Grátis)

**User Story:** Como Keyla (nova usuária), eu quero ter 7 dias grátis para testar o sistema antes de pagar, para avaliar se o serviço atende às minhas necessidades.

#### Acceptance Criteria

1. WHEN uma nova conta é criada, THE Sistema SHALL definir status_assinatura como 'trial' e registrar data de início
2. WHILE status_assinatura == 'trial' AND dias_desde_criacao <= 7, THE Sistema SHALL permitir acesso completo a todas as funcionalidades
3. WHEN trial expira (dias_desde_criacao > 7) AND pagamento não foi realizado, THE Sistema SHALL atualizar status_assinatura para 'expired'
4. WHILE status_assinatura == 'trial', THE Sistema SHALL exibir banner informando dias restantes do trial
5. WHEN restam 2 dias ou menos do trial, THE Sistema SHALL exibir alerta mais proeminente incentivando assinatura
6. WHEN Keyla está em trial e realiza pagamento, THE Sistema SHALL atualizar status_assinatura para 'active'

### Requirement 2: Integração com Mercado Pago (Webhooks)

**User Story:** Como proprietário do SaaS, eu quero que o sistema atualize automaticamente o status da assinatura via webhooks do Mercado Pago, para que o acesso seja liberado imediatamente após o pagamento.

#### Acceptance Criteria

1. WHEN Mercado Pago envia notificação de pagamento aprovado, THE Webhook SHALL atualizar status_assinatura para 'active' no banco de dados
2. WHEN Mercado Pago envia notificação de pagamento recusado ou cancelado, THE Webhook SHALL atualizar status_assinatura para 'inactive'
3. WHEN Mercado Pago envia notificação de assinatura expirada, THE Webhook SHALL atualizar status_assinatura para 'expired'
4. WHEN status_assinatura é atualizado para 'active', THE Sistema SHALL liberar acesso automaticamente sem necessidade de ação manual
5. THE Webhook SHALL validar a autenticidade das notificações do Mercado Pago antes de processar

### Requirement 3: Ambiente do Cliente (Agendamento Público)

**User Story:** Como cliente, eu quero agendar um serviço de forma simples e rápida (máximo 3 cliques), para que eu possa marcar meu horário sem complicações.

#### Acceptance Criteria

1. WHILE status_assinatura == 'active', THE Sistema SHALL exibir a interface de agendamento para clientes
2. WHEN Cliente acessa a página de agendamento, THE Sistema SHALL exibir lista de serviços disponíveis
3. WHEN Cliente seleciona um serviço, THE Sistema SHALL exibir horários disponíveis para aquele serviço
4. WHEN Cliente seleciona um horário, THE Sistema SHALL solicitar apenas Nome e WhatsApp
5. WHEN Cliente confirma agendamento, THE Sistema SHALL disparar mensagem pronta para o WhatsApp da Keyla
6. THE Sistema SHALL permitir agendamento em no máximo 3 etapas (serviço -> horário -> dados)
7. THE Sistema SHALL exibir design feminino, luxuoso, com tons pastéis e rosê gold

### Requirement 4: Ambiente Administrativo (Painel da Keyla)

**User Story:** Como Keyla (admin), eu quero gerenciar meus serviços, horários e visualizar informações financeiras, para ter controle total do meu negócio.

#### Acceptance Criteria

1. WHEN Keyla acessa o painel administrativo, THE Sistema SHALL exigir autenticação segura
2. WHILE status_assinatura == 'active', THE Sistema SHALL permitir acesso completo ao painel administrativo
3. WHEN Keyla está autenticada, THE Sistema SHALL exibir dashboard com status da assinatura integrado via API do Mercado Pago
4. THE Sistema SHALL permitir gestão de serviços (criar, editar, excluir) com campos: nome, preço, duração
5. THE Sistema SHALL permitir gestão de horários disponíveis para agendamento
6. WHEN Keyla visualiza o dashboard, THE Sistema SHALL exibir informações financeiras da assinatura

### Requirement 5: Autenticação e Segurança

**User Story:** Como Keyla (admin), eu quero que meu painel seja protegido por login seguro, para que apenas eu tenha acesso às configurações do sistema.

#### Acceptance Criteria

1. WHEN usuário tenta acessar rotas administrativas sem autenticação, THE Sistema SHALL redirecionar para página de login
2. WHEN Keyla fornece credenciais válidas, THE Sistema SHALL criar sessão autenticada
3. WHEN Keyla fornece credenciais inválidas, THE Sistema SHALL exibir mensagem de erro e não permitir acesso
4. THE Sistema SHALL armazenar senhas de forma segura usando hash
5. WHEN sessão expira, THE Sistema SHALL redirecionar para página de login

### Requirement 6: Gestão de Agendamentos

**User Story:** Como Keyla (admin), eu quero visualizar e gerenciar os agendamentos realizados pelos clientes, para organizar minha agenda de trabalho.

#### Acceptance Criteria

1. WHILE status_assinatura == 'active', THE Sistema SHALL exibir lista de agendamentos no painel administrativo
2. WHEN novo agendamento é criado, THE Sistema SHALL armazenar: serviço, data/hora, nome do cliente, WhatsApp
3. THE Sistema SHALL impedir agendamentos em horários já ocupados
4. WHEN Keyla visualiza agendamentos, THE Sistema SHALL ordenar por data/hora

### Requirement 7: Persistência de Dados

**User Story:** Como proprietário do SaaS, eu quero que todos os dados sejam armazenados de forma segura e persistente, para garantir a integridade das informações.

#### Acceptance Criteria

1. THE Sistema SHALL armazenar dados de assinatura (status, data de vencimento, ID do Mercado Pago)
2. THE Sistema SHALL armazenar dados de serviços (nome, preço, duração, ativo)
3. THE Sistema SHALL armazenar dados de horários disponíveis
4. THE Sistema SHALL armazenar dados de agendamentos (serviço, cliente, data/hora, status)
5. THE Sistema SHALL armazenar credenciais da Keyla de forma segura
