# Add Client Slide-Out Panel Design

## Overview

Add a manual client creation flow to the `/clients` page via a slide-out panel from the right side. Advisers click a "+" button in the sidebar header, fill in client details, and submit. The new client appears in the list immediately.

## Architecture

### New Files

- `helio/apps/web/src/components/add-client-panel.tsx` — Self-contained form component
  - Props: `isOpen`, `onClose`, `onClientAdded`

### Modified Files

- `helio/apps/web/src/app/clients/page.tsx` — Add "+" button, import panel, manage open/close state
- `helio/apps/api/app/routers/clients.py` — Add `POST /api/clients` endpoint

## Panel UX

- Slides from right, ~480px wide, semi-transparent backdrop
- Framer Motion animation consistent with existing patterns
- Backdrop click or X button closes

### Form Sections

1. **Personal Details:** First name, Last name, Email, Date of birth
2. **Tax Identifiers:** NI Number (format: AB123456C), UTR (format: 10 digits)
3. **Profile:** Region (dropdown), Employment status (dropdown)
4. **Notes:** Free-text textarea (optional)

### Validation

- All 8 core fields required, notes optional
- Zod schema for client-side validation
- NI number: 2 letters + 6 digits + 1 letter
- UTR: 10 digits
- Email: standard format
- Inline error messages below each field

### Behavior

- Submit button disabled during submission with loading state
- On success: close panel, refresh client list, auto-select new client
- On error: show error message at top of form

## API Endpoint

`POST /api/clients`

Request body:
```json
{
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "date_of_birth": "YYYY-MM-DD",
  "ni_number": "string",
  "utr": "string",
  "region": "england|wales|scotland|northern_ireland",
  "employment_status": "string",
  "notes": "string (optional)"
}
```

Response: Created client object with id.

## Visual Design

- Matches existing Helio design system (CSS variables, Tailwind)
- Same input styling as sidebar search bar
- Section headers with subtle borders
- Consistent card/surface patterns
