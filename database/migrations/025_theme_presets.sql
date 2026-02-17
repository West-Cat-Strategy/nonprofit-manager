-- Theme preset tables for template theming

CREATE TABLE IF NOT EXISTS theme_color_palettes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    colors JSONB NOT NULL,
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT theme_color_palettes_name_unique UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS theme_font_pairings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    heading_font VARCHAR(255) NOT NULL,
    body_font VARCHAR(255) NOT NULL,
    accent_font VARCHAR(255),
    heading_weights TEXT[] DEFAULT ARRAY['600', '700'],
    body_weights TEXT[] DEFAULT ARRAY['400', '500', '600'],
    font_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT theme_font_pairings_name_unique UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_theme_color_palettes_active ON theme_color_palettes(is_active);
CREATE INDEX IF NOT EXISTS idx_theme_font_pairings_active ON theme_font_pairings(is_active);
