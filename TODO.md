# Code Explainer (Module 3) — TODO

## Backend
- [x] Create `backend/app/parsers/__init__.py`
- [x] Create `backend/app/parsers/ast_parser.py` (Python `ast` signature extraction)
- [x] Create `backend/app/models/code_explanation.py`
- [x] Create `backend/app/schemas/code_explanation.py`
- [x] Create `backend/app/ai/prompts/code_explainer_prompt.py`
- [x] Create `backend/app/ai/code_explainer/__init__.py`
- [x] Create `backend/app/ai/code_explainer/explainer.py`
- [x] Create `backend/app/services/code_explanation_service.py`
- [x] Create `backend/app/api/routes/code_explainer.py` (50KB guard)
- [x] Update `backend/app/main.py` (register router + model import)

## Frontend
- [x] Install Monaco Editor (`@monaco-editor/react`, `monaco-editor`)
- [x] Create `frontend/src/types/codeExplanation.ts`
- [x] Create `frontend/src/services/codeExplanationService.ts`
- [x] Create `frontend/src/hooks/useCodeExplanation.ts`
- [x] Create `frontend/src/components/CodeExplanationHistoryList.tsx`
- [x] Create `frontend/src/components/CodeExplanationResultView.tsx`
- [x] Create `frontend/src/pages/CodeExplainerPage.tsx`
- [x] Update `frontend/src/App.tsx` (protected route `/explain`)
- [x] Update `frontend/src/components/AppLayout.tsx` (nav link)

## Verification
- [x] `npm run lint` (frontend)
- [x] `npm run build` (frontend) — bundle 420.82 kB → 446.60 kB (+26 kB raw, +7 kB gzip; Monaco loads from CDN so minimal impact)
- [x] Restart backend; confirm clean start + import
- [x] E2E: real Python file → accurate per-function/class explanations (load_expenses, main, Budget, Expense all explained)
- [x] E2E: oversized input (>50KB) → clear 400
- [x] E2E: cross-user isolation (404 on other user's explain)
- [x] Show full diff before committing
- [x] Browser-serve verification: `/explain` HTTP 200, Monaco resolved via Vite deps, language IDs (python/js/ts/java), bundle 446.60 kB (gzip 138.51 kB), explanations verified specific to source (not generic filler)

