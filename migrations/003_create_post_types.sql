
-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  nid TEXT NOT NULL UNIQUE,
  picture TEXT,
  phone_number TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
  id SERIAL PRIMARY KEY,
  full_names TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  primary_contact TEXT NOT NULL,
  secondary_contact TEXT,
  notification_preferences JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  unique_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  last_location TEXT NOT NULL,
  owner_info JSONB,
  reported_by INTEGER REFERENCES agents(id),
  reported_at TIMESTAMP NOT NULL DEFAULT NOW(),
  moderated BOOLEAN NOT NULL DEFAULT FALSE,
  moderated_by INTEGER REFERENCES agents(id),
  moderated_at TIMESTAMP
);

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  unique_id TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  brand_model TEXT NOT NULL,
  serial_number TEXT,
  description TEXT NOT NULL,
  picture TEXT,
  owner_info JSONB,
  last_location TEXT NOT NULL,
  status TEXT NOT NULL,
  reported_by INTEGER REFERENCES agents(id),
  reported_at TIMESTAMP NOT NULL DEFAULT NOW(),
  moderated BOOLEAN NOT NULL DEFAULT FALSE,
  moderated_by INTEGER REFERENCES agents(id),
  moderated_at TIMESTAMP
);
