# VinylOS

VinylOS lets people manage a record collection and discover music. This glossary names the trust boundary between browser-initiated behavior and server-only work.

## Language

**Internal operation**:
An operation that only VinylOS server code may initiate. It has no browser-callable interface.
_Avoid_: Internal action, internal POST action

**User-facing action**:
An operation that VinylOS intentionally allows a browser to initiate. It may require a signed-in user or permit anonymous use.
_Avoid_: Public action

**Anonymous action**:
A user-facing action that does not require a signed-in user.
_Avoid_: Unauthenticated internal action
