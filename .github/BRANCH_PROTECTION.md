# Branch protection (required for production)

GitHub → Settings → Branches → Add rule for `main`:

- Require a pull request before merging
- Require status checks to pass: **frontend**, **backend**
- Require branches to be up to date before merging
- Do not allow bypassing the above settings
- Restrict force pushes
- Restrict deletions

The CI workflow at `.github/workflows/ci.yml` defines those check names.

If `gh` is authenticated for this repo:

```bash
gh api -X PUT repos/{owner}/{repo}/branches/main/protection \
  -F required_status_checks='{"strict":true,"contexts":["frontend","backend"]}' \
  -F enforce_admins=true \
  -F required_pull_request_reviews='{"required_approving_review_count":1}' \
  -F restrictions=null
```
