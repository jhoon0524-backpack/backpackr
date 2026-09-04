-- 상품 사진과 후원 인증 이미지를 담을 자리.
--
-- 읽기는 공개다 — 사진은 어차피 목록·상세에서 누구에게나 보인다.
-- 쓰기 정책은 만들지 않는다. 업로드는 서버가 service_role 로만 하고,
-- service_role 은 RLS 를 지나간다. 브라우저에 쓰기 권한을 주면 아무나 저장소를 채운다.
--
-- 크기·형식은 여기서도 막고 앱에서도 막는다. 앱만 막으면 앱을 거치지 않는 경로가 뚫린다.
--
-- **`storage` 스키마가 없으면 조용히 건너뛴다.** 그 스키마는 Supabase 가 만들어 주는 것이고,
-- 테스트가 쓰는 순수 Postgres 에는 없다. 가드가 없으면 DB 테스트 12개 파일이 통째로 죽는다
-- (실제로 그렇게 만들었다).

do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'storage 스키마가 없다. Supabase 가 아닌 것으로 보고 건너뛴다.';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'product-photos', 'product-photos', true,
    5242880,  -- 5MB. lib/storage.ts 의 MAX_MB 와 같은 값이다
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  )
  on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  -- 공개 읽기. 정책이 없으면 public 버킷이어도 API 로는 안 읽힌다.
  execute 'drop policy if exists "상품 사진은 누구나 본다" on storage.objects';
  execute $p$
    create policy "상품 사진은 누구나 본다"
      on storage.objects for select
      to anon, authenticated
      using (bucket_id = 'product-photos')
  $p$;
end $$;
