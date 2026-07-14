'use strict';

// 데모용 샘플 데이터를 넣습니다. `npm run seed`
// 이미 데이터가 있으면 아무것도 하지 않습니다 (--force 로 강제 재시드).

const { db } = require('./db');

const force = process.argv.includes('--force');
const count = db.prepare('SELECT COUNT(*) AS n FROM companies').get().n;

if (count > 0 && !force) {
  console.log(`이미 고객사 ${count}곳이 있어 시드를 건너뜁니다. 강제로 하려면: node lib/seed.js --force`);
  process.exit(0);
}

if (force) {
  db.exec('DELETE FROM activities; DELETE FROM deals; DELETE FROM contacts; DELETE FROM companies;');
}

const insCompany = db.prepare(
  'INSERT INTO companies (name, industry, website, phone, memo) VALUES (?, ?, ?, ?, ?)'
);
const insContact = db.prepare(
  'INSERT INTO contacts (company_id, name, title, email, phone) VALUES (?, ?, ?, ?, ?)'
);
const insDeal = db.prepare(
  'INSERT INTO deals (company_id, contact_id, title, amount, stage, expected_close, owner) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
const insActivity = db.prepare(
  'INSERT INTO activities (deal_id, company_id, type, content) VALUES (?, ?, ?, ?)'
);

const companies = [
  ['(주)한빛유통', '유통', 'https://hanbit.example.com', '02-1234-5678', '수도권 중심 온·오프라인 유통사'],
  ['서울테크', 'IT/소프트웨어', 'https://seoultech.example.com', '02-2345-6789', 'SaaS 도입 검토 중'],
  ['그린푸드', '식품 제조', '', '031-345-6789', '친환경 식품 브랜드'],
  ['미래물류', '물류', 'https://mirae.example.com', '032-456-7890', '풀필먼트 파트너 후보'],
  ['달빛공방', '핸드메이드', '', '010-9876-5432', '입점 문의로 인바운드 유입'],
];

const companyIds = companies.map((c) => Number(insCompany.run(...c).lastInsertRowid));

const contacts = [
  [companyIds[0], '김민수', '구매팀장', 'minsu.kim@hanbit.example.com', '010-1111-2222'],
  [companyIds[0], '이서연', '구매담당', 'seoyeon.lee@hanbit.example.com', '010-2222-3333'],
  [companyIds[1], '박지훈', 'CTO', 'jihoon.park@seoultech.example.com', '010-3333-4444'],
  [companyIds[2], '최유진', '마케팅 이사', 'yujin.choi@greenfood.example.com', '010-4444-5555'],
  [companyIds[3], '정우성', '영업본부장', 'wsung.jung@mirae.example.com', '010-5555-6666'],
  [companyIds[4], '한지민', '대표', 'jimin.han@dalbit.example.com', '010-6666-7777'],
];

const contactIds = contacts.map((c) => Number(insContact.run(...c).lastInsertRowid));

const deals = [
  [companyIds[0], contactIds[0], '한빛유통 연간 공급 계약', 120000000, 'negotiation', '2026-08-15', '칸'],
  [companyIds[0], contactIds[1], '한빛유통 추석 기획전 제휴', 30000000, 'proposal', '2026-08-01', '칸'],
  [companyIds[1], contactIds[2], '서울테크 사내 복지몰 구축', 55000000, 'contacted', '2026-09-30', '칸'],
  [companyIds[2], contactIds[3], '그린푸드 공동 브랜딩 딜', 20000000, 'lead', '', '칸'],
  [companyIds[3], contactIds[4], '미래물류 풀필먼트 계약', 80000000, 'won', '2026-06-30', '칸'],
  [companyIds[4], contactIds[5], '달빛공방 프리미엄 입점', 5000000, 'lead', '', '칸'],
  [companyIds[1], contactIds[2], '서울테크 API 연동 PoC', 8000000, 'lost', '2026-05-31', '칸'],
];

const dealIds = deals.map((d) => Number(insDeal.run(...d).lastInsertRowid));

const activities = [
  [dealIds[0], companyIds[0], 'meeting', '2차 미팅 완료. 단가 5% 조정 요청 받음 — 내부 검토 후 회신 예정.'],
  [dealIds[0], companyIds[0], 'call', '김민수 팀장 통화. 계약서 초안 8월 초까지 요청.'],
  [dealIds[1], companyIds[0], 'email', '추석 기획전 제안서 v2 발송.'],
  [dealIds[2], companyIds[1], 'call', '박지훈 CTO와 첫 통화. 데모 일정 조율 중.'],
  [dealIds[3], companyIds[2], 'note', '전시회에서 명함 수령. 다음 주 콜드콜 예정.'],
  [dealIds[4], companyIds[3], 'meeting', '계약 체결 완료. 7월부터 물량 이관 시작.'],
  [dealIds[5], companyIds[4], 'email', '입점 안내 자료 발송.'],
];

for (const a of activities) insActivity.run(...a);

console.log(
  `시드 완료: 고객사 ${companyIds.length}, 연락처 ${contactIds.length}, 딜 ${dealIds.length}, 활동 ${activities.length}`
);
