export const meta = {
  name: 'cos-seal-review',
  description: 'Adversarial multi-dimension review of the COS SEAL static homepage (a11y, responsive robustness, content accuracy, code quality)',
  phases: [
    { title: 'Review', detail: '4 dimensions read the real files in parallel' },
    { title: 'Verify', detail: 'confirm each finding is real and worth fixing' },
  ],
}

const FILES = `
Files to review (read them with the Read tool):
- /Users/kimhanwook/Desktop/cos-seal001/index.html
- /Users/kimhanwook/Desktop/cos-seal001/css/styles.css
- /Users/kimhanwook/Desktop/cos-seal001/js/main.js
Context: hand-built static one-page Korean B2B corporate homepage. Dark hero + light body + dark footer. Pretendard font via CDN. Smooth-scroll, IntersectionObserver reveal, scroll-progress bar, count-up stats, frosted sticky nav with white->color logo swap, grayscale->color partner logo wall, Google Maps keyless iframe embed, KakaoTalk consult buttons (data-kakao, channel URL not yet wired). Measured at 390px: scrollWidth==clientWidth (no horizontal overflow), logo-wall is 2 columns. Verified visually on desktop+mobile and it looks good. The review must find ONLY real, concrete defects — not style opinions or speculative rewrites.
`

const CANONICAL = `
CANONICAL SOURCE DATA (the site must match this EXACTLY; flag any mismatch or fabrication):
- 회사: (주)씨오에스씰 / COS SEAL — 20년(20 YEARS), 통합 씰링 파트너. (NO founding year should be invented.)
- 대표: 강남욱
- 주소: 경기도 안양시 동안구 흥안대로427번길 47, 706호 (관양동, 인덕원 LDC비즈타워)
- 이메일: nukang72@hotmail.com
- TEL: 031 424 1627 / FAX: 031 424 1628
- 사업자등록번호: 240-81-03389
- Copyright 2026 (주)씨오에스씰
- Partners: NAK, NOK, MEIWA, MORISEI, SAKAGAMI, FREUDENBERG, SKF (외 각종 국산/수입 씰). NAK = 대표 수입 브랜드(가성비/금형비 절감 핵심).
- Clients: SPG, IGB
- Products: Oil Seal(건설기계용/농기계용 미션·유압장치/산업용 감속기·펌프·모터), Packing(유공압용 U·V packing), O-Ring(O/X/V ring)
- 강점 3가지: ① NAK 가성비(비용절감+고품질) ② 단순납품 넘어 씰 연구·개발·솔루션(올인원) ③ NAK 금형개발비 절감 + 검사성적서·품질보증서 신속 제공
`

phase('Review')

const FINDINGS_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['dimension','findings'],
  properties: {
    dimension: { type: 'string' },
    findings: { type: 'array', items: { type: 'object', additionalProperties: false,
      required: ['title','severity','file','location','problem','fix'],
      properties: {
        title: { type: 'string' },
        severity: { type: 'string', enum: ['critical','high','medium','low'] },
        file: { type: 'string' },
        location: { type: 'string', description: 'selector / line hint / snippet' },
        problem: { type: 'string', description: 'concrete defect and why it matters' },
        fix: { type: 'string', description: 'specific change to make' },
      } } },
  },
}

const DIMS = [
  { key: 'a11y', prompt: `Review for ACCESSIBILITY & semantics ONLY. Check: keyboard focus visibility (is there a visible :focus / :focus-visible style anywhere? buttons/links/nav-toggle), aria correctness (nav-toggle aria-expanded toggling, mobile menu, decorative imgs alt=""), heading order, color contrast of low-opacity text on dark/light (e.g. rgba white .5-.6 on navy, muted #8A93A6 on white), the map iframe title, prefers-reduced-motion coverage, hit-target sizes, lang. Flag the ABSENCE of focus-visible styling if missing — that is a real a11y defect.` },
  { key: 'responsive', prompt: `Review for RESPONSIVE & CSS ROBUSTNESS ONLY. Check: any element that can overflow horizontally at 360-414px (long unbroken strings like the email/address, the hero-sub, eyebrow), the hero-glow absolute blobs (are they safely clipped by overflow:hidden?), backdrop-filter fallback when unsupported, the logo-swap opacity logic correctness, sticky header height vs scroll-margin anchor offset (does smooth-scroll land sections correctly under the 76px fixed header?), tap targets on mobile, the mobile menu open/close + body scroll lock, very small (<=360px) and large (>=1600px) layouts, image aspect ratios in logo-wall. Confirm whether the smooth-scroll JS offset (-72) matches the real header height (76px).` },
  { key: 'content', prompt: `Review for CONTENT ACCURACY ONLY against the canonical data below. Verify every piece of company data (대표, 주소, email, tel, fax, 사업자등록번호, copyright), all 7 partner names + alt text, both client names, all product categories/applications, and the 3 strengths. Flag ANY typo, mismatch, missing item, or fabricated claim (e.g. invented founding year, invented certifications, wrong digits). Also check Korean spelling/spacing in the copy.\n${CANONICAL}` },
  { key: 'code', prompt: `Review for CODE QUALITY / CORRECTNESS / SEO / PERF ONLY. Check: HTML validity (unclosed tags, duplicate ids, invalid nesting), the count-up + IntersectionObserver logic (does it set final value correctly? what if data-count missing?), the scroll-progress math, font loading (Pretendard CDN: is it static css importing a big file? FOUT/preload), missing favicon/og issues, lazy-loading correctness, JS errors/edge cases (null guards), the KakaoTalk data-kakao fallback behavior (clicking a [data-kakao] anchor with href="#" jumps to top — is that handled?), meta/SEO completeness, duplicate or dead CSS. Be concrete.` },
]

const reviews = (await parallel(DIMS.map(d => () =>
  agent(`${d.prompt}\n\n${FILES}\n\nReturn ONLY real, concrete, actionable defects you can point to in the actual files. If a dimension is clean, return an empty findings array. Do NOT invent problems or propose subjective restyling.`,
    { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS_SCHEMA, agentType: 'Explore' })
))).filter(Boolean)

const allFindings = reviews.flatMap(r => (r.findings||[]).map(f => ({ ...f, dimension: r.dimension })))

phase('Verify')

const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['isReal','severityConfirmed','verdict','recommendedFix'],
  properties: {
    isReal: { type: 'boolean', description: 'true only if you independently confirmed the defect exists in the actual file' },
    severityConfirmed: { type: 'string', enum: ['critical','high','medium','low','not-a-bug'] },
    verdict: { type: 'string', description: 'why real or not, citing the actual code' },
    recommendedFix: { type: 'string' },
  },
}

const verified = await parallel(allFindings.map(f => () =>
  agent(`Independently verify this claimed defect by READING the actual file. Default to isReal=false unless you can cite the exact code that proves the defect. Reject style opinions and speculative rewrites.\n\nCLAIM (${f.dimension} / ${f.severity}): ${f.title}\nFILE: ${f.file}\nLOCATION: ${f.location}\nPROBLEM: ${f.problem}\nPROPOSED FIX: ${f.fix}`,
    { label: `verify:${f.title.slice(0,32)}`, phase: 'Verify', schema: VERDICT_SCHEMA, agentType: 'Explore' })
    .then(v => ({ finding: f, verdict: v }))
)).then(rs => rs.filter(Boolean))

const confirmed = verified.filter(v => v.verdict?.isReal && v.verdict.severityConfirmed !== 'not-a-bug')
  .map(v => ({ ...v.finding, severityConfirmed: v.verdict.severityConfirmed, verifyNote: v.verdict.verdict, recommendedFix: v.verdict.recommendedFix }))
  .sort((a,b) => ({critical:0,high:1,medium:2,low:3}[a.severityConfirmed] - {critical:0,high:1,medium:2,low:3}[b.severityConfirmed]))

return { totalRaw: allFindings.length, confirmedCount: confirmed.length, confirmed }
