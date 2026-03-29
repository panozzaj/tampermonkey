# Tampermonkey

Here are some [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en) scripts I've made to make my browsing experience a bit better.

## Local development setup

The actual script logic lives in the root `.js` files. The `stubs/` directory contains thin loader scripts that you paste into Tampermonkey — each stub has only the `==UserScript==` metadata block plus a `@require file://` pointing to the real local file.

This means you edit scripts in your editor and changes take effect on the next page load, with no manual copy-paste into Tampermonkey.

### One-time setup

1. Enable "Allow access to file URLs" for Tampermonkey in `chrome://extensions`
2. For each script you want active, create a new Tampermonkey script and paste the contents of the corresponding `stubs/` file
3. Disable or delete any old copies of the same script in Tampermonkey

### Adding a new script

1. Create `my-script.js` in the repo root with a full `==UserScript==` header
2. Create `stubs/my-script.js` with just the header + `@require file:///...path.../my-script.js`
3. Paste the stub into Tampermonkey
