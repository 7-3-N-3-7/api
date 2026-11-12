-- ============================================================================
-- PostgreSQL Init Script for Kill Bill & Apache Fineract (Shared business-db)
-- ============================================================================
SELECT 'CREATE DATABASE killbill'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'killbill')\gexec

SELECT 'CREATE DATABASE fineract_tenants'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fineract_tenants')\gexec

SELECT 'CREATE DATABASE fineract_default'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fineract_default')\gexec
