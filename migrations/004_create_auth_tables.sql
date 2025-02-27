-- Create roles table first since users reference it
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  profile_picture TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  role_id INTEGER REFERENCES roles(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create default admin role
INSERT INTO roles (name, description, permissions)
VALUES (
  'admin',
  'Administrator with full system access',
  '["manage_users", "manage_roles", "manage_items", "moderate_items"]'::jsonb
) ON CONFLICT (name) DO NOTHING;

-- Create default user role
INSERT INTO roles (name, description, permissions)
VALUES (
  'user',
  'Regular user with basic access',
  '["report_items", "view_items"]'::jsonb
) ON CONFLICT (name) DO NOTHING;
