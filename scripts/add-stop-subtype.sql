-- Add sub_type column to stops table for detailed categorization
ALTER TABLE stops ADD COLUMN IF NOT EXISTS sub_type VARCHAR(100);

-- Add comment explaining the column
COMMENT ON COLUMN stops.sub_type IS 'Subcategoria detalhada da parada (ex: Bot, Ind para Erro de montagem)';
