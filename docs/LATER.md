# Features Postponed (Skip for Now)

As per project demo specifications, the following enterprise / production extensions are deferred to post-demo phases:

1. **Email / SMS Integration**: Replaced with clean server console logging and in-app status. No external credentials required.
2. **Multi-Step Draft Persistence**: Replaced with a unified single scrollable application form.
3. **OptNextRound & Complex Waitlists**: Simplified to deterministic Accept or Decline seat responses.
4. **Round Expiry Rules & Automatic Cancellation**: Deadlines are visual; manual admin-driven round closure.
5. **Revision after Publishing**: Published rounds remain immutable for the demo.
6. **Category Quota Sub-allocation**: Category is collected; seat matrix is merit rank-based.
7. **In-app Push Notifications**: State polling on active screens used instead.
8. **Complex Reports & Audit Log UI**: Core audit records are written on the server; UI displays live aggregate statistics.
9. **Faculty Counter Reassignment UI**: Seeded counter assignments used directly.
10. **Cloudinary / Remote Blob Storage**: Local disk storage adapter used (`./uploads`).
11. **Edit-after-Submit Admin Override UI**: Applications lock permanently upon submission.
