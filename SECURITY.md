# Security Policy

`@skhema/embed` is published from Skhema's private monorepo and mirrored here as a
read-only, provenance-attested build artifact.

## Reporting a vulnerability

Please do **not** open a public issue for security reports. Email
[security@skhema.com](mailto:security@skhema.com) with details and, if possible, a
reproduction. We will acknowledge receipt and coordinate a fix and disclosure
timeline with you.

## Verifying this package

Each release is published to npm with build provenance. You can verify the
attestation linking the tarball to this repository and its build with:

```sh
npm audit signatures
```
