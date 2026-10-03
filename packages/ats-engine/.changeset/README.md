# Changesets

Every change a user can notice gets a changeset: `npm run changeset`, pick the bump, describe
the change for the person upgrading. `changeset version` turns them into CHANGELOG.md.

**The rule:** a change to the report's shape, to the policy schema, or to the score or recovered
fields for the same input and policy is **breaking**. While the package is 0.x a breaking change
is a minor bump, and its entry starts with **Breaking:**; from 1.0 it is a major.
