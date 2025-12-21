-- Create password_reset_tokens table for custom reset system
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Enable RLS (Row Level Security)
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Admin can manage all tokens
CREATE POLICY "Admin can manage reset tokens" ON password_reset_tokens
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- Users can only see their own tokens (for validation)
CREATE POLICY "Users can view own reset tokens" ON password_reset_tokens
    FOR SELECT USING (user_id = auth.uid());

-- Allow insert for token generation (admin only)
CREATE POLICY "Admin can create reset tokens" ON password_reset_tokens
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- Allow update for marking tokens as used
CREATE POLICY "Allow token usage updates" ON password_reset_tokens
    FOR UPDATE USING (
        -- Either admin or the token owner
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (users.role IN ('admin', 'manager') OR users.id = password_reset_tokens.user_id)
        )
    );

-- Create function to automatically clean expired tokens
CREATE OR REPLACE FUNCTION clean_expired_reset_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM password_reset_tokens 
    WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean expired tokens (run daily)
-- Note: This requires pg_cron extension to be enabled
-- SELECT cron.schedule('clean-expired-tokens', '0 2 * * *', 'SELECT clean_expired_reset_tokens();');

COMMENT ON TABLE password_reset_tokens IS 'Stores custom reset password tokens for WhatsApp/SMS based password reset';
COMMENT ON COLUMN password_reset_tokens.token IS '6-character alphanumeric reset code';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration time (30 minutes from creation)';
COMMENT ON COLUMN password_reset_tokens.used IS 'Whether the token has been used for password reset';