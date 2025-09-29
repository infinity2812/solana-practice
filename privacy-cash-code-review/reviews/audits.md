# Audits & Verification

## Audits
- Accretion and HashCloak audits at commit `188f0cd475397c4039bf126f7962282170395aad`.
- Reports: `audits/accretion_audit_report.pdf`, `audits/hashcloak_audit_report.pdf`.

## On-chain verification
- Program ID: `9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD`.
- Verified so hash of on-chain `zkcash.so` equals local verifiable build at audited commit.
- Steps (from root README):
  - Dump on-chain program and hash.
  - Checkout audited commit; `anchor build --verifiable`.
  - Compare sha256 equals `855d2317...66884e3a`.

## Notes
- Any change to circuits or verifying key mandates new audit or at minimum verifiable build and hash pinning.
