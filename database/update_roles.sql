-- Update skrmmagetan@gmail.com to Admin
UPDATE users
SET role = 'admin'
WHERE id = 'ee5ddd1a-a5de-4c74-8a1b-aab726a750a5';

-- Update second user to Manager
UPDATE users
SET role = 'manager'
WHERE id = '1b7c6bea-44fb-433b-bd53-02f5f6d80bd8';

-- Verify the changes
SELECT id, email, role FROM users WHERE id IN ('ee5ddd1a-a5de-4c74-8a1b-aab726a750a5', '1b7c6bea-44fb-433b-bd53-02f5f6d80bd8');
