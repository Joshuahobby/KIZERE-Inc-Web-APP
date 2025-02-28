-- Create registered items table
CREATE TABLE IF NOT EXISTS registered_items (
  id SERIAL PRIMARY KEY,
  unique_id TEXT NOT NULL UNIQUE,
  official_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  owner_id INTEGER REFERENCES users(id),
  registration_date TIMESTAMP NOT NULL DEFAULT NOW(),
  expiry_date TIMESTAMP,
  proof_of_ownership TEXT,
  pictures JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Add registration fields to documents
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS is_registered BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS registered_item_id INTEGER REFERENCES registered_items(id);

-- Add registration fields to devices
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS is_registered BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS registered_item_id INTEGER REFERENCES registered_items(id);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_registered_items_official_id ON registered_items(official_id);
CREATE INDEX IF NOT EXISTS idx_registered_items_owner_id ON registered_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_registered_items_status ON registered_items(status);
