-- Enable UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES Table (linked to Supabase Auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. VEHICLES Table
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    registration_number TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('Car', 'SUV', 'Van', 'Luxury', 'Bus', 'Other')),
    image_url TEXT,
    daily_rate NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (daily_rate >= 0),
    refundable_deposit NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (refundable_deposit >= 0),
    allowed_km NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (allowed_km >= 0),
    extra_km_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (extra_km_rate >= 0),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Unavailable', 'Under Maintenance', 'Archived')),
    internal_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE
);

-- 3. VEHICLE RATE CARDS Table (for tracking historical price adjustments)
CREATE TABLE public.vehicle_rate_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    daily_rate NUMERIC(12,2) NOT NULL CHECK (daily_rate >= 0),
    refundable_deposit NUMERIC(12,2) NOT NULL CHECK (refundable_deposit >= 0),
    allowed_km NUMERIC(10,2) NOT NULL CHECK (allowed_km >= 0),
    extra_km_rate NUMERIC(10,2) NOT NULL CHECK (extra_km_rate >= 0),
    status TEXT NOT NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. QUOTATION NUMBER SEQUENCES Table
CREATE TABLE public.quotation_number_sequences (
    year INTEGER PRIMARY KEY,
    last_sequence INTEGER NOT NULL DEFAULT 0
);

-- 5. COMPANY DETAILS SETTINGS Table
CREATE TABLE public.company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL DEFAULT 'Thennakoon Tours (Pvt) Ltd',
    registration_number TEXT NOT NULL DEFAULT 'PV00312253',
    address TEXT NOT NULL DEFAULT '39 A, 1st Cross Street, Pagoda Road, Nugegoda',
    phone_numbers TEXT NOT NULL DEFAULT '+94 112 823 723, +94 777 273 820, +94 777 474 938',
    email TEXT NOT NULL DEFAULT 'info@thennakoontours.com',
    website TEXT NOT NULL DEFAULT 'thennakoontours.com',
    letterhead_image_url TEXT,
    letterhead_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. QUOTATION SETTINGS Table
CREATE TABLE public.quotation_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    heading TEXT NOT NULL DEFAULT 'Quotation',
    prefix TEXT NOT NULL DEFAULT 'QT',
    default_validity_hours INTEGER NOT NULL DEFAULT 24,
    default_currency TEXT NOT NULL DEFAULT 'LKR',
    default_tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    show_vehicle_image BOOLEAN NOT NULL DEFAULT TRUE,
    show_qr_code BOOLEAN NOT NULL DEFAULT TRUE,
    show_signature BOOLEAN NOT NULL DEFAULT FALSE,
    bank_account_name TEXT NOT NULL DEFAULT 'Thennakoon Tours (Pvt) Ltd',
    bank_account_number TEXT NOT NULL DEFAULT '100530013140',
    bank_name TEXT NOT NULL DEFAULT 'Nations Trust Bank',
    bank_branch TEXT NOT NULL DEFAULT 'Nugegoda',
    bank_swift_code TEXT NOT NULL DEFAULT 'NTBCLKLX',
    bank_payment_instructions TEXT NOT NULL DEFAULT 'Please find the account details below. Kindly ensure the payment is made on or before the due date to the mentioned account. Once the payment is completed, please WhatsApp the payment slip to the company contact number and mention the vehicle registration number as the reference.',
    default_special_notes TEXT[] NOT NULL DEFAULT ARRAY[
        '700km allowed.',
        'This quotation is valid for 24 hours only.',
        'Vehicles are subject to availability.',
        'To reserve a vehicle, a minimum LKR 50,000 advance is required.',
        'If a booking is cancelled after making the advance payment, the advance payment is non-refundable.',
        'Above rates exclude tax charges.'
    ],
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. QR CODE SETTINGS Table
CREATE TABLE public.qr_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_image_url TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    label TEXT DEFAULT 'WhatsApp Payment Slip',
    purpose TEXT NOT NULL DEFAULT 'Bank Payment' CHECK (purpose IN ('Bank Payment', 'Website', 'WhatsApp', 'Google Review', 'Custom')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. QUOTATIONS Table
CREATE TABLE public.quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_number TEXT NOT NULL UNIQUE,
    quotation_year INTEGER NOT NULL,
    quotation_sequence INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Generated', 'Sent', 'Accepted', 'Rejected', 'Expired', 'Cancelled')),
    quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    customer_address TEXT,
    company_name TEXT,
    customer_reference TEXT,
    rental_start_date DATE,
    rental_end_date DATE,
    rental_days INTEGER CHECK (rental_days >= 0),
    destination TEXT,
    pickup_location TEXT,
    dropoff_location TEXT,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    vehicle_snapshot JSONB NOT NULL,
    daily_rate NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (daily_rate >= 0),
    refundable_deposit NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (refundable_deposit >= 0),
    allowed_km NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (allowed_km >= 0),
    extra_km_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (extra_km_rate >= 0),
    rental_total NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (rental_total >= 0),
    additional_charges NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (additional_charges >= 0),
    discount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (grand_total >= 0),
    special_notes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    important_notes TEXT,
    terms_and_conditions TEXT,
    company_snapshot JSONB NOT NULL,
    bank_snapshot JSONB NOT NULL,
    qr_snapshot JSONB,
    prepared_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    internal_notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE
);

-- 9. QUOTATION ACTIVITY LOGS Table
CREATE TABLE public.quotation_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    change_summary TEXT NOT NULL
);

-- =======================================================================
-- FUNCTIONS & TRIGGERS
-- =======================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_quotation_settings_updated_at BEFORE UPDATE ON public.quotation_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_qr_settings_updated_at BEFORE UPDATE ON public.qr_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Safe transaction-level sequence increment
CREATE OR REPLACE FUNCTION public.generate_next_quotation_number(target_year INTEGER)
RETURNS JSONB AS $$
DECLARE
    next_seq INTEGER;
    q_number TEXT;
BEGIN
    -- Ensure the year exists in sequence counter
    INSERT INTO public.quotation_number_sequences (year, last_sequence)
    VALUES (target_year, 0)
    ON CONFLICT (year) DO NOTHING;

    -- Lock the row and increment the sequence
    UPDATE public.quotation_number_sequences
    SET last_sequence = last_sequence + 1
    WHERE year = target_year
    RETURNING last_sequence INTO next_seq;

    -- Format the sequence to 4 digits padded with zero (e.g. QT-2026-0001)
    q_number := 'QT-' || target_year || '-' || lpad(next_seq::TEXT, 4, '0');

    RETURN jsonb_build_object('sequence', next_seq, 'quotation_number', q_number);
END;
$$ LANGUAGE plpgsql;

-- =======================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =======================================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper to check user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE;

-- PROFILES POLICIES
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owner can do all on profiles"
    ON public.profiles FOR ALL TO authenticated
    USING (public.get_user_role() = 'owner')
    WITH CHECK (public.get_user_role() = 'owner');

CREATE POLICY "Admins can update other users except changing Owner and Admin role settings"
    ON public.profiles FOR ALL TO authenticated
    USING (public.get_user_role() = 'admin')
    WITH CHECK (
        public.get_user_role() = 'admin' AND 
        role != 'owner' AND 
        (SELECT role FROM public.profiles WHERE id = id) != 'owner'
    );

-- VEHICLES POLICIES
CREATE POLICY "Vehicles are viewable by authenticated users"
    ON public.vehicles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owner/Admin can manage vehicles"
    ON public.vehicles FOR ALL TO authenticated
    USING (public.get_user_role() IN ('owner', 'admin'))
    WITH CHECK (public.get_user_role() IN ('owner', 'admin'));

-- VEHICLE RATE CARDS POLICIES
CREATE POLICY "Rate cards are viewable by authenticated users"
    ON public.vehicle_rate_cards FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owner/Admin can manage rate cards"
    ON public.vehicle_rate_cards FOR ALL TO authenticated
    USING (public.get_user_role() IN ('owner', 'admin'))
    WITH CHECK (public.get_user_role() IN ('owner', 'admin'));

-- SETTINGS POLICIES
CREATE POLICY "Company settings are viewable by authenticated users" ON public.company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Company settings managed by Owner/Admin" ON public.company_settings FOR ALL TO authenticated USING (public.get_user_role() IN ('owner', 'admin')) WITH CHECK (public.get_user_role() IN ('owner', 'admin'));

CREATE POLICY "Quotation settings are viewable by authenticated users" ON public.quotation_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Quotation settings managed by Owner/Admin" ON public.quotation_settings FOR ALL TO authenticated USING (public.get_user_role() IN ('owner', 'admin')) WITH CHECK (public.get_user_role() IN ('owner', 'admin'));

CREATE POLICY "QR settings are viewable by authenticated users" ON public.qr_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "QR settings managed by Owner/Admin" ON public.qr_settings FOR ALL TO authenticated USING (public.get_user_role() IN ('owner', 'admin')) WITH CHECK (public.get_user_role() IN ('owner', 'admin'));

-- QUOTATIONS POLICIES
CREATE POLICY "Quotations are viewable by authenticated users"
    ON public.quotations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owner/Admin can do all on quotations"
    ON public.quotations FOR ALL TO authenticated
    USING (public.get_user_role() IN ('owner', 'admin'))
    WITH CHECK (public.get_user_role() IN ('owner', 'admin'));

CREATE POLICY "Staff can view and manage their own or active quotations, no delete"
    ON public.quotations FOR INSERT TO authenticated
    WITH CHECK (public.get_user_role() = 'staff');

CREATE POLICY "Staff can update draft quotations or quotations they created"
    ON public.quotations FOR UPDATE TO authenticated
    USING (
        public.get_user_role() = 'staff' AND 
        status = 'Draft' AND 
        (created_by = auth.uid() OR created_by IS NULL)
    )
    WITH CHECK (
        public.get_user_role() = 'staff' AND 
        status = 'Draft'
    );

-- LOGS POLICIES
CREATE POLICY "Logs viewable by authenticated users"
    ON public.quotation_activity_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Logs insertable by authenticated users"
    ON public.quotation_activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- =======================================================================
-- INITIAL SEED DATA
-- =======================================================================

-- Default Settings Rows
INSERT INTO public.company_settings (id, company_name, registration_number, address, phone_numbers, email, website, letterhead_enabled)
VALUES (
    'd3b07384-d113-4c91-9c6a-681b83d8e5df',
    'Thennakoon Tours (Pvt) Ltd',
    'PV00312253',
    '39 A, 1st Cross Street, Pagoda Road, Nugegoda',
    '+94 112 823 723, +94 777 273 820, +94 777 474 938',
    'info@thennakoontours.com',
    'thennakoontours.com',
    TRUE
) ON CONFLICT DO NOTHING;

INSERT INTO public.quotation_settings (
    id, heading, prefix, default_validity_hours, default_currency, default_tax_percentage,
    show_vehicle_image, show_qr_code, show_signature,
    bank_account_name, bank_account_number, bank_name, bank_branch, bank_swift_code,
    bank_payment_instructions
) VALUES (
    'e94d80a1-c7d6-4447-975f-fb36a5293671',
    'Quotation',
    'QT',
    24,
    'LKR',
    0.00,
    TRUE,
    TRUE,
    FALSE,
    'Thennakoon Tours (Pvt) Ltd',
    '100530013140',
    'Nations Trust Bank',
    'Nugegoda',
    'NTBCLKLX',
    'Please find the account details below. Kindly ensure the payment is made on or before the due date to the mentioned account. Once the payment is completed, please WhatsApp the payment slip to the company contact number and mention the vehicle registration number as the reference.'
) ON CONFLICT DO NOTHING;

INSERT INTO public.qr_settings (id, qr_image_url, enabled, label, purpose)
VALUES (
    'fa619d85-f5f4-42f7-b247-c0e86b24df41',
    NULL,
    TRUE,
    'WhatsApp Payment Slip',
    'WhatsApp'
) ON CONFLICT DO NOTHING;

-- Seed Initial Vehicles
INSERT INTO public.vehicles (name, brand, model, year, registration_number, category, daily_rate, refundable_deposit, allowed_km, extra_km_rate, status)
VALUES
('Toyota Axio', 'Toyota', 'Axio Non-Hybrid', 2008, 'WP KV-2008', 'Car', 7500.00, 50000.00, 700.00, 75.00, 'Active'),
('Toyota Prius', 'Toyota', 'Prius Hybrid', 2012, 'WP CAD-4521', 'Car', 8500.00, 50000.00, 700.00, 80.00, 'Active'),
('Toyota Prado', 'Toyota', 'Land Cruiser Prado', 2015, 'WP CAS-3212', 'SUV', 30000.00, 100000.00, 500.00, 150.00, 'Active'),
('Range Rover Sport', 'Land Rover', 'Range Rover Sport', 2018, 'WP CBA-9988', 'Luxury', 45000.00, 150000.00, 500.00, 200.00, 'Active')
ON CONFLICT DO NOTHING;
