/**
 * push_subscriptions 테이블 마이그레이션 스크립트
 *
 * 사용법:
 *   node scripts/run-migration.mjs <DB_PASSWORD>
 *
 * DB 비밀번호는 Supabase Dashboard → Project Settings → Database → Database password 에서 확인
 *
 * 예시:
 *   node scripts/run-migration.mjs mypassword123
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lxbznjftbwdobkfcjzwl.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4YnpuamZ0Yndkb2JrZmNqendsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcxOTQ5NCwiZXhwIjoyMDg1Mjk1NDk0fQ.VgLZ3Khk1_SyPx8rjUq_ISC_bh3AG74R0iEUivKrW3c'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function checkTableExists() {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id')
    .limit(1)

  // 테이블이 없으면 error code 42P01 (undefined_table)
  if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
    return false
  }
  return true
}

async function main() {
  console.log('🔍 push_subscriptions 테이블 존재 여부 확인...')

  const exists = await checkTableExists()

  if (exists) {
    console.log('✅ push_subscriptions 테이블이 이미 존재합니다.')
    console.log('\n📋 Supabase Dashboard SQL Editor에서 아래 SQL을 실행해 주세요:')
    console.log('   https://supabase.com/dashboard/project/lxbznjftbwdobkfcjzwl/sql/new')
    return
  }

  console.log('❌ 테이블이 없습니다.')
  console.log('\n📋 아래 방법 중 하나로 테이블을 생성하세요:\n')
  console.log('방법 1: Supabase Dashboard SQL Editor')
  console.log('  URL: https://supabase.com/dashboard/project/lxbznjftbwdobkfcjzwl/sql/new')
  console.log('  파일: docs/push_subscriptions_migration.sql 내용을 붙여넣고 실행\n')
  console.log('방법 2: psql 직접 접속 (DB 비밀번호 필요)')
  console.log('  psql "postgresql://postgres.lxbznjftbwdobkfcjzwl:[DB_PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"')
  console.log('  \\i docs/push_subscriptions_migration.sql\n')
}

main().catch(console.error)
