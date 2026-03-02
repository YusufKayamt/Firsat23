dfs-- ============================================================
-- FIRSAT 23 - MVP Veritabanı Şeması
-- Supabase SQL Editörüne yapıştırıp doğrudan çalıştırabilirsiniz.
-- ============================================================


-- ============================================================
-- 1. USERS (Kullanıcılar)
-- Supabase Auth'un kendi "auth.users" tablosuyla ilişkilendirilir.
-- Her kayıtta kullanıcının rolü, ismi ve telefonu tutulur.
-- ============================================================
CREATE TABLE public.users (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role        TEXT NOT NULL DEFAULT 'musteri' CHECK (role IN ('musteri', 'esnaf', 'admin')),
    isim        TEXT NOT NULL,
    telefon     TEXT UNIQUE,
    kayit_tarihi TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'Uygulama kullanıcıları. Supabase Auth ile 1-1 ilişkilidir.';


-- ============================================================
-- 2. SHOPS (İşletmeler)
-- Her işletme bir "esnaf" rolündeki kullanıcıya aittir.
-- Enlem/boylam ile konum bazlı sorgulara hazır hale getirilir.
-- onay_durumu: admin onaylamadan fırsat yayınlanamaz.
-- ============================================================
CREATE TABLE public.shops (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    dukkan_adi     TEXT NOT NULL,
    adres          TEXT,
    latitude       NUMERIC(10, 7),   -- Enlem  (örn: 38.6748)
    longitude      NUMERIC(10, 7),   -- Boylam (örn: 39.2233)
    onay_durumu    TEXT NOT NULL DEFAULT 'beklemede' CHECK (onay_durumu IN ('beklemede', 'onaylandi', 'reddedildi')),
    olusturma_zamani TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.shops IS 'Platforma kayıtlı işletmeler. Admin onayı gerektirir.';

-- Konum sorgularını hızlandırmak için index
CREATE INDEX idx_shops_location ON public.shops (latitude, longitude);


-- ============================================================
-- 3. OPPORTUNITIES (Fırsatlar)
-- Bir işletmenin anlık indirimli fırsatları.
-- kalan_stok = 0 olduğunda fırsat otomatik dolmuş sayılır.
-- ============================================================
CREATE TABLE public.opportunities (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id          UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    baslik           TEXT NOT NULL,
    normal_fiyat     NUMERIC(10, 2) NOT NULL CHECK (normal_fiyat >= 0),
    indirimli_fiyat  NUMERIC(10, 2) NOT NULL CHECK (indirimli_fiyat >= 0),
    toplam_stok      INTEGER NOT NULL CHECK (toplam_stok > 0),
    kalan_stok       INTEGER NOT NULL CHECK (kalan_stok >= 0),
    baslangic_zamani TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    bitis_zamani     TIMESTAMPTZ NOT NULL,
    aktif_mi         BOOLEAN NOT NULL DEFAULT TRUE,
    olusturma_zamani TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- İndirimli fiyat, normal fiyattan düşük olmalı
    CONSTRAINT indirim_kontrol CHECK (indirimli_fiyat < normal_fiyat),
    -- Kalan stok, toplam stoğu geçemez
    CONSTRAINT stok_kontrol CHECK (kalan_stok <= toplam_stok),
    -- Bitiş zamanı, başlangıçtan sonra olmalı
    CONSTRAINT zaman_kontrol CHECK (bitis_zamani > baslangic_zamani)
);

COMMENT ON TABLE public.opportunities IS 'Esnafların yayınladığı anlık indirim fırsatları.';

-- Aktif fırsatları hızlı çekmek için index
CREATE INDEX idx_opportunities_active ON public.opportunities (aktif_mi, bitis_zamani);


-- ============================================================
-- 4. CLAIMS (Yakalanan Fırsatlar / Siparişler)
-- Kullanıcı bir fırsatı "yakalar" → QR kod üretilir.
-- Esnaf QR'ı okutunca durum "kullanildi" olur.
-- ============================================================
CREATE TABLE public.claims (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    opportunity_id   UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
    qr_kod           TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    durum            TEXT NOT NULL DEFAULT 'yakalandi' CHECK (durum IN ('yakalandi', 'kullanildi', 'iptal')),
    islem_zamani     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Bir kullanıcı aynı fırsatı yalnızca 1 kez yakalayabilir
    CONSTRAINT tek_claim UNIQUE (user_id, opportunity_id)
);

COMMENT ON TABLE public.claims IS 'Kullanıcıların yakaladığı fırsatlar ve QR doğrulama bilgileri.';


-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Temel Güvenlik Kuralları
-- Supabase'de tablolar herkese açık değil; sadece yetkili
-- kullanıcılar kendi verilerine erişebilir.
-- ============================================================

ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims       ENABLE ROW LEVEL SECURITY;

-- USERS: Herkes kendi profilini okuyup güncelleyebilir
CREATE POLICY "Kendi profilini gör"       ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Kendi profilini güncelle"  ON public.users FOR UPDATE USING (auth.uid() = id);

-- SHOPS: Herkes onaylı dükkanları görebilir; esnaf kendi dükkanını yönetir
CREATE POLICY "Onaylı dükkanlar herkese açık"
    ON public.shops FOR SELECT USING (onay_durumu = 'onaylandi');

CREATE POLICY "Esnaf kendi dükkanını yönetir"
    ON public.shops FOR ALL USING (auth.uid() = user_id);

-- OPPORTUNITIES: Herkes aktif fırsatları görebilir; esnaf kendi fırsatlarını yönetir
CREATE POLICY "Aktif fırsatlar herkese açık"
    ON public.opportunities FOR SELECT USING (aktif_mi = TRUE AND bitis_zamani > NOW());

CREATE POLICY "Esnaf kendi fırsatlarını yönetir"
    ON public.opportunities FOR ALL
    USING (shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid()));

-- CLAIMS: Kullanıcı kendi claim'lerini görür; esnaf kendi dükkanının claim'lerini görür
CREATE POLICY "Kullanıcı kendi siparişlerini görür"
    ON public.claims FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Kullanıcı fırsat yakalayabilir"
    ON public.claims FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Esnaf kendi dükkanının siparişlerini görür"
    ON public.claims FOR SELECT
    USING (
        opportunity_id IN (
            SELECT o.id FROM public.opportunities o
            JOIN public.shops s ON s.id = o.shop_id
            WHERE s.user_id = auth.uid()
        )
    );

CREATE POLICY "Esnaf claim durumunu güncelleyebilir"
    ON public.claims FOR UPDATE
    USING (
        opportunity_id IN (
            SELECT o.id FROM public.opportunities o
            JOIN public.shops s ON s.id = o.shop_id
            WHERE s.user_id = auth.uid()
        )
    );