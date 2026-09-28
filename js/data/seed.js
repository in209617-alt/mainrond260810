// ─────────────────────────────────────────────────────────────
// seed.js — 처음 시작할 때 들어가는 "기본 내용"
// 이 내용은 관리자 페이지의 [기본 콘텐츠 넣기] 버튼을 눌렀을 때
// 데이터베이스에 한 번 저장되고, 그 뒤로는 관리자 페이지에서 모두 수정합니다.
// (여기 있는 글자를 고쳐도 이미 저장된 홈페이지 내용은 바뀌지 않아요.)
// ─────────────────────────────────────────────────────────────
import { uid } from '../core/dom.js';

const S = 'assets/stage/';

export const DEFAULT_SETTINGS = {
  site: {
    title: '론드 보관소',
    subtitle: '두 사람의 관계와 이야기, 함께한 날들을 모아두는 개인 자료실',
    masthead: 'PRIVATE ARCHIVE · VOL. 01',
    footer: '모든 기록은 조심스럽게 보관됩니다.',
  },
  theme: {
    primary: '#1c1a17', // 메인 색상 (머리글·어두운 면)
    secondary: '#e4dab9', // 보조 색상 (종이 색)
    accent: '#b3362b', // 포인트 색상 (붉은 강조)
    background: '#121110', // 배경 색상
    text: '#2b261f', // 글자 색상 (종이 위 글자)
    fontTitle: 'Song Myung',
    fontBody: 'Gowun Batang',
    fontLabel: 'Special Elite',
    fontHand: 'Nanum Pen Script',
    bgImage: '',
    bgOverlay: 0.72,
    grid: true,
    grain: true,
  },
  home: {
    sections: [
      { key: 'hero', on: true, size: 'l' },
      { key: 'dday', on: true, size: 's' },
      { key: 'music', on: true, size: 's' },
      { key: 'duo', on: true, size: 'full' },
      { key: 'now', on: true, size: 'full' },
      { key: 'stage', on: true, size: 'full' },
      { key: 'note', on: false, size: 'full' },
    ],
    hero: { image: '', caption: '대표 이미지를 관리자 페이지에서 올려주세요', label: 'FRONT PAGE' },
    dday: { start: '2026-08-10', label: '함께한 날', note: '처음 기록을 시작한 날부터' },
    music: { title: '오늘의 음악', artist: '관리자 페이지에서 음악 링크를 넣어주세요', url: '', cover: '' },
    duo: {
      title: '두 사람',
      items: [
        { name: '캐릭터 A', tag: 'CHARACTER · 01', bio: '짧은 소개를 적어주세요.', photo: '', sd: '' },
        { name: '캐릭터 B', tag: 'CHARACTER · 02', bio: '짧은 소개를 적어주세요.', photo: '', sd: '' },
      ],
    },
    stage: {
      title: '산책 기록',
      caption: '오늘도 숲길을 걷는 두 사람',
      filter: true,
      speed: 1,
      height: 11,
      chars: [
        { name: 'A', sheet: S + 'characters/player1.png', fw: 16, fh: 24, frames: 4, order: 'down,up,left,right' },
        { name: 'B', sheet: S + 'characters/player2.png', fw: 16, fh: 24, frames: 4, order: 'down,up,left,right' },
      ],
      ground: [S + 'tiles/grass_1.png', S + 'tiles/grass_2.png', S + 'tiles/grass_3.png', S + 'tiles/grass_4.png'],
      groundDark: [S + 'tiles/grass_dark_1.png', S + 'tiles/grass_dark_2.png'],
      path: [S + 'tiles/path_1.png', S + 'tiles/path_2.png'],
      trees: [S + 'objects/tree_1.png', S + 'objects/tree_2.png', S + 'objects/tree_apple.png', S + 'objects/pine.png'],
      smalls: [S + 'objects/bush.png', S + 'objects/bush_berry.png', S + 'objects/rock.png', S + 'objects/stump.png'],
      decor: [S + 'decor/flower_pink.png', S + 'decor/flower_purple.png', S + 'decor/flower_white.png', S + 'decor/flower_yellow.png', S + 'decor/mushroom.png'],
      leaves: [S + 'effects/leaf_1.png', S + 'effects/leaf_2.png'],
      shadow: S + 'effects/shadow.png',
      heart: '',
    },
    now: {
      title: '두 사람은 지금 무엇을 하고 있을까?',
      sd1: '',
      sd2: '',
      hours: 3,
      pinned: '',
      phrases: [
        '둘은 같이 산책하고 있어요.',
        '같이 비를 맞고 있어요.',
        '같이 던전에 갔어요.',
        '오늘 둘은 라멘을 먹었어요.',
        '오늘은 가론이 아픈 것 같아요.',
        '놀드가 던전에서 다쳐서 돌아왔어요.',
        '둘은 솜사탕을 먹었어요.',
      ],
    },
    note: { title: '편집자의 말', text: '이곳은 두 사람의 기록을 모아두는 작은 자료실입니다.' },
  },
  decorLibrary: [
    'assets/deco/paperclip.svg',
    'assets/deco/tape.svg',
    'assets/deco/stamp.svg',
    'assets/deco/tag.svg',
    'assets/deco/photo-corner.svg',
    'assets/deco/heart.svg',
  ],
  paperLibrary: ['assets/paper/paper-cream.webp', 'assets/paper/paper-grid.webp'],
};

/** 캐릭터란(종이) 기본 요소 */
function paperElements(which) {
  const name = which === 0 ? '캐릭터 A' : '캐릭터 B';
  const no = which === 0 ? '01' : '02';
  return [
    { id: uid(), type: 'text', x: 10, y: 5, w: 62, h: 6, r: 0, z: 2, text: `PERSONNEL FILE — No. ${no}`, font: 'label', size: 3.1, color: '#2b261f', align: 'left' },
    { id: uid(), type: 'image', x: 54, y: 12, w: 36, h: 30, r: 2, z: 3, src: '', frame: 'photo' },
    { id: uid(), type: 'image', x: 76, y: 7, w: 9, h: 20, r: 10, z: 5, src: 'assets/deco/paperclip.svg', frame: 'none' },
    { id: uid(), type: 'text', x: 10, y: 15, w: 42, h: 9, r: 0, z: 2, text: name, font: 'title', size: 7.5, color: '#1c1a17', align: 'left' },
    { id: uid(), type: 'text', x: 10, y: 25, w: 42, h: 14, r: 0, z: 2, text: '나이 · 생일 · 키\n간단한 프로필을 적어주세요.', font: 'label', size: 2.8, color: '#3b342a', align: 'left' },
    { id: uid(), type: 'text', x: 10, y: 47, w: 80, h: 30, r: 0, z: 2, text: '이곳은 자유롭게 꾸미는 공간입니다.\n\n관리자로 로그인한 뒤 [편집 모드]를 켜면\n글상자·사진·장식을 추가하고 위치와 크기를 바꿀 수 있어요.', font: 'body', size: 3.2, color: '#2b261f', align: 'left' },
    { id: uid(), type: 'text', x: 52, y: 82, w: 42, h: 8, r: -6, z: 4, text: '메모: 좋아하는 것', font: 'hand', size: 4.6, color: '#8c2a22', align: 'center' },
    { id: uid(), type: 'image', x: 8, y: 78, w: 24, h: 18, r: -8, z: 4, src: 'assets/deco/stamp.svg', frame: 'none' },
  ];
}

/** 처음 시작할 때 넣을 기본 데이터 전체 */
export function buildSeed() {
  const pages = [
    { id: uid(), slug: '', title: '메인', type: 'home', description: '', cover: '', visible: true, sort_order: 0, content: {} },
    { id: uid(), slug: 'characters', title: '등장인물', type: 'papers', description: '등장인물 소개란', cover: '', visible: true, sort_order: 1, content: {} },
    { id: uid(), slug: 'series', title: '시리즈', type: 'series', description: 'AU 정리 공간', cover: '', visible: true, sort_order: 2, content: {} },
    { id: uid(), slug: 'gallery', title: '갤러리', type: 'gallery', description: '그림과 사진을 모아두는 곳', cover: '', visible: true, sort_order: 3, content: {} },
    { id: uid(), slug: 'log', title: '로그', type: 'log', description: '지금까지의 이야기를 기록하는 곳', cover: '', visible: true, sort_order: 4, content: {} },
  ];
  const byType = (t) => pages.find((p) => p.type === t).id;

  const papers = [0, 1].map((i) => ({
    id: uid(),
    page_id: byType('papers'),
    sort_order: i,
    title: i === 0 ? '기록지 1' : '기록지 2',
    background: DEFAULT_SETTINGS.paperLibrary[i],
    aspect: 0.75,
    elements: paperElements(i),
  }));

  const series = [
    { title: '본편', subtitle: 'ORIGINAL', year: '2026', spine_color: '#2a2622', label_color: '#e4dab9', summary: '두 사람의 기본 세계관.' },
    { title: '학원 AU', subtitle: 'SCHOOL DAYS', year: '2026', spine_color: '#8c2a22', label_color: '#efe6c8', summary: '같은 반이 된 두 사람의 이야기.' },
    { title: '탐정 AU', subtitle: 'CASE FILE', year: '1942', spine_color: '#3d4a52', label_color: '#e4dab9', summary: '비 오는 도시, 사무소의 두 사람.' },
  ].map((s, i) => ({
    id: uid(),
    page_id: byType('series'),
    sort_order: i,
    cover: '',
    blocks: [
      { id: uid(), type: 'heading', text: '개요' },
      { id: uid(), type: 'text', text: '이곳에 시리즈 설명과 본문을 자유롭게 적어주세요.\n관리자 페이지에서 사진과 그림도 넣을 수 있어요.' },
    ],
    ...s,
  }));

  const posts = [
    {
      id: uid(),
      page_id: byType('log'),
      title: '첫 번째 기록',
      date: '2026-08-10',
      cover: '',
      excerpt: '기록을 시작한 날.',
      blocks: [
        { id: uid(), type: 'text', text: '이곳은 로그(블로그) 공간입니다.\n관리자 페이지 → 로그 → [새 글 쓰기]에서 제목, 날짜, 사진과 본문을 자유롭게 섞어 쓸 수 있어요.' },
      ],
    },
  ];

  const gallery_categories = ['로그', '커미션'].map((name, i) => ({ id: uid(), page_id: byType('gallery'), name, sort_order: i }));

  return { settings: DEFAULT_SETTINGS, pages, papers, series, posts, gallery_categories, gallery_images: [] };
}

/** 새 페이지를 만들 때 고를 수 있는 형태 */
export const PAGE_TYPES = {
  custom: { label: '자유 글 페이지', help: '제목·설명·본문(글과 사진)을 자유롭게 쓰는 페이지' },
  papers: { label: '기록철 (종이 꾸미기)', help: '등장인물 페이지처럼 종이 위에 글·사진을 자유 배치' },
  series: { label: 'DVD 선반 (시리즈)', help: '시리즈 페이지처럼 DVD 케이스로 항목을 모아보기' },
  gallery: { label: '갤러리', help: '카테고리별 이미지 세로 피드' },
  log: { label: '로그 (블로그)', help: '날짜별 글 목록과 본문' },
  home: { label: '메인', help: '메인 화면 (하나만 존재)' },
};
