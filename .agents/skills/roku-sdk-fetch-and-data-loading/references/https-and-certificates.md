<!-- @roku-sdk/ai managed v=1 hash=3d86786b443ae03adfc696e955e178fa738227c1c31a970782d62c3968c2b6c8 skills=1 do-not-edit -->

# Reaching a host behind your own certificate authority

The body says *which* option points a request at a CA bundle. This file is the shape of it:
where the bundle has to live, how to use it on every request the app makes, and what the
failure looks like when it is missing.

## Attaching the agent

`HttpsAgent` is a constructor, and a request uses the agent it produces only through that
request's own `agent` field. There is **no app-wide default**: the firmware has no
`setGlobalAgent`, so code that calls one does not compile, and on a device it would throw
`TypeError`.

**One host.** Build the agent and put it on the requests to that host. Right for a single
staging host while everything else keeps the platform trust store.

**Every host.** When everything the app talks to sits behind the same internal authority, do
not copy an `agent` onto two dozen call sites and miss one. Build the agent once in a module
and route every call through one function that adds it. The sample needs SDK 2.20.0: on 2.19.1
and earlier, `fetch` is typed by the browser's DOM library, whose `RequestInit` has no `agent`
field and whose `Response` is not a `ResponseInstance`.

```ts rsg-skill=complete
import type { RequestInit, ResponseInstance } from "@roku-sdk/interfaces";

const agent = new HttpsAgent({ certificatesFile: "pkg:/certs/internal-ca.crt" });

export const request = (url: string, init: RequestInit = {}): Promise<ResponseInstance> =>
    fetch(url, { ...init, agent });
```

The agent is built when the module first loads, which happens once however many components
import `request`.

## Where the bundle lives

`certificatesFile` is a URI the firmware reads, not a path the bundler resolves, so it is a
`pkg:/` location and the file has to be inside the package. That makes it one of the few places
in an RSG app where a hardcoded `pkg:/` URI is correct: the image-import rule exists because
the build pipeline rewrites image paths, and it does not process a certificate bundle.

Keep it under the app's `pkg/` directory so it ships, and remember that anything there is
readable by anyone who unpacks the app — a CA bundle is public by nature, but a client
certificate with a private key is not, and does not belong in a package.

## Which type describes the options

`HttpsAgentOptions` is `{ certificatesFile?: string }` and is exported from
`@roku-sdk/interfaces`. Note that it is the *only* field: there is no verification-disabling
switch here, and no per-host override. If a host fails to verify, the answer is the right
bundle, not a way around the check.

## What the failure looks like

A missing or wrong bundle rejects the call the way a transport failure does, because from the
runtime's point of view the connection never completed — so it reaches a `catch`, not the `ok`
check the body describes for HTTP statuses. The rejection is a plain `{ name, message }` object,
not an `Error`, and its `name` is `"DataError"` for a certificate failure and an unresolvable host
alike. Only the `message` tells them apart — a certificate failure names the SSL peer certificate —
so log both fields rather than testing `instanceof`.

That distinction is worth holding onto, because the two failures need opposite fixes:

| What happened | Where it surfaces | Fix |
|---|---|---|
| The certificate could not be verified | The promise rejects, so a `catch` | Attach the CA bundle |
| The server answered with 4xx or 5xx | The promise **resolves**; only `ok` is false | Read the status and handle it |

So a request that works against production and rejects against staging is usually a trust
problem rather than a server problem, and a request that "fails" with a body you can read is
the opposite.
