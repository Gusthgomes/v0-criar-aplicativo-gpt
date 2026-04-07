-- Criar tabela de usuários com roles/permissões
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'visitor' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índice para email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Roles disponíveis: visitor, inspectors, admin, quality, master
-- visitor: permissão padrão, sem acesso (aguardando liberação)
-- inspectors: acesso a cadastro de teste e consulta
-- admin: acesso a consulta, relatório, comparativo, tempo real, dashboard, assistente
-- quality: acesso a consulta, relatório, tempo real, dashboard, exportar dados
-- master: acesso total + gerenciamento de usuários
