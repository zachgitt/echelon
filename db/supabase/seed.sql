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
