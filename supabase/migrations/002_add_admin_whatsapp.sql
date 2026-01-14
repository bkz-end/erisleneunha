-- Migration: Add WhatsApp field to admin_user
-- Para o admin configurar seu número de WhatsApp

ALTER TABLE admin_user ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);

-- Tabela de configurações gerais (para futuras expansões)
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir configuração padrão do WhatsApp
INSERT INTO settings (key, value)
VALUES ('admin_whatsapp', '')
ON CONFLICT (key) DO NOTHING;
