// ─────────────────────────────────────────────────────────────
// config.js — 데이터베이스(Supabase) 연결 정보
//
// ▶ GitHub에 올려서 배포할 때는 이 파일을 고칠 필요가 없습니다.
//   GitHub 저장소의 Settings → Secrets and variables → Actions → Variables 에
//   SUPABASE_URL, SUPABASE_ANON_KEY 를 넣으면 배포할 때 자동으로 채워집니다. (README 5단계)
//
// ▶ 두 값이 비어 있으면 "데모 모드"로 열립니다. (내 브라우저에만 임시 저장)
//
// ※ anon key 는 원래 공개되어도 되는 "공개용 키"입니다.
//   수정 권한은 데이터베이스 보안 규칙(승인된 이메일 확인)이 서버에서 지킵니다.
//   service_role 키(비밀 키)는 절대 여기에 넣지 마세요!
// ─────────────────────────────────────────────────────────────
window.SITE_CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
};
