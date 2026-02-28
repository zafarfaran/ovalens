# Secrets cleanup task (if env files were committed)

**ENV-VARIABLES.txt** in this repo is now redacted (no real token/key values). If you had already pushed a version with real values, treat those secrets as compromised and rotate them.

**If any `.env` file with real values was ever committed:**

1. **Rotate these immediately:**
   - Vercel token (Vercel → Account Settings → Tokens → revoke and create new)
   - Supabase anon key / JWT secret if exposed (Supabase → Project Settings → API → rotate if needed)
   - Any API keys (Anthropic, OpenAI) that appeared in committed files

2. **Redact committed files:**
   - Replace real values in `docs/ENV-VARIABLES.txt` with empty placeholders or remove the file from the repo and use `OvalensPlanner/docs/ENV-SETUP.md` + `.env.example` files for setup.

3. **Going forward:** Use only `.env.example` (with placeholders) in the repo; store real values in local `.env` (gitignored), GitHub Secrets, or Vercel env.

See [ENV-SETUP.md](ENV-SETUP.md) for normal env setup.
