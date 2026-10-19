# DNA landing page

HELIXA is a fictional life science brand. This independent design concept inspired by the supplied UrTree video. Built with HTML, CSS and native WebGL; no package downloads or build step required.

## Run

From `/workspace/DNA-landing-page`, run `npm run dev` (Python 3 serves port 3000). Run `npm run check` to check JavaScript syntax.

## Interaction

The DNA rotates automatically. Drag horizontally to turn it and vertically to tilt it. Mouse position adds gentle parallax. Focus the DNA and use arrow keys to rotate, or Space to pause. The pause button is available for pointer and keyboard users. Reduced-motion preferences disable automatic rotation and parallax. Mobile supports horizontal drag while retaining normal vertical page scrolling.

## Design configuration

Edit the color tokens at the beginning of `styles.css`. HELIXA uses an original yellow-green palette (`--brand: #c4e83d`), with lemon-yellow highlights, lime gradients and a near-black green background. The brand and wordmark are fictional.

Geometry and glass-like lighting are generated locally in `app.js`. There are no external fonts, textures, tracking scripts, or runtime dependencies. Browsers without WebGL receive an explanatory fallback. Navigation and solution links stay within this concept site.


## Public deployment

### Netlify manual upload

Unzip `HELIXA-public-deploy.zip` and drag the extracted `HELIXA-public` folder (containing `index.html` directly) into https://app.netlify.com/drop. Sign in if prompted. Netlify assigns an HTTPS address; the site settings allow choosing a site name or adding a custom domain. No environment variables or build tools are needed for manual upload.

### Netlify connected repository

Connect this repository in Netlify. The included `netlify.toml` builds a `public` folder containing only the website assets and HTTP headers. No dependency installation is required.

### GitHub Pages

Push the project to `main`, select Settings → Pages → Build and deployment → Source → GitHub Actions, and run the Publish HELIXA workflow. This publishes the `_site` artifact via the included workflow. GitHub Pages must be available on the repository's current account plan and visibility. Relative asset paths support repository subdirectories. Custom response headers from `_headers` apply on Netlify, not GitHub Pages.

Deployment config is prepared locally; no live public deployment has been verified. After publishing, verify the assigned HTTPS URL, drag-to-rotate DNA, Pause/Resume, and mobile menu in a WebGL-capable browser.
