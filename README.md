# DNA landing page

HELIXA is a fictional life science brand. This independent design concept is inspired by the supplied UrTree video. Built with HTML, CSS and native WebGL; no package downloads or build step required.

## Run

From `/workspace/DNA-landing-page`, run `npm run dev` (Python 3 serves port 3000). Run `npm run check` to check JavaScript syntax.

## Interaction

The DNA rotates automatically. Drag horizontally to turn it and vertically to tilt it. Mouse position adds gentle parallax. Focus the DNA and use arrow keys to rotate, or Space to pause. The pause button is available for pointer and keyboard users. Rendering stops when a paused view has settled or the canvas is offscreen, and resumes when needed. Mobile pixel density is capped to reduce GPU load. Reduced-motion preferences disable automatic rotation and parallax. Mobile supports horizontal drag while retaining normal vertical page scrolling.

## DNA fragment explorer

Click a tracked marker or a rung of the DNA to fly toward that structure. The camera moves forward, orbits into a close-up, and smoothly tracks between selected fragments. Ring-shaped emissive collars mark the tubular backbone connections. On desktop, the story appears on the right after the camera starts moving; on mobile it appears below the close-up. The selected fragment is highlighted and an information panel explains A–T pairing, G–C pairing, or the sugar–phosphate backbone. Choose another structure in the panel, or use “Back to full DNA” / Escape to restore the overview. Auto-rotation pauses during inspection and returns to the previous pause state afterward. Dragging more than 7 CSS pixels remains rotation rather than selection. Keyboard users can tab to the markers or focus the canvas and press Enter. Reduced-motion mode applies the camera change immediately.

Descriptions are general educational content. The geometry is a simplified illustration, not an atomically accurate molecular model or a specific genomic sequence. Fragment selection data and descriptions are in `features` in `app.js`.

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

The Pages workflow validates the DOM/renderer contract, publishes a revision manifest, and then checks the live HTTPS page and critical assets without authentication. A successful “Verify public release and assets” step confirms the deployed commit. Use a WebGL-capable browser to test the interactive model. Research area cards open their own accessible dialogs and link back to DNA exploration.
