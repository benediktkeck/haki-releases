# Haki downloads

Haki is a local-first coding workspace for Codex and OpenCode. This repository hosts packaged runtime previews for Windows x64 and Linux x64. The development repository remains private for now.

## Download 0.3.6

- [Windows x64 ZIP](https://github.com/benediktkeck/haki-releases/releases/download/v0.3.6/haki-server-0.3.6-win32-x64.zip)
- [Linux x64 TGZ](https://github.com/benediktkeck/haki-releases/releases/download/v0.3.6/haki-server-0.3.6-linux-x64.tgz)
- [Installation and update instructions](https://github.com/benediktkeck/haki-releases/releases/tag/v0.3.6)
- [SHA-256 checksums](https://github.com/benediktkeck/haki-releases/releases/download/v0.3.6/SHA256SUMS)

Downloads require no GitHub account. Extract the archive once; Node is bundled, so Haki needs no npm or system Node installation. Git and the provider CLIs must be installed and authenticated on the machine running Haki.

These are unsigned previews. Checksums detect corruption, not publisher authenticity. Windows login startup without a terminal was confirmed on 0.3.5; Linux boot/login and WSL networking remain separate validation gates. Finish active runs before updating. The updater preserves saved settings, conversations and browser pairing.

## Signed updates

After the one-time manual upgrade from 0.3.5 to 0.3.6, the installed launcher supports `haki update check` and `haki update`. It verifies publisher signatures and downloads the matching archive before using the existing backup/recovery flow. Installation remains deliberate; active work blocks updating. See the release instructions for full Windows commands and [signing details](SIGNING.md).

## Future home

If Haki becomes open source, releases can move to the main repository without reinstalling the application or moving user data. This repository can remain archived temporarily so existing versioned download links continue working. Migration details and the new destination will be announced here before retirement.
