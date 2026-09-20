# Signed preview updates

Ed25519 publisher public-key SPKI SHA-256 fingerprint:
`6aaf738026e625419d06140461789f1dba97138cc792c550cec9499ecf834f80`

The private key is held in the `release-signing` environment, restricted to `main` and requiring owner review. Ordinary builds and pull requests do not receive it. The manual signing job hashes already-published archives without executing application code.

Select **Actions → Sign preview update**, enter the published version, then review the pending deployment. The job signs metadata valid for 30 days and publishes `channels/preview.json`. Refresh before expiry even if no new version ships. Expired metadata stops network updates; local archive recovery remains available. A feed cannot regress versions or change archives for the same release.

Haki 0.3.6 introduces this client. Existing 0.3.5 installations need one manual archive upgrade to acquire the pinned public key. Metadata signatures are not Windows Authenticode signatures and do not suppress SmartScreen. Initial installation still requires a trusted download source.

Key rotation must first deliver a replacement public key through an update signed by an already trusted key. Never adopt keys supplied only by an unsigned feed. Keep an encrypted recovery copy; GitHub secrets cannot be downloaded as a backup.
