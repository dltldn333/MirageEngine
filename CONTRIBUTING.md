# Contributing to Mirage Engine

Thanks for taking the time to contribute. This file is the short version —
the full guide lives in the docs:

| Topic | English | 한국어 |
| :-- | :-- | :-- |
| Development setup | [Setup](https://mirage-engine.vercel.app/contributing/setup) | [개발 환경 설정](https://mirage-engine.vercel.app/ko/contributing/setup) |
| Architecture | [Architecture](https://mirage-engine.vercel.app/contributing/architecture) | [아키텍처](https://mirage-engine.vercel.app/ko/contributing/architecture) |
| Workflow | [Workflow](https://mirage-engine.vercel.app/contributing/workflow) | [기여 워크플로](https://mirage-engine.vercel.app/ko/contributing/workflow) |
| Releasing | [Releasing](https://mirage-engine.vercel.app/contributing/releasing) | [릴리스](https://mirage-engine.vercel.app/ko/contributing/releasing) |

## Quick start

```bash
git clone https://github.com/dltldn333/MirageEngine.git
cd MirageEngine
pnpm install
pnpm -r build
pnpm dev          # Vite sandbox
```

> **pnpm 9 is required.** The workspace uses `workspace:*` links that npm and
> yarn cannot resolve.

## Before you open a PR

1. `pnpm -r build` passes
2. `pnpm changeset` added, if you touched a published package
3. Docs updated in **both** `en` and `ko` for any API change
4. Manually verified in `apps/dev` — there is no test suite yet, so say in the
   PR what you checked

## Commit format

[Conventional Commits](https://www.conventionalcommits.org/):

```
fix(core): correct scissor offset for nested travelers
feat(painter): support repeating-linear-gradient
docs(guides): add Korean translation for performance
```

## Reporting bugs

Open an issue with the Mirage and `three` versions, browser, OS, GPU, your
config object, and a minimal reproduction. Reports with a reproduction get
fixed; reports without one usually do not.

## Language

Issues and PRs are welcome in English or Korean. Code comments may be in either
— the codebase already mixes both.

---

기여해 주셔서 감사합니다. 이슈와 PR은 한국어로 작성하셔도 됩니다.
전체 가이드는 위 표의 한국어 링크를 참고하세요.
