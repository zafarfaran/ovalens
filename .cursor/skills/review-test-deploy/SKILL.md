---
name: review-test-deploy
description: Code-review features, write tests, run test suite, and deploy to Vercel after tests pass. Use when working on a feature and the user wants review, tests, and optional Vercel deployment, or when they mention "review and test" or "deploy to Vercel".
---

# Review, Test & Deploy

Apply this workflow when developing a feature: **code review** → **write/update tests** → **run tests** → **ask user** → **deploy to Vercel** (only if user confirms).

## When to Use

- User asks for code review, tests, or deployment for a feature
- User says "review and test" or "deploy when ready"
- Finishing a feature and user wants quality gate + optional deploy

---

## 1. Code Review

Review the changed/added code for the feature:

- **Correctness**: Logic, edge cases, off-by-one, null/undefined handling
- **Security**: Input validation, auth, secrets not exposed, injection (SQL/XSS)
- **Style & maintainability**: Naming, single responsibility, duplication, project conventions
- **APIs & contracts**: Types, error handling, compatibility with callers

**Output**: Short review (bullet list). Use:
- **Critical**: Must fix before merge
- **Suggestion**: Should fix
- **Nice to have**: Optional

Fix any **Critical** (and preferably **Suggestion**) items before moving on.

---

## 2. Write or Update Tests

For the same feature:

- Add or update **unit tests** for new/changed functions or components
- Add or update **integration tests** if the feature touches APIs or DB
- Follow existing test patterns in the repo (e.g. Jest, Vitest, pytest, Playwright)
- Place tests next to code or in the project’s test directory per project layout

Run the new/updated tests locally and ensure they pass.

---

## 3. Run Full Test Suite

Before suggesting deployment:

- Run the **entire** project test suite (e.g. `npm test`, `pnpm test`, `yarn test`, `pytest`, etc.)
- If the project has lint/type-check, run those too (e.g. `npm run lint`, `tsc --noEmit`)
- Do **not** suggest deploy if any test or lint fails; fix failures first and re-run

---

## 4. Ask User Before Deploying

**Always ask for explicit confirmation before deploying.**

When all of the following are true:

- Code review is done and critical/suggestion issues are addressed
- Feature tests exist and pass
- Full test suite (and lint/type-check if applicable) passes

Then say something like:

> "Code review is done, tests are written and the full test suite passes. Do you want to deploy this to Vercel now? Reply **yes** (or confirm) to deploy."

- If the user says **yes** (or clearly confirms), proceed to **Deploy to Vercel**.
- If the user says **no** or does not confirm, **do not deploy**. You may summarize what was done (review, tests, green suite).

---

## 5. Deploy to Vercel

Deploy **only after** the user has explicitly confirmed.

### Prerequisites

- **Vercel CLI** available (`vercel` or `npx vercel`), or use Vercel’s deploy API/CI.
- **Token**: Use the Vercel token from the **environment**. Do **not** hardcode the token in the skill or in code. Prefer:
  - `VERCEL_TOKEN` in the environment, or
  - User providing the token when they confirm (e.g. pasted once per session), then use it only for that deploy and do not store it in repo or skill.

If no token is available when the user confirms, ask: "To deploy to Vercel I need a Vercel token. Set `VERCEL_TOKEN` in your environment or paste it here (it will only be used for this deploy)."

### Deploy steps

1. Ensure you’re in the project root (or the app subpath that has `vercel.json` or is the Vercel app).
2. If using CLI and token from env:
   - `vercel --token $VERCEL_TOKEN` (or `%VERCEL_TOKEN%` on Windows) for preview, or
   - `vercel --prod --token $VERCEL_TOKEN` (or `%VERCEL_TOKEN%` on Windows) for production, per user’s usual workflow.
3. If the user gave the token in chat when confirming, use it only for this single command (e.g. `vercel --prod --token <token>`), and do not save it to any file.
4. After deploy, report success/failure and the deployment URL if Vercel outputs it.

### Security

- Never commit or store the Vercel token in the repo or in this skill file.
- Prefer environment variable; if the user pastes the token, use it only for the one deploy and remind them to revoke/rotate if it was shared by mistake.

---

## Workflow Summary

```
Feature work
    → Code review (fix critical/suggestion)
    → Write/update tests → run new tests
    → Run full test suite (+ lint/type-check)
    → If all pass: ask user "Deploy to Vercel? (yes to confirm)"
    → If user confirms: deploy using VERCEL_TOKEN (or user-provided token)
    → Report deploy result
```

Keep the skill under 500 lines; add a short `reference.md` only if you need extra Vercel or project-specific details.
