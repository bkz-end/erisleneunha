-- Migration: Initial Schema for Agendamento Profissional
-- Requirements: 7.1, 7.2, 7.3, 7.4

-- Tabela de Configuração da Assinatura
-- Requirement 7.1: Armazenar dados de assinatura (status, data de vencimento, ID do Mercado Pago)
CREATE TABLE IF NOT EXISTS subscription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL DEFAULT 'trial',
  mercado_pago_id VARCHAR(100),
  trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT status_check CHECK (status IN ('active', 'inactive', 'expired', 'trial'))
);

-- Tabela de Admin (Erislene)
-- Requirement 7.5: Armazenar credenciais da Erislene de forma segura
CREATE TABLE IF NOT EXISTS admin_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Serviços
-- Requirement 7.2: Armazenar dados de serviços (nome, preço, duração, ativo)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration INTEGER NOT NULL, -- minutos
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Horários Disponíveis
-- Requirement 7.3: Armazenar dados de horários disponíveis
CREATE TABLE IF NOT EXISTS time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL, -- 0=Domingo, 6=Sábado
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  available BOOLEAN DEFAULT true,
  CONSTRAINT day_check CHECK (day_of_week >= 0 AND day_of_week <= 6)
);

-- Tabela de Agendamentos
-- Requirement 7.4: Armazenar dados de agendamentos (serviço, cliente, data/hora, status)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  client_name VARCHAR(100) NOT NULL,
  client_whatsapp VARCHAR(20) NOT NULL,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT booking_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_bookings_datetime ON bookings(date_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_subscription_status ON subscription(status);

-- Inserir registro inicial de assinatura (trial)
INSERT INTO subscription (status, trial_started_at)
VALUES ('trial', NOW())
ON CONFLICT DO NOTHING;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscription_updated_at
  BEFORE UPDATE ON subscription
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
