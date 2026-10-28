# The Adventure Library

A static adventure selection page for Pam's Programming. The Loki Paradox remains at https://loki.pamsprogramming.com/ and is not changed by this project.

## Publish on GitHub Pages

1. Create a new GitHub repository (for example `adventure-library`).
2. Upload **all files from this folder to the repository root**: `index.html`, `styles.css`, `script.js`, `CNAME`, and `README.md`. Commit to the `main` branch.
3. Go to **Settings → Pages**. Under **Build and deployment**, select **Deploy from a branch**, branch `main`, folder `/ (root)`, and Save.
4. At your DNS provider, add a CNAME record with **Host** `adventures` and **Target** `beautifullybroken76.github.io` (provided that this is the GitHub account owning the repo).
5. In **Settings → Pages**, confirm the custom domain `adventures.pamsprogramming.com`. Once the certificate is issued, enable **Enforce HTTPS**.

The included `CNAME` file records the custom domain. The site does not require an API or database for this first release.

## Notes

- The Loki card links to the existing production game.
- The other two cards are placeholders, not active games.
- The names and designs of the future worlds are original working concepts and can be changed later.
- The visual uses CSS only; no images or asset licensing is required. Google Fonts is used for typography, with local fallback fonts.
