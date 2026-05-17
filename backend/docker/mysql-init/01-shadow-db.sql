-- Shadow do Prisma Migrate (nome alinhado ao SHADOW_DATABASE_URL do .env.example).
-- Roda só na primeira inicialização do volume.
CREATE DATABASE IF NOT EXISTS batmotor_shadow;
