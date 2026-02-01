-- 1. 카테고리 테이블 RLS 정책 보완 (수정/삭제 권한 추가)
-- 이미 정책이 있는지 확인하고 없으면 추가합니다.

DO $$
BEGIN
    -- Update 정책
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'categories' AND policyname = 'Admins can update categories.'
    ) THEN
        CREATE POLICY "Admins can update categories."
        ON public.categories FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
        );
    END IF;

    -- Delete 정책
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'categories' AND policyname = 'Admins can delete categories.'
    ) THEN
        CREATE POLICY "Admins can delete categories."
        ON public.categories FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
        );
    END IF;
    
    -- Insert 정책 관리자로 제한 (기존에 authenticated로 되어 있었다면 수정)
    DROP POLICY IF EXISTS "Authenticated users can create categories." ON public.categories;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'categories' AND policyname = 'Admins can insert categories.'
    ) THEN
        CREATE POLICY "Admins can insert categories."
        ON public.categories FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
        );
    END IF;
END $$;

-- 2. 중복 데이터 정리 (가장 최근에 생성된 것 하나만 남기고 삭제)
DELETE FROM public.categories a
USING public.categories b
WHERE a.id < b.id 
  AND a.type = b.type 
  AND a.value = b.value;

-- 3. 유니크 제약 조건 추가 (향후 중복 방지)
-- 이미 제약 조건이 있는지 확인 후 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_type_value'
    ) THEN
        ALTER TABLE public.categories ADD CONSTRAINT unique_type_value UNIQUE (type, value);
    END IF;
END $$;
