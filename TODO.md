# README Generator (Module 2) — TODO

## Backend
- [x] Create `backend/app/models/readme_generation.py`
- [x] Create `backend/app/schemas/readme_generation.py`
- [x] Create `backend/app/ai/prompts/readme_generator_prompt.py`
- [x] Create `backend/app/ai/readme_generator/__init__.py`
- [x] Create `backend/app/ai/readme_generator/generator.py`
- [x] Create `backend/app/services/readme_generation_service.py`
- [x] Create `backend/app/services/readme_upload_processor.py` (zip-bomb-safe extraction)
- [x] Create `backend/app/api/routes/readme_generator.py`
- [x] Update `backend/app/main.py` (register model import + router)

## Frontend
- [x] Create `frontend/src/types/readmeGeneration.ts`
- [x] Create `frontend/src/services/readmeGenerationService.ts`
- [x] Create `frontend/src/hooks/useReadmeGeneration.ts`
- [x] Create `frontend/src/components/ReadmeHistoryList.tsx`
- [x] Create `frontend/src/components/ReadmeResultView.tsx`
- [x] Create `frontend/src/pages/ReadmeGeneratorPage.tsx`
- [x] Update `frontend/src/App.tsx` (protected route `/readme/generate`)
- [x] Update `frontend/src/components/AppLayout.tsx` (nav links)

## Verification
- [x] `npm run lint` + `npm run build` (frontend)
- [x] Backend starts cleanly; import check
- [x] E2E: generation via description + real ZIP, two-user isolation, oversized upload → 400
- [ ] Show full diff before committing

