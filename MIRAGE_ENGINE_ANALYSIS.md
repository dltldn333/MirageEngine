# MirageEngine 심층 분석

> 분석 대상: `feature/wasm` 브랜치 (커밋 `06f90b6`)
> 범위: `core`, `dom-tracker`, `painter`, `sandwich`, `wasm-compute`, `mirage-engine` 전체 소스 4,684 LOC

---

## 0. 한 줄 요약

**MirageEngine은 "브라우저 레이아웃 엔진을 좌표 계산기로만 쓰고, 실제 픽셀은 전부 GPU가 그리게 하는" 미러링 엔진이다.**

브라우저에게는 "이 요소가 어디에 얼마만 한 크기로 있는지"만 물어보고, 배경·그라디언트·그림자·둥근 모서리·텍스트는 전부 자체 SDF 셰이더와 캔버스 텍스처로 다시 그린다. 그래서 CSS로는 불가능한 것(요소 뒤 화면을 텍스처로 빨아들이는 traveler, GLSL 훅 주입, 레이어 간 텔레포트)이 가능해진다.

핵심 계약은 딱 하나다:

> **DOM은 진실의 원천(source of truth), WebGL은 그 진실의 투영(projection)이다.**

이 계약이 지켜지는 한 엔진은 정확하고, 깨지는 순간(예: wasm 공유 버퍼가 DOM보다 뒤처지는 순간) 화면이 무너진다.

---

## 1. 전체 아키텍처

### 1.1 패키지 경계

| 패키지 | 책임 | 의존 |
|---|---|---|
| `mirage-engine` | 공개 API 파사드 (`Mirage`) | core, sandwich |
| `@mirage-engine/core` | 추출·조정·렌더 오케스트레이션 | dom-tracker, painter, three |
| `@mirage-engine/dom-tracker` | DOM 변화 감지 + rAF 스케줄링 | 없음 |
| `@mirage-engine/painter` | 스타일 → 머티리얼/셰이더 변환 | three |
| `@mirage-engine/sandwich` | DOM 텔레포테이션 (요소를 z-layer 밖으로 이동) | dom-tracker |
| `wasm-compute` (Rust) | 부모→자식 월드 좌표 1-pass 전파 | 없음 |

경계가 깔끔하다. **`dom-tracker`와 `painter`가 core를 전혀 모른다**는 점이 특히 좋다. 둘 다 단독 npm 패키지로 나갈 수 있고 실제로 그렇게 배포되어 있다.

### 1.2 한 프레임의 생애

```
Tracker.renderLoop()  ← requestAnimationFrame
│
├─ onBeforeRender          sandwich: placeholder rect 읽고 → 텔레포트된 요소에 위치 쓰기
│
├─ if (isDomDirty)         ← MutationObserver가 세운 깃발
│   └─ onLayoutChange
│       ├─ Renderer.updateScroll()          가상 스크롤 갱신
│       ├─ extractSceneGraph()              DOM 트리 → SceneNode 트리 (+ wasm 버퍼 채우기)
│       ├─ Renderer.syncScene()             SceneNode 트리 → THREE.Mesh 조정
│       └─ Renderer.saveInitialLocals()     애니메이션 기준점 저장
│
├─ onScrollChange          스크롤 변화 감지 → 150ms 후 재추출 예약
├─ onStyleChange           인라인 style 변화 → 유니폼 직접 갱신 (재추출 없이)
│
└─ onRender
    ├─ Renderer.updateScroll()
    ├─ wasm.update_physics(n)               월드 좌표 재계산 (SoA 1-pass)
    ├─ Renderer.syncMeshesByWasm()          메시 position 갱신
    └─ Renderer.render()
        ├─ captureRenderTarget × 레이어      traveler 뒷배경 캡처
        └─ renderer.render(scene, camera)   최종 합성
```

핵심 설계 판단은 **"무거운 경로(추출)와 가벼운 경로(위치 동기화)를 분리한 것"**이다.
DOM 구조가 안 바뀌면 추출을 건너뛰고 위치만 갱신한다. 이게 이 엔진이 60fps를 낼 수 있는 이유다.

---

## 2. 엔지니어링적으로 아름다운 부분

### 2.1 Dirty 비트마스크 + rAF 배칭 — `dom-tracker/src/Tracker.ts`

MutationObserver 콜백에서 **아무 일도 하지 않는다.** 비트마스크만 누적한다.

```ts
DIRTY_RECT      = 1 << 0
DIRTY_STYLE     = 1 << 1
DIRTY_ZINDEX    = 1 << 2
DIRTY_STRUCTURE = 1 << 3
DIRTY_CONTENT   = 1 << 4
```

그리고 rAF 틱에서 한 번만 소비한다. 관찰과 반응의 완전한 분리다.

여기서 더 좋은 건 **우선순위 규칙**이다 (`Tracker.ts:97-105`):

```ts
if (currentMask & DIRTY_STRUCTURE) {
  this.clearTimers();     // 예약된 디바운스 전부 취소
  this.isDomDirty = true;
  return;                 // 즉시 처리
}
```

"구조가 바뀐 건 기다릴 수 없다"는 도메인 지식이 코드에 그대로 녹아 있다. 스타일 변화는 미룰 수 있지만 노드 추가/삭제는 미루면 화면에 유령이 남는다는 걸 정확히 알고 짠 코드다.

### 2.2 Visibility를 2비트로 — `core/src/types/flags.ts`

```ts
USER_LAYER   = 1 << 0   // 실제로 그릴 것인가
SELECT_LAYER = 1 << 1   // 선택 레이어에 포함할 것인가
type Visibility = 0 | 1 | 2 | 3
```

진짜 영리한 부분은 `visibleFlow`와 `visibleFlag`를 **분리한 것**이다 (`Extractor.ts:346-393`).

- `visibleFlow` = 자손에게 상속되는 값 → `include-tree` / `exclude-tree`가 조작
- `visibleFlag` = 이 노드 자신의 값 → `include-self` / `exclude-self`가 조작

```ts
visibleFlag = visibleFlow;                      // 먼저 흐름을 복사
if (filterSet.has(INCLUDE_SELF)) visibleFlag |= USER_LAYER;   // 자기만 덮어씀
```

CSS의 상속 개념을 2비트 정수 연산으로 정확히 재현했다. `data-mirage-filter="exclude-tree include-self"` 같은 조합이 자연스럽게 동작하는 이유가 여기 있다.

### 2.3 THREE의 32채널 레이어를 양끝에서 배분 — `flags.ts:18-23`

```ts
BASE: 0,
SELECTED: 1,
getCaptureLayer: (n) => 31 - n,   // 30, 29, 28, ... 아래로
HIDDEN: 31,
```

three.js가 주는 32개 레이어 채널을, **사용자용은 0부터 위로, 내부 캡처용은 31부터 아래로** 배분했다. 유한한 비트 자원을 양방향으로 쓰는 발상이 깔끔하다. `HIDDEN = 31`을 "아무 카메라도 안 보는 채널"로 정의해서 `mesh.layers.set(HIDDEN)` 한 줄로 숨김 처리하는 것도 좋다.

### 2.4 traveler — backdrop-filter의 일반화

이게 이 라이브러리의 **가장 독창적인 부분**이다.

CSS `backdrop-filter`는 "내 뒤 배경을 블러 처리"밖에 못 한다. MirageEngine의 traveler는 "내 뒤 배경을 **텍스처로 받아서 아무 셰이더나 돌려라**"로 일반화했다.

구현이 우아하다. 버텍스 셰이더가 스크린 좌표를 varying으로 넘기고:

```glsl
// box-vertex.glsl
gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
vScreenPos  = gl_Position;
```

프래그먼트에서 traveler냐 아니냐에 따라 UV 소스만 바꾼다 (`BoxGenerator.ts:56`):

```ts
const baseUvCode = styles.isTraveler
  ? "vec2 resultUv = screenUv;"                        // 화면 좌표 = 뒷배경 캡처 텍스처
  : "vec2 localUv = (p / uSize) + 0.5; ...";           // 로컬 좌표 = 자기 이미지
```

**하나의 셰이더로 두 모드를 커버한다.** 분기 하나로 완전히 다른 두 개념을 처리하는 건 좋은 추상화의 신호다.

### 2.5 셰이더 훅 주입 — `BoxGenerator.ts:9-64`

프래그먼트 셰이더에 4개의 주입 지점을 뚫어놨다:

```
#INJECT_DECLARATIONS   → uniform 선언
#INJECT_UV_MODIFIER    → UV 왜곡 (물결, 굴절)
#INJECT_BASE_COLOR     → 텍스처 샘플링
#INJECT_COLOR_MODIFIER → 최종 색 보정 (틴트, 노이즈)
```

그리고 uniform 타입을 **값의 모양으로 추론**한다:

```ts
typeof value === "number"        → uniform float
Array.isArray(value) && len 2/3/4 → uniform vec2/vec3/vec4
```

덕분에 사용자는 `data-mirage-shader='{"uniforms":{"uTime":0},"colorModifier":"..."}'` 속성 하나로 GLSL을 꽂을 수 있다. three.js의 `onBeforeCompile`보다 훨씬 배우기 쉬운 API다.

### 2.6 CSS border-radius를 셰이더에서 정확히 재현 — `box-fragment.glsl`

```glsl
float fTop    = uSize.x / max(tl + tr, 0.0001);
float fBottom = uSize.x / max(bl + br, 0.0001);
float fLeft   = uSize.y / max(tl + bl, 0.0001);
float fRight  = uSize.y / max(tr + br, 0.0001);
float f = min(1.0, min(min(fTop, fBottom), min(fLeft, fRight)));
vec4 clampedRadius = uBorderRadius * f;
```

이건 **CSS 스펙의 radius 축소 규칙 그 자체**다. `border-radius: 200px`을 100px 높이 박스에 주면 브라우저가 비율대로 줄이는 그 동작을 정확히 구현했다. 스펙을 읽고 짠 코드다.

더 좋은 건 SDF를 **두 개로 분리**한 점이다:

```glsl
sdRoundedBox(...)  // 수학적으로 정확한 라운드 박스 → 보더 거리 계산용
sdVisualBox(...)   // n=2.01 초타원(squircle) → 눈에 보이는 마스크용
```

"정확한 거리"와 "예쁜 실루엣"이 다른 함수라는 걸 인지하고 용도별로 나눴다. 애플 아이콘의 squircle 느낌을 내면서도 보더 두께는 정확하게 나온다.

### 2.7 IntersectionObserver 기반 텍스처 생명주기 — `TextureLifecycleManager.ts`

```ts
new IntersectionObserver(entries => {
  entry.isIntersecting ? this.loadTexture(el) : this.disposeTexture(el);
}, { rootMargin: "300px" })
```

화면 밖 이미지 텍스처를 자동으로 GPU에서 내린다. `rootMargin: 300px`으로 스크롤 예측까지 넣었다.

여기에 **디코딩 레이스 가드**까지 있다 (`:105-108`):

```ts
// 디코딩하는 동안 URL이 바뀌었으면 결과를 버린다
if (this.elementUrls.get(element) !== url) {
  if ('close' in textureImage) textureImage.close();
  return;
}
```

`ImageBitmap.close()`까지 호출한다. 이 정도로 꼼꼼한 비동기 정리는 흔치 않다.

### 2.8 폰트 베이스라인 실측 — `FontMetricsManager.ts`

캔버스 텍스트와 DOM 텍스트를 픽셀 단위로 맞추려면 baseline 오프셋이 필요한데, Canvas API는 이걸 신뢰성 있게 안 준다. 그래서:

```
<span>Hidden Text</span><img width=1 height=1 style="vertical-align: baseline">
baseline = img.offsetTop - span.offsetTop
```

**1×1 이미지를 baseline에 정렬시켜서 오프셋을 실측한다.** 고전적이면서 정확한 트릭이고, 폰트 문자열을 키로 캐싱해서 한 번만 측정한다.

### 2.9 MeshRegistry = WeakMap — `MeshRegistry.ts`

```ts
private store: WeakMap<HTMLElement, THREE.Mesh>;
```

DOM 노드가 GC되면 매핑도 자동으로 사라진다. **명시적 정리를 깜빡해도 메모리 누수가 되지 않는 안전망**이다. (단, WebGL 리소스 자체는 여전히 명시적 dispose가 필요하다 — 5.4 참고)

### 2.10 sandwich의 read/write 분리 — `sandwich/src/index.ts:131-138`

```ts
// 1단계: 모든 rect를 먼저 읽는다
const rects = this.items.map(({ placeholder }) => placeholder.getBoundingClientRect());
// 2단계: 그 다음 모든 style을 쓴다
this.items.forEach(({ original }, i) => { original.style.top = ...; });
```

레이아웃 스래싱을 피하는 정석이고, 주석에도 그 의도가 적혀 있다. **아이러니하게 `Extractor`는 이 원칙을 지키지 않고 있다** (5.1 S3 참고).

### 2.11 WASM SoA 레이아웃 — `wasm-compute/src/lib.rs`

```
stride 5: [parent_index, localX, localY, worldX, worldY]
```

트리를 평탄한 `Float32Array`로 눕히고, **pre-order 순회로 채워서 부모가 항상 자식보다 앞에 오도록** 보장한다. 그래서 재귀 없이 for 루프 한 번이면 월드 좌표가 전파된다:

```rust
for i in 0..node_count {
    if parent_idx >= 0 {
        world[i] = world[parent] + local[i];   // 부모는 이미 계산됨
    } else {
        world[i] = local[i];
    }
}
```

캐시 친화적이고, 나중에 SIMD나 멀티스레드로 확장할 여지가 열려 있다. **이 자료구조 자체가 이 커밋의 진짜 성과다.** (속도 이득은 아직 아니다 — 5.3 B5 참고)

---

## 3. 이 라이브러리의 특성 (사용자 관점)

| 특성 | 설명 |
|---|---|
| **선언적** | 모든 기능이 `data-mirage-*` 속성. JS API 호출이 거의 없다 |
| **비침투적** | `mode: "overlay"`에서 DOM을 건드리지 않고 위에 캔버스만 얹는다 |
| **점진적 채택** | `data-mirage-filter`로 페이지 일부만 미러링 가능 |
| **프레임워크 무관** | React/Vue를 전혀 모른다. DOM만 본다 |
| **상태 없음** | 매 추출마다 DOM에서 진실을 다시 읽는다 (그래서 정확하지만 비싸다) |

핵심 제약도 명확하다: **DOM이 진실이므로, DOM 읽기 비용이 곧 엔진의 하한선이다.** 아래 최적화 목록의 절반이 여기서 나온다.

---

## 4. 최적화 포인트 — 등급별

### S급: 즉효, 임팩트 매우 큼

---

#### S1. 렌더타겟 11장 선할당 → VRAM 폭탄

**위치:** `core/src/renderer/Renderer.ts:143-163`, `core/src/types/attributes.ts:37`

```ts
MAX_LAYERS = Object.keys(TRAVEL_VALUES).length - 1   // = 11

createRenderTarget() {
  for (let i = 0; i < ATTR_TRAVEL.MAX_LAYERS; i++) {   // 11번
    this.renderTargets.push(new THREE.WebGLRenderTarget(
      width * this.qualityFactor,     // 전체 캔버스 크기 × 품질배수
      height * this.qualityFactor,
      { depthBuffer: true }
    ));
  }
}
```

1920×1080 화면 + overscan 200 기준 실측:

| quality | RT 해상도 | 장당 | ×11장 |
|---|---|---|---|
| `low` (×1) | 2320×1480 | 13MB | **0.14GB** |
| `medium` (×2) | 4640×2960 | 52MB | **0.56GB** |
| `high` (×4) | 9280×5920 | 210MB | **2.25GB** |

`quality: "high"`는 사실상 사용 불가다. 그런데 `dev/main.ts`는 지금 `quality: "high"`를 쓰고 있다.

**왜 낭비인가:** 실제 페이지에 존재하는 traveler 레이어는 보통 1~2개다. 나머지 9~10장은 평생 한 픽셀도 안 쓰이고 VRAM만 점유한다.

**개선안:**
1. **지연 생성** — `createRenderTarget(layerIndex)`로 바꿔서 해당 레이어에 traveler가 실제로 발견됐을 때만 생성. 가장 효과가 크고 위험이 없다.
2. **`depthBuffer: false`** — 직교 카메라 2D 합성이라 깊이 버퍼가 불필요. 장당 약 25% 절감.
3. **RT 크기 축소** — traveler의 바운딩 박스 + clipArea만큼만 할당. 현재는 전체 캔버스를 잡고 scissor로 일부만 쓴다.

---

#### S2. traveler 1개당 씬 전체를 다시 렌더

**위치:** `Renderer.ts:897-931`

```ts
for (const traveler of travelers) {
  this.renderer.setScissor(scissorX, scissorY, scissorW, scissorH);
  this.renderer.render(this.scene, this.camera);      // ← 씬 전체를 통째로
}
```

traveler가 T개, 레이어가 L개면 **프레임당 (T×L + 1)회 전체 씬 렌더**다. traveler 5개짜리 페이지면 60fps에서 초당 360회 전체 씬 드로우.

**scissor의 함정:** scissor는 프래그먼트 단계에서 픽셀을 버리는 것이지, **지오메트리 처리를 건너뛰지 않는다.** 즉 버텍스 셰이더와 드로우콜은 traveler 수만큼 그대로 다 나간다. 절감되는 건 fill-rate뿐이다.

**손익분기:** traveler가 1~2개면 scissor 방식이 이득(fill 절감 > 드로우콜 증가). 3개 이상이면 **scissor 없이 RT 전체를 1회만 렌더하는 게 무조건 빠르다.**

**개선안:**
```
if (travelers.size <= 2) → 현재 방식 유지 (scissor 반복)
else                     → scissor 끄고 renderer.render() 1회
```
그리고 traveler들의 scissor 영역 **합집합(union)**을 구해 한 번만 설정하는 중간 전략도 가능하다.

추가로, 매 프레임 `clipArea` 문자열을 다시 파싱한다(`Renderer.ts:906-914`). 생성자에서 한 번만 파싱해 `{clipDiff, clipRatio}`로 캐싱하면 된다.

---

#### S3. 추출 중 DOM 쓰기 → 레이아웃 스래싱 + 추출 1회 추가 발생

**위치:** `Extractor.ts:542-547`

```ts
let id = element.getAttribute("data-mid");
if (!id) {
  id = Math.random().toString(36).substring(2, 11);
  element.setAttribute("data-mid", id);        // ← 읽기 루프 한가운데의 쓰기
}
```

이 한 줄이 두 가지 문제를 동시에 만든다.

**문제 1 — 레이아웃 스래싱**

추출 루프는 노드마다 `getBoundingClientRect()` + `getComputedStyle()`를 호출하는 **순수 읽기 루프**여야 한다. 그런데 중간에 속성 쓰기가 끼면:

```
read(A) → write(A) → read(B) → write(B) → read(C) → ...
             ↑ 스타일 무효화        ↑ 강제 재계산
```

속성 변경은 속성 선택자(`[data-mid]`)가 매칭될 수 있으므로 브라우저가 스타일 재계산 플래그를 세운다. 다음 `getComputedStyle()`이 그걸 강제로 flush한다. **노드 N개면 강제 스타일 재계산 N회.**

**문제 2 — 무한이 아닌 "1회 추가" 재추출 루프**

`Tracker.ts:83`을 보자:

```ts
} else if (mutation.attributeName?.startsWith("data-")) {
  currentMask |= DIRTY_RECT | DIRTY_STYLE;
}
```

`data-mid`도 `data-`로 시작하므로 **엔진이 자기가 쓴 속성을 자기가 감지한다.** → `isDomDirty = true` → 다음 프레임에 또 추출. 두 번째 추출에서는 `data-mid`가 이미 있으니 쓰기가 없어 멈춘다.

결과: **DOM에 노드가 추가될 때마다 항상 추출이 2번 돈다.** 초기 로드 시 전체 트리 추출이 정확히 2회 실행된다.

**개선안:**
- `WeakMap<HTMLElement, string>`으로 id 관리 → DOM을 아예 안 건드림. 가장 깔끔하다.
- 또는 `MutationObserver`의 `attributeFilter`로 `data-mid`를 제외.
- 최소한 쓰기를 배열에 모았다가 추출 완료 후 일괄 적용.

---

#### S4. 텍스트 라인 추출의 Range 폭발

**위치:** `Extractor.ts:29-172` (`extractTextLines`)

```ts
for (const token of tokens) {
  const range = document.createRange();       // 토큰마다 Range 신규 생성
  range.setStart(textNode, currentOffset);
  range.setEnd(textNode, currentOffset + token.length);
  const rects = range.getClientRects();       // 강제 레이아웃

  if (rects.length > 1) {
    processChunk(token, currentOffset);       // ← 문자 단위 폴백
  }
}

// processChunk 내부
for (let i = 0; i < chunkText.length; i++) {
  const range = document.createRange();       // 문자마다 Range 생성
  const rect = range.getBoundingClientRect(); // 강제 레이아웃
}
```

**비용:** 토큰 T개 + 줄바꿈에 걸린 문자 C개 → `T + C`회의 Range 생성 + 강제 레이아웃.

`word-break: break-all`이 걸린 긴 한글 문단은 거의 모든 토큰이 줄바꿈에 걸리므로 **문자 수만큼** Range를 만든다. 500자 문단 = Range 500개 + 레이아웃 500회. 텍스트 노드 하나에서.

**개선안:**
1. **Range 1개 재사용** — `createRange()`는 루프 밖에서 한 번, 안에서는 `setStart`/`setEnd`만. 할당이 T+C → 1로 준다.
2. **문자 단위 폴백을 이진 탐색으로** — 줄바꿈이 일어난 "경계 문자"만 찾으면 되므로 O(n)이 아니라 O(log n × 줄 수)면 충분하다. 500자 3줄이면 500회 → 약 27회.
3. **결과 캐싱** — 텍스트 내용과 컨테이너 폭이 그대로면 이전 라인 정보를 재사용. `DIRTY_CONTENT`가 없는 재추출에서는 계산 자체를 건너뛸 수 있다.

---

### A급: 구조적 개선, 효과 큼

---

#### A1. Renderer가 Extractor의 DOM 읽기를 중복 수행

**위치:** `Renderer.ts:663-672`

```ts
const targetEl = node.element.nodeType === Node.TEXT_NODE
  ? node.element.parentElement! : node.element;
const computed = window.getComputedStyle(targetEl);      // ← 또 읽음
if (computed.transform && computed.transform !== "none") {
  const matrix = new DOMMatrix(computed.transform);       // ← 노드마다 DOMMatrix 생성
}
```

`Extractor.ts:520`에서 **이미 같은 요소의 `getComputedStyle`을 호출했다.** SceneNode에 `transform` 값만 실어 보내면 이 읽기 전체가 사라진다.

노드 1000개짜리 페이지면 프레임당 `getComputedStyle` 1000회 + `DOMMatrix` 1000개 할당이 그냥 사라진다.

---

#### A2. 지오메트리를 메시마다 새로 생성

**위치:** `Renderer.ts:407`, `Renderer.ts:535`

```ts
const geometry = new THREE.PlaneGeometry(1, 1);
```

**모든 메시가 완전히 동일한 1×1 unit quad를 쓴다.** 크기는 `mesh.scale`로 조절하니 지오메트리는 하나면 충분하다.

현재는 노드 N개 = VBO N개 = GPU 버퍼 할당 N회 + dispose 관리 N개.

```ts
// 개선
private static readonly UNIT_QUAD = new THREE.PlaneGeometry(1, 1);
mesh = new THREE.Mesh(Renderer.UNIT_QUAD, material);
```

주의: 공유하면 개별 dispose를 하면 안 되므로, 삭제 경로(`Renderer.ts:344-372`)에서 `geometry.dispose()`를 빼야 한다. 지금은 `nativeMesh`가 이미 `mesh.geometry`를 공유하고 있는데(`Renderer.ts:718`) 삭제 시 양쪽 다 dispose를 호출한다 — **이미 존재하는 이중 해제 버그**이기도 하다.

---

#### A3. 프레임당 씬 전체를 3번 선형 순회 + 클로저 할당

**위치:** `Renderer.ts:979-999` (`render`), `:1016` (`syncMeshesByWasm`), `:1005` (`saveInitialLocals`)

```ts
this.scene.children.forEach((child) => {          // 순회 1
  applyScissorHook(mesh, scissorRect);
  mesh.children.forEach((subChild) => { ... });   // 중첩 순회
});
```

그리고 `applyScissorHook` 내부 (`Renderer.ts:962-971`):

```ts
mesh.onBeforeRender = () => { gl.enable(gl.SCISSOR_TEST); gl.scissor(sx, sy, sw, sh); };
mesh.onAfterRender  = () => { gl.disable(gl.SCISSOR_TEST); };
```

**메시마다 매 프레임 클로저 2개를 새로 만든다.** 노드 1000개 × 60fps = **초당 12만 개 클로저 할당** → GC 압력 → 프레임 스파이크.

> 참고: 지금은 `scissorRect`가 어디서도 세팅되지 않아(`syncMeshesByDOM` 삭제의 부작용) 이 경로가 죽어 있다. 클리핑을 복구하는 순간 이 비용이 살아난다.

**개선안:**
- **scissor가 필요한 메시만 별도 `Set`으로 관리** → 전체 순회 제거. 보통 `overflow: hidden` 조상이 있는 노드는 전체의 몇 %다.
- **클로저는 메시당 1회만 생성**하고 좌표는 `mesh.userData`에서 읽게 한다:
  ```ts
  const hook = function() { const r = this.userData.scissor; gl.scissor(r.x, r.y, r.w, r.h); };
  ```
- `syncMeshesByWasm`과 `saveInitialLocals`도 `wasmIndex`가 있는 메시 배열을 따로 유지하면 순회 대상이 크게 준다.

---

#### A4. 추출 1회 = SceneNode 트리 통째 재생성

매 추출마다 새로 만들어지는 것들:

| 위치 | 할당 |
|---|---|
| `Extractor.ts:265, 545` | `Math.random().toString(36)` — 노드마다 문자열 2개 |
| `Extractor.ts:350, 399` | `new Set(filterData.split(/\s+/))` — 정규식 split + Set |
| `Extractor.ts:652` | `[...(inheritedClipElements \|\| []), element]` — **depth마다 배열 전체 복사** |
| `Extractor.ts:656` | `Array.from(element.childNodes)` — 자식 배열 스냅샷 |
| `Extractor.ts:684-750` | SceneNode 객체 + 중첩된 `rect`, `styles`, `nativeRect` 객체 |
| `Renderer.ts:625` | `mesh.userData.domRect = {...}` — 노드마다 객체 |

**`clipElements`의 O(depth²)** 가 특히 눈에 띈다. `overflow: hidden` 조상이 깊게 중첩되면 배열 복사가 제곱으로 늘어난다.

**개선안:**
- `clipElements`를 배열 복사 대신 **링크드 리스트**(`{el, parent}`)로. 복사가 O(depth) → O(1).
- `Array.from(childNodes)` → `for (let n = el.firstChild; n; n = n.nextSibling)`. 배열 할당 제거.
- 필터 토큰은 문자열 그대로 `includes()` 체크하거나, 요소별 파싱 결과를 `WeakMap`에 캐싱.
- SceneNode를 **객체 풀에서 재사용** — DOM 구조가 안 바뀐 재추출에서는 기존 노드의 필드만 갱신.

---

#### A5. `new Function()`으로 native 스타일 파싱

**위치:** `Extractor.ts:464`

```ts
nativeParsedStyles = new Function("return " + jsonStr)();
```

세 가지 문제가 겹쳐 있다:

1. **성능** — `new Function`은 JIT 컴파일을 유발한다. 요소마다, 추출마다.
2. **보안/호환** — CSP `script-src`에 `unsafe-eval`이 없으면 **아예 동작하지 않는다.** 엄격한 CSP를 쓰는 사이트에서는 이 기능이 통째로 죽는다.
3. **캐싱 없음** — 동일한 문자열을 매번 다시 컴파일한다.

**개선안:** `JSON.parse`를 먼저 시도하고, 실패하면 따옴표 정규화 후 재시도. 그리고 결과를 `Map<string, object>`에 캐싱. `new Function`은 최후의 폴백으로만 남기거나 아예 제거.

같은 맥락으로 `JSON.parse(shaderData)` (`Extractor.ts:515`)와 `JSON.stringify(node.shaderHooks)` (`Renderer.ts:396`)도 문자열 키 캐싱 대상이다. 특히 후자는 **해시 비교용으로 매번 stringify**하는데, `dataset` 원본 문자열을 그대로 해시로 쓰면 직렬화가 통째로 사라진다.

---

#### A6. 텍스트 캔버스 메모리와 전량 재생성

**위치:** `painter/src/Text/TextGenerator.ts:80-92`, `Renderer.ts:490-530`

```ts
const scale = window.devicePixelRatio * this.qualityFactor;
this.canvas.width  = rectWidth  * scale;
this.canvas.height = rectHeight * scale;
```

DPR 2 + `quality: "high"`(4) → **배율 8배.** 폭 500px 텍스트 줄이 4000px 캔버스가 된다. 텍스트 줄 하나당 캔버스 하나이므로 문단 10줄이면 캔버스 10개.

그리고 `reconcileTextChild`는:

```ts
const currentStyleHash = JSON.stringify(stylesToUse) + node.textContent + lines.map(l => l.text).join("|");
if (isDirty) {
  existingChildren.forEach(child => { /* 전부 dispose */ });
  lines.forEach(line => { /* 전부 재생성 */ });
}
```

**한 글자만 바뀌어도 문단 전체의 캔버스와 텍스처를 파기하고 다시 만든다.** 타이핑 애니메이션 같은 케이스에서 매 프레임 수십 개 캔버스가 생성/파기된다.

**개선안:**
1. **배율 상한** — `Math.min(DPR * qualityFactor, 3)` 정도로 캡. 화면 픽셀보다 3배 이상 큰 텍스처는 시각적 이득이 거의 없다.
2. **줄 단위 diff** — 라인별 해시를 비교해 바뀐 줄만 재생성. 대부분의 텍스트 변경은 1~2줄만 영향받는다.
3. **캔버스 풀** — 크기가 맞는 캔버스는 `clearRect` 후 재사용 (지금도 크기가 같으면 재사용하는 로직이 `TextGenerator.ts:88-92`에 있다. 문제는 상위에서 메시를 통째로 버려서 그 경로를 못 타는 것).

---

### B급: 국소 개선, 효과 중간

---

#### B1. SVG를 매 추출마다 다시 직렬화

**위치:** `Extractor.ts:590-616`

```ts
const clone = element.cloneNode(true);
// ... 색상 override 적용 ...
let svgString = new XMLSerializer().serializeToString(clone);
return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
```

`cloneNode(true)` + `XMLSerializer` + `encodeURIComponent`를 **추출할 때마다** 실행한다. 결과 문자열이 이전과 같으면 `textureManager.register`가 재로딩은 건너뛰지만(`TextureLifecycleManager.ts:36-39`), **문자열 생성 비용 자체는 매번 지불한다.** 복잡한 아이콘 세트가 많은 페이지에서 눈에 띈다.

**개선안:** `WeakMap<SVGElement, {styleHash, dataUrl}>`로 캐싱. 스타일 override와 SVG 내용이 그대로면 이전 URL을 그대로 반환.

---

#### B2. `getBoundingClientRect()` 연속 2회 호출

**위치:** `Renderer.ts:945-946`

```ts
const canvasTop  = canvasEl.getBoundingClientRect().top;
const canvasLeft = canvasEl.getBoundingClientRect().left;   // 두 번째 호출
```

매 프레임 강제 레이아웃 2회. 한 번 받아서 구조분해하면 절반이 된다.

---

#### B3. `updateScroll()`이 프레임당 2회 실행

**위치:** `Syncer.ts:44`(onLayoutChange), `Syncer.ts:78`(onRender)

레이아웃이 갱신되는 프레임에서는 두 번 호출된다. 두 번째는 델타가 0이라 결과는 같지만, `target.getBoundingClientRect()`가 한 번 더 나간다.

---

#### B4. 텍스처/메시 누수 3곳

| 위치 | 내용 |
|---|---|
| `Renderer.ts:708` | `new THREE.TextureLoader().load(...)` — 로더를 매번 새로 만들고, 반환된 텍스처를 어디에도 추적하지 않아 **dispose 불가** |
| `TextureLifecycleManager.ts:127-133` | `disposeAll()`이 주석만 있고 실제 해제 없음. WeakMap이라 순회 불가가 원인 → 라이브 텍스처 `Set`을 병행 관리해야 함 |
| `Renderer.ts:281` | `dispose()`에 `// TODO: Scene 내부 Mesh들도 순회하며 dispose` — 미구현. 엔진을 재시작하는 SPA에서 누적된다 |

WeakMap은 JS 객체는 회수하지만 **GPU 리소스는 회수하지 않는다.** three.js는 명시적 `dispose()` 없이는 텍스처/버퍼를 GPU에서 못 내린다. 이건 성능 문제이자 정확성 문제다.

---

#### B5. wasm의 실제 이득 — 냉정한 평가

**위치:** `wasm-compute/src/lib.rs:26-49`

```rust
pub fn update_physics(&mut self, node_count: usize) {
    for i in 0..node_count {
        // 노드당 부동소수점 덧셈 2회
    }
}
```

**연산량이 너무 가볍다.** 노드 1000개면 덧셈 2000회 — 현대 JS 엔진이 `Float32Array` 위에서 도는 데 수 마이크로초면 끝난다. 여기에 wasm 호출 오버헤드(경계 전환, 인자 마샬링)를 얹으면 **JS가 이길 가능성이 높다.**

wasm이 이기려면 둘 중 하나여야 한다:
- 노드 수가 **수만~수십만** 단위이거나
- 연산이 실제 물리 솔버, 제약 조건 해석, 레이아웃 계산처럼 **무거워야** 한다

**그렇다고 이 커밋이 무의미한 건 아니다.** 진짜 성과는 속도가 아니라 **자료구조**다:

- 트리 → 평탄 배열(SoA) 변환
- 부모 인덱스 기반 1-pass 월드 좌표 전파
- JS↔wasm 제로카피 공유 메모리

이 인프라 위에서 **나중에 무거운 계산을 얹을 수 있다.** 지금은 그 계산이 없을 뿐이다. 벤치마크를 돌려 JS 대비 실측하고, 이득이 없다면 "인프라 준비"로 명확히 포지셔닝하는 게 정직하다.

---

#### B6. Rust 쪽 안전성

**위치:** `wasm-compute/src/lib.rs`

```rust
let parent_idx = parent_idx_f32 as usize;
let parent_offset = parent_idx * stride;
let parent_world_x = self.buffer[parent_offset + 3];   // ← 바운드 체크, 실패 시 panic
```

1. **panic = wasm trap = 엔진 완전 정지.** `parent_idx`가 오염되면(예: 버퍼가 이전 프레임 값을 들고 있는데 노드 수가 줄어든 경우) 인덱스가 범위를 넘어 panic한다. `if parent_offset + 4 < self.buffer.len()` 가드가 필요하다.
2. **용량 초과 무방비** — `Syncer.ts:93`에서 10,000노드분을 할당하는데, 노드가 10,001개면 Extractor가 조용히 범위 밖에 쓰고(무시됨) 좌표가 0이 된다. `currentIndex`가 capacity를 넘으면 경고하거나 버퍼를 키워야 한다.
3. **`Vec` 재할당 = JS 뷰 detach** — 지금은 재할당이 없지만, 동적 확장을 넣는 순간 `Float32Array` 뷰가 조용히 무효화된다. 확장 시 반드시 뷰를 재생성하는 규약이 필요하다.
4. **성능 세부** — `chunks_exact_mut(5)`나 `get_unchecked`로 바운드 체크를 줄일 수 있지만, 위 1번과 상충하므로 검증을 루프 밖에서 한 번 하는 방식이 낫다.

---

### C급: 설계 위생

---

#### C1. 레이어 번호 충돌 가능

`getCaptureLayer(n) = 31 - n`이고 `MAX_LAYERS = 11`이므로 **캡처 레이어가 20~30번을 점유**한다. 그런데 config는 임의의 숫자를 받는다:

```ts
// types/config.ts:17
layer?: number | LayerTarget;
```

`layer: 30`을 주면 캡처 레이어 1번과 정면 충돌한다. (`dev/main.ts`에 `layer: 30`이 주석으로 남아 있다.) **생성자에서 `layer >= 32 - MAX_LAYERS - 1`이면 throw하거나 경고**해야 한다.

#### C2. `MAX_LAYERS` 도출이 취약

```ts
// attributes.ts:37
MAX_LAYERS: Object.keys(TRAVEL_VALUES).length - 1
```

`TRAVEL_VALUES`에 토큰을 하나 추가하면 **레이어 수와 렌더타겟 개수가 조용히 바뀐다.** 두 개념(속성 토큰 목록 / 최대 레이어 수)이 우연히 같은 숫자일 뿐인데 결합되어 있다. 상수로 명시하는 게 안전하다.

#### C3. 추출 중 `throw`가 엔진을 정지시킴

`Extractor.ts:355, 366, 375, 404, 417, 426`에서 잘못된 filter/select 토큰에 `throw`한다. 추출은 rAF 루프 안에서 돌기 때문에 **한 요소의 오타가 렌더 루프 전체를 죽인다.** 개발 편의를 위한 엄격함이 프로덕션에서는 위험하다. `console.warn` + 해당 토큰 무시가 안전하다. (디버그 모드에서만 throw하는 절충안도 좋다 — `config.debug`가 이미 있다.)

#### C4. 데드코드

| 위치 | 내용 |
|---|---|
| `Renderer.ts:48` | `public size` — 어디서도 안 씀 |
| `Renderer.ts:170-193` | `applyTextQuality`와 `getQualityFactor`가 같은 일을 함. 생성자에서 둘 다 호출(`:86`, `:133`) |
| `flags.ts:15` | `EXCLUDED = 0` — 미사용 |
| `Tracker.ts:30` | `mutationTimer` — 디바운스 제거 후 미사용 |

#### C5. 크기(width/height)가 wasm 경로에서 빠짐

`syncMeshesByWasm`은 위치만 wasm에서 받고 크기는 `mesh.userData.domRect`(추출 시점 값)에 고정한다. **크기 애니메이션은 재추출 전까지 반영되지 않는다.** wasm stride를 5 → 7로 늘려 `width`, `height`도 공유 버퍼에 넣으면 일관성이 생기고, 크기 변화도 재추출 없이 반영된다.

---

## 5. 우선순위 로드맵

### 1주차 — 즉효 (코드 변경 최소, 효과 최대)

| # | 작업 | 예상 효과 |
|---|---|---|
| S1 | 렌더타겟 지연 생성 + `depthBuffer: false` | VRAM **90% 이상 절감** |
| S3 | `data-mid` → WeakMap | 초기 추출 **2회 → 1회**, 스래싱 제거 |
| B2 | `getBoundingClientRect` 중복 제거 | 프레임당 강제 레이아웃 -1 |
| A2 | 지오메트리 싱글턴 | VBO N개 → 1개, 이중 해제 버그 동시 해결 |

### 2주차 — 구조 개선

| # | 작업 | 예상 효과 |
|---|---|---|
| S4 | Range 재사용 + 이진 탐색 폴백 | 텍스트 추출 **10배 이상** |
| A1 | `getComputedStyle` 중복 제거 | 프레임당 DOM read 절반 |
| S2 | traveler 적응형 렌더 전략 | traveler 다수 시 드로우콜 **T배 → 1배** |
| A3 | scissor 대상 서브셋 + 클로저 재사용 | GC 스파이크 제거 |

### 3주차 — 정확성 & 위생

| # | 작업 |
|---|---|
| B4 | dispose 3곳 구현 (누수 차단) |
| C5 | wasm stride 5 → 7 (크기 포함) |
| C1 | 레이어 번호 검증 |
| C3 | throw → warn |
| B5 | wasm vs JS 벤치마크 후 포지셔닝 결정 |

---

## 6. 마무리 관점

이 코드베이스의 진짜 강점은 **개별 최적화가 아니라 경계 설계**다.

- `dom-tracker`가 "언제 일할지"만 결정하고
- `Extractor`가 "무엇을 그릴지"만 결정하고
- `Painter`가 "어떻게 그릴지"만 결정하고
- `Renderer`가 "실제로 그리는" 구조

이 분리 덕분에 위 최적화 대부분이 **한 파일 안에서 국소적으로** 끝난다. 렌더타겟 지연 생성은 `Renderer`만, Range 재사용은 `Extractor`만 고치면 된다. 서로 얽혀 있지 않다.

가장 큰 리스크는 최근 wasm 리팩터링에서 생긴 **"진실의 원천 이중화"**다. 원래는 DOM 하나였는데, 이제 DOM과 wasm 공유 버퍼 둘이 되었다. 둘이 어긋나면 화면이 즉시 무너지고(현재 발생 중인 0,0 버그), 어긋난 걸 감지할 방법이 없다. 이 이중화를 유지하려면 **"공유 버퍼는 항상 추출 직후에만 유효하다"**는 불변식을 코드로 강제하는 장치(버전 카운터, 유효성 플래그)가 필요하다.
