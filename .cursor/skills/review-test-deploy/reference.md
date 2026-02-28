# Review, Test & Deploy — Reference

## Vercel token

- Store your Vercel token in an **environment variable** `VERCEL_TOKEN`, not in the skill or in code.
- **Windows (PowerShell)**: `$env:VERCEL_TOKEN = "your_token"`
- **Windows (CMD)**: `set VERCEL_TOKEN=your_token`
- **Unix / Git Bash**: `export VERCEL_TOKEN=your_token`
- Optional: add to a local `.env` file that is **not** committed (e.g. in `.gitignore`), and load it in your shell or in the app that runs the deploy.

Never commit the token or put it in `SKILL.md` or any tracked file.

## When the agent deploys

The agent will only deploy after:
1. Review is done and critical/suggestion issues are fixed
2. Tests are written and the full test suite (and lint if applicable) passes
3. You explicitly confirm (e.g. reply "yes" to deploy)

If you don’t want to deploy, say "no" or "skip deploy" and the agent will stop at the test step.
