-- Seed data for development and testing

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, role) 
VALUES ('admin@nonprofitmanager.com', '$2a$10$YourHashedPasswordHere', 'Admin', 'User', 'admin');

-- Note: You should hash the password properly using bcrypt before using this seed file
-- The password hash above is a placeholder and will not work
