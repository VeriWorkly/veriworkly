# What the licence covers

This file exists so nobody has to guess. It explains what our MIT `LICENSE` does and
does not reach, and it is written to be read by someone deciding whether they can use
our work — not by a lawyer.

## The short answer

**Everything in this repository is MIT.** One `LICENSE` file at the root, no
per-directory licences, no per-file headers. If it is in the tree, MIT covers it.

That includes the parts people most often assume are held back:

- All **resume and cover letter templates**.
- All **portfolio templates**, including the ones we charge for on the hosted service —
  Nimbus and Cipher as well as Signal and Atelier.
- The **ATS scoring engine**, the document renderer, and the export pipeline.
- The marketing site, the studio, the server, and the shared packages.

MIT grants you the right to use, copy, modify, merge, publish, distribute, sublicense,
and **sell** all of it. There is no non-commercial carve-out and no field-of-use
restriction, because MIT has neither.

## What is not covered

**Our brand.** The VeriWorkly name, wordmark, logo, and brand assets are trademarks and
MIT does not license trademarks. See [`TRADEMARK.md`](TRADEMARK.md) for the detail and
for what to change when you fork.

**Our hosted service.** Using `veriworkly.com` and `app.veriworkly.com` is governed by
the [Terms of Service](https://veriworkly.com/terms), not by MIT. The licence gives you
rights in the code; it does not give you rights over our servers, our database, or
another user's account.

**Our runtime AI configuration.** Model selection and prompt policy resolve at runtime
from a private configuration and are not in this repository. The code that consumes
them is MIT; the values are not published. This is why we describe the project as
*open-core* rather than fully open-source — the distinction is real and we would rather
name it than blur it.

**Third-party dependencies.** Each carries its own licence. `npm ls` and the lockfile
are the authority, not this file.

## Paid features and open source are not in tension

A fair question: if the templates are MIT, what are people paying for?

They are paying for the hosted service — publishing, a subdomain, analytics, AI credits,
the badge removed. Not for access to the design. You can take Nimbus, self-host it, and
never pay us anything, and that is a deliberate consequence of the licence rather than
an oversight in it.

## If we ever change this

Two things would stay true, and we are writing them down now so they are on the record:

1. **Relicensing is not retroactive.** Anyone who has obtained a version under MIT keeps
   MIT rights in that version forever. We could change the licence going forward; we
   could not claw back what is already published.

2. **We may not be able to relicense at all.** Contributions from other people are their
   copyright, licensed inbound under MIT by repository convention. Changing the licence
   would need every contributor's permission or an audit removing their work. The DCO
   sign-off in [`CONTRIBUTING.md`](CONTRIBUTING.md) fixes provenance from now on; it does
   not retroactively fix what is already merged.

If we ever move a template out of the open-source tree, it applies to versions published
after the move. Nothing already released stops being MIT.

## Questions

Open a discussion, or email **grievance@veriworkly.com**. If something here is ambiguous
that is our bug, and we would like to fix the wording.
