-- 계정과 커미션 메뉴. 금액은 전부 원 단위 정수다 (원화에 소수점이 없다).

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  nickname text not null,
  -- 창작자 소개. 의뢰인이 누구에게 맡기는지 판단하는 자리라 커미션 상세에 보인다.
  bio text,
  created_at timestamptz not null default now()
);

-- 창작자가 여는 "커미션 메뉴". 한 창작자가 여러 개를 열 수 있다 (반신 / 전신 / 로고처럼).
create table commissions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles (id),

  title text not null check (length(trim(title)) between 1 and 60),
  description text not null check (length(trim(description)) >= 1),
  category text not null
    check (category in ('일러스트', '캐릭터 디자인', '로고·타이포', '글·소설', '음악·사운드', '기타')),

  -- 기본 가격. 의뢰를 받을 때 창작자가 이 값에서 조정해 최종가를 정한다.
  price integer not null check (price >= 1000),
  -- 수락한 날부터 완성까지 며칠인지. 수락 시각 + 이 값이 마감일이 된다.
  turnaround_days integer not null check (turnaround_days between 1 and 90),
  -- 동시에 진행할 수 있는 건수. 수락한 뒤 완료되기 전까지의 의뢰가 이 수를 넘지 못한다.
  max_slots integer not null check (max_slots between 1 and 20),

  -- 샘플 이미지 주소. 없어도 열 수 있지만 상세에서 "샘플 없음" 으로 보인다.
  sample_urls text[] not null default '{}',

  status text not null default 'open' check (status in ('open', 'closed')),

  created_at timestamptz not null default now()
);

create index commissions_status_created_at_idx on commissions (status, created_at desc);
create index commissions_creator_id_idx on commissions (creator_id);
