# Database Reset Guide

Since all current data is local test data, resetting gives us a clean slate for auth implementation.

## Option 1: Full Supabase Reset (Recommended)

This resets the entire Supabase instance including auth users:

```bash
# Stop Supabase
npm run supabase:stop

# Reset (this deletes everything and recreates from scratch)
npm run supabase:start

# Regenerate migrations from your schema
npm run db:generate

# Apply migrations
npm run db:migrate
```

**Result:** Fresh database with latest schema, no old data.

---

## Option 2: Keep Supabase, Reset Tables Only

If you want to keep Supabase running but just clear tables:

```bash
# Drop all data but keep schema
psql $DATABASE_URL -c "
TRUNCATE TABLE audit_logs, employees, departments, organizations CASCADE;
"
```

**Result:** Tables are empty but schema remains.

---

## Option 3: Drop and Recreate Schema

Most thorough without restarting Supabase:

```bash
# Drop all tables and enums
psql $DATABASE_URL -c "
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TYPE IF EXISTS audit_action CASCADE;
DROP TYPE IF EXISTS audit_entity_type CASCADE;
DROP TYPE IF EXISTS employee_status CASCADE;
"

# Reapply all migrations
npm run db:migrate
```

**Result:** Clean schema rebuild from migrations.

---

## After Reset: Apply New Schema

After resetting, apply the migration that adds `user_id`:

```bash
# Create the migration file
cat > db/migrations/0004_add_user_link.sql << 'EOF'
-- Add optional user_id column to link employees to auth users
ALTER TABLE employees ADD COLUMN user_id uuid;

-- Add foreign key constraint (nullable, so optional)
ALTER TABLE employees ADD CONSTRAINT employees_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure one user can only be linked to one employee
ALTER TABLE employees ADD CONSTRAINT employees_user_id_unique
  UNIQUE(user_id);

-- Add index for faster lookups
CREATE INDEX idx_employees_user_id ON employees(user_id);

COMMENT ON COLUMN employees.user_id IS 'Links employee to auth user. NULL if employee has not signed up yet.';
EOF

# Apply it
psql $DATABASE_URL -f db/migrations/0004_add_user_link.sql
```

---

## Add Test Seed Data

After reset, add minimal test data:

```bash
cat > db/supabase/seed.sql << 'EOF'
-- Insert test organizations with different domains
INSERT INTO organizations (id, name, slug, domain, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Test Company', 'test-company', 'testcompany.com', 'Test organization for development'),
  ('00000000-0000-0000-0000-000000000002', 'Demo Corp', 'demo-corp', 'democorp.com', 'Demo organization for testing')
ON CONFLICT (domain) DO NOTHING;

-- Insert departments for test company
INSERT INTO departments (id, name, description, organization_id) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Engineering', 'Software development team', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'Product', 'Product management', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000003', 'Sales', 'Sales team', '00000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;
EOF

# Load seed data
psql $DATABASE_URL -f db/supabase/seed.sql
```

---

## Verification

After reset and setup:

```bash
# Check schema
psql $DATABASE_URL -c "\d employees"
# Should show: user_id column (nullable)

# Check data
psql $DATABASE_URL -c "SELECT * FROM organizations;"
# Should show: 2 test orgs

psql $DATABASE_URL -c "SELECT * FROM departments;"
# Should show: 3 departments

psql $DATABASE_URL -c "SELECT COUNT(*) FROM employees;"
# Should show: 0 (empty, ready for signups)
```

---

## Recommended Flow

**Do this:**
```bash
# 1. Full reset
npm run supabase:stop
npm run supabase:start

# 2. Apply migrations (including the existing ones)
npm run db:migrate

# 3. Add user_id migration
psql $DATABASE_URL -f db/migrations/0004_add_user_link.sql

# 4. Add test seed data
psql $DATABASE_URL -f db/supabase/seed.sql

# 5. Verify
psql $DATABASE_URL -c "\d employees"
psql $DATABASE_URL -c "SELECT name, domain FROM organizations;"
```

**Result:** Clean database ready for auth implementation!
