/*
  # 新增院友管理欄位

  1. 新增枚舉類型
    - `residency_status` (在住狀態)
    - `nursing_level_type` (護理等級)
    - `admission_type_enum` (入住類型)

  2. 修改院友主表
    - 新增入住日期、退住日期
    - 新增護理等級、入住類型
    - 新增社會福利、在住狀態欄位

  3. 安全性
    - 維持現有的 RLS 策略
*/

-- 新增在住狀態枚舉類型
DO $$ BEGIN
  CREATE TYPE residency_status AS ENUM ('在住', '已退住');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 新增護理等級枚舉類型
DO $$ BEGIN
  CREATE TYPE nursing_level_type AS ENUM ('全護理', '半護理', '自理');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 新增入住類型枚舉類型
DO $$ BEGIN
  CREATE TYPE admission_type_enum AS ENUM ('私位', '買位', '院舍卷', '暫住');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 新增入住日期欄位
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = '院友主表' AND column_name = '入住日期'
  ) THEN
    ALTER TABLE "院友主表" ADD COLUMN "入住日期" date;
  END IF;
END $$;

-- 新增退住日期欄位
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = '院友主表' AND column_name = '退住日期'
  ) THEN
    ALTER TABLE "院友主表" ADD COLUMN "退住日期" date;
  END IF;
END $$;

-- 新增護理等級欄位
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = '院友主表' AND column_name = '護理等級'
  ) THEN
    ALTER TABLE "院友主表" ADD COLUMN "護理等級" nursing_level_type;
  END IF;
END $$;

-- 新增入住類型欄位
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = '院友主表' AND column_name = '入住類型'
  ) THEN
    ALTER TABLE "院友主表" ADD COLUMN "入住類型" admission_type_enum;
  END IF;
END $$;

-- 新增社會福利欄位
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = '院友主表' AND column_name = '社會福利'
  ) THEN
    ALTER TABLE "院友主表" ADD COLUMN "社會福利" jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 新增在住狀態欄位
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = '院友主表' AND column_name = '在住狀態'
  ) THEN
    ALTER TABLE "院友主表" ADD COLUMN "在住狀態" residency_status DEFAULT '在住';
  END IF;
END $$;

-- 為新欄位建立索引
CREATE INDEX IF NOT EXISTS "idx_院友主表_在住狀態" ON "院友主表" ("在住狀態");
CREATE INDEX IF NOT EXISTS "idx_院友主表_護理等級" ON "院友主表" ("護理等級");
CREATE INDEX IF NOT EXISTS "idx_院友主表_入住類型" ON "院友主表" ("入住類型");
CREATE INDEX IF NOT EXISTS "idx_院友主表_入住日期" ON "院友主表" ("入住日期");
CREATE INDEX IF NOT EXISTS "idx_院友主表_退住日期" ON "院友主表" ("退住日期");
CREATE INDEX IF NOT EXISTS "idx_院友主表_社會福利" ON "院友主表" USING gin ("社會福利");