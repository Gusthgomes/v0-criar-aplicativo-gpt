-- Adiciona coluna material_code na tabela stops
ALTER TABLE stops ADD COLUMN IF NOT EXISTS material_code VARCHAR(15);
