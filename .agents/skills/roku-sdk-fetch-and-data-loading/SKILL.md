---
name: roku-sdk-fetch-and-data-loading
description: "Use when an RSG SDK TypeScript app has to load data over the network — calling fetch with a method, headers and a string body, checking ok because a 4xx or 5xx resolves instead of rejecting, parsing a body's text with JSON.parse because json on a malformed body exits the app, narrowing the unknown result, cancelling a request with AbortController, and pointing HttpsAgent at a custom certificate file. Not when the rows of a FlexGrid fill in, which that grid owns; and not scaffolding or which packages an app declares, which is project-setup."
# @roku-sdk/ai managed v=1 hash=b279fef829a875064bf336fdd4ae6f3821cff42170ba913f2fa95ab182e24396 skills=1 do-not-edit
---

# Loading data over the network

## Overview

Requests in an RSG app go through a `fetch` the firmware provides. It looks like the web's and
differs in ways that fail quietly: an error status **resolves** rather than rejecting, a body
must be a **string**, and what comes back is the platform's `ResponseInstance`, not the
browser's `Response`. One difference fails loudly: `response.json()` on a body that is not JSON
**exits the app**, and no `catch` stops it.

The compiler knows this. `@roku-sdk/interfaces/global`, which the SDK's shared `tsconfig.json`
loads, declares `fetch` and the request globals with this platform's types, and the browser's
DOM library is not part of an app's program. So a non-string body or an option such as `mode`
or `cache` is a **compile error**, not a runtime surprise. The parsed body is the exception:
`JSON.parse` returns `any`, so the compiler checks it only once you annotate it `unknown`.

**Reaching a host behind your own certificate authority is in
`references/https-and-certificates.md`.** Read it when a request works against production and
fails against staging. The tables below name the option; that file has where the bundle lives,
how to use it on every request the app makes, and why a trust failure surfaces in a different
place from an HTTP error.

## When to Use

| If the request is | Then |
|---|---|
| Calling an HTTP API from an RSG app | Here |
| A POST or PUT with headers and a body | Here — the body has to be a string |
| An error status that never reached your error handling | Here — `fetch` resolved |
| Which type describes a response, or why the parsed body will not let you read a field | Here |
| The app exits on a `SyntaxError` from `response.json()`, `try` or not | Here — parse the text instead |
| Cancelling a request when the screen that wanted it goes away | Here — `AbortController` |
| A host whose certificate this box does not trust | `references/https-and-certificates.md` |

### When not to use

| Situation | Use instead | Because |
|---|---|---|
| Filling a virtualized shelf's rows as the viewer approaches them | The `flex-grid` skill | That grid owns *when* a row is fetched. This skill owns the call it makes |
| Feeding a SceneGraph-native list its items, or telling which components take data that way | The `sdk-components` skill | Recognising a `content`-fed node is a component question, not a transport one |
| Which packages the app must declare, or where a file has to live to be imported | The `project-setup` skill | The scaffold already covers what this skill needs |
| Reading what Roku itself holds about the viewer, or selling something in-channel | The `user-accounts-and-purchases` skill | That goes through a component and a command, not through HTTP |
| Getting logs or a crash off a device | The `cli-dev-loop` or `mcp-ai-dev-loop` skill | Those are about observing the app, not about what it requests |

## Quick Reference

| Want | Do |
|---|---|
| A GET | `fetch(url)` |
| Anything with a method, headers or a body | `fetch(url, init)`, or the equivalent `fetch(new Request(url, init))` |
| The parsed body | `const body: unknown = JSON.parse(await response.text())` inside `try`, then narrow it with a type guard |
| Raw text | `await response.text()` |
| To know an error status happened | Check `response.ok`. **The promise already resolved** |
| A response header | `response.headers.get("content-type")` — lowercase name; `undefined` when absent |
| To cancel a request | Pass `signal: controller.signal` from `new AbortController()`, then `controller.abort()` |
| A custom CA | `agent: new HttpsAgent({ certificatesFile })` on the request — see the reference |

Where things come from:

| | |
|---|---|
| `fetch` | A firmware global, typed by `@roku-sdk/interfaces/global`. Nothing to import |
| `Request`, `Headers`, `HttpsAgent`, `AbortController` | Globals too, but **installed by `@roku-sdk/native`**, which arrives through `@roku-sdk/rsg-ts`, so the app declares nothing for them. `Response` and `AbortSignal` are installed the same way, but a response comes from `fetch` and a signal from a controller: `new Response()` takes no body |
| `ResponseInstance`, `RequestInit`, `HttpsAgentOptions` | Types, from `@roku-sdk/interfaces` |

## Instructions

1. **Pass method, headers and body as `init`.** `fetch(url, init)` and
   `fetch(new Request(url, init))` send the same request; the firmware reads `init` from
   Roku OS 16.0, which is the SDK's minimum. `RequestInit` has `method`, `headers`, `body`,
   `signal` and `agent` and nothing else, so the browser's `mode`, `credentials`, `cache`,
   `redirect` and `keepalive` are compile errors in an object literal — remove them, the
   firmware has no such options.

2. **Send a string body.** `body` is typed **`string` only** — no form data, no object, no
   stream, no typed array; anything else rejects. Serialize first.

3. **Check `ok` before reading the body.** A 4xx or 5xx is a *resolved* response, so error
   handling written as a `catch` never sees it. Only a transport failure — or a cancel —
   rejects, and either way with a plain `{ name, message }` object, not an `Error`. A body can
   be read once; a second `json()` or `text()` rejects.

4. **Parse with `JSON.parse(await response.text())`, not `response.json()`.** The firmware's
   `json()` throws a malformed body's `SyntaxError` outside the promise, where no `try`/`catch`
   reaches it, and the app exits — an HTML error page or a captive portal answering `200` is
   enough. `JSON.parse` throws an ordinary, catchable `SyntaxError`.

5. **Narrow the parsed body; do not cast it.** `JSON.parse` returns `any`, so annotate the
   result as `unknown` — `const body: unknown = JSON.parse(text)` — and confirm the shape your
   code relies on with a type guard. Typing the variable as the shape you hope for instead, or
   writing `json<Title>()`, compiles and checks nothing: the server can send anything.

6. **Cancel with `AbortController`, and tell a cancel from a failure by its `name`.** Pass
   `controller.signal` as `init.signal` and call `controller.abort()` from `onCleanup`. The
   request then rejects with a plain `{ name: "AbortError", message }` object — **not an
   `Error`**, so an `instanceof Error` check misses it. `abort()` after the request finished,
   or a second `abort()`, does not throw and leaves the settled request alone, so cleanup needs
   no guard; the signal then reads `aborted`, with the first call's reason. `abort` takes only a
   string reason; anything else throws. The signal fires no events — read `signal.aborted` if
   you need to know.

7. **Load from `onMount`, and let a signal carry the state.** Nothing about the request is
   reactive on its own, so the pattern is: fire it on mount, write the result into a signal, and
   render off that signal's three states — not yet, failed, arrived.

8. **Do not switch a base URL on a build variable.** Those are compiled away, and a request to
   the wrong environment is the one bug that looks like a server problem. Read the environment
   from configuration the app can actually see at runtime.

## Example

A GET whose result drives the view, cancelled if the component unmounts first, with the `ok`
check and the shape check in the places they belong.

```tsx rsg-skill=complete
import { Component, createSignal, onCleanup, onMount } from "@roku-sdk/solid";

interface Title {
    id: string;
    name: string;
}

// Parsing checks nothing; confirm the shape the view reads.
const isTitleList = (value: unknown): value is { titles: Title[] } => {
    const titles = (value as { titles?: unknown } | null)?.titles;
    return Array.isArray(titles) && titles.every(t => typeof (t as Title | null)?.name === "string");
};

// A cancel rejects with a plain object, not an `Error`.
const isAbort = (error: unknown): boolean => (error as { name?: unknown } | null)?.name === "AbortError";

export const Shelf: Component<{ endpoint: string }> = props => {
    const [titles, setTitles] = createSignal<Title[] | undefined>(undefined);
    const [failed, setFailed] = createSignal(false);

    const controller = new AbortController();
    onCleanup(() => controller.abort("unmounted"));

    const load = async () => {
        try {
            const response = await fetch(`${props.endpoint}/titles`, { signal: controller.signal });

            // Already resolved, even on 404 — so this check is the error handling.
            if (!response.ok) {
                setFailed(true);
                return;
            }

            // Not `response.json()`: on a body that is not JSON it exits the app.
            const body: unknown = JSON.parse(await response.text());
            if (!isTitleList(body)) {
                setFailed(true);
                return;
            }
            setTitles(body.titles);
        } catch (error) {
            // A transport or trust failure, a body that is not JSON, or the cancel above.
            if (!isAbort(error)) setFailed(true);
        }
    };

    onMount(() => void load());

    return (
        <group>
            <label text={failed() ? "could not load" : titles() === undefined ? "loading" : ""} />
            <label text={(titles() ?? []).map(t => t.name).join(", ")} translation={[0, 48]} />
        </group>
    );
};
```

A POST passes its method, headers and body as `init`, and the body is a string:

```tsx
const response = await fetch(`${endpoint}/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titleId, seconds })
});
```

## Common Mistakes

| Symptom | Cause | Fix |
|---|---|---|
| A 404 or 500 never reaches the error path | The promise resolved; only a transport failure rejects | Check `response.ok` before reading the body |
| The app exits with `SyntaxError: JSON Parse error` and `EXIT_JAVASCRIPT_EXCEPTION`, though the `await response.json()` is inside `try` | The firmware's `json()` throws a malformed body's error where no `catch` reaches it | Parse with `JSON.parse(await response.text())`, whose error is catchable |
| `Property 'title' does not exist on type 'unknown'` on the parsed body | The result was taken as `unknown`, as it should be | Narrow it with a type guard |
| `const titles: Title[] = JSON.parse(text)` or `= await response.json()` compiles, then a field is missing at runtime | `JSON.parse` returns `any`, and `json()` takes its type from the variable — both are unchecked casts | Annotate the result `unknown` and narrow it |
| A failed request logs `[object Object]`, or `error instanceof Error ? error.message : …` never takes the first branch | A transport failure rejects with a plain `{ name, message }` object, like a cancel | Read `name` and `message` off the object |
| `mode`, `credentials` or `cache` is a compile error | `RequestInit` is this platform's: `method`, `headers`, `body`, `signal` and `agent`, and nothing else | Remove the field |
| Sending an object or form data as `body` fails | `body` is typed `string` | Serialize it yourself |
| `response.headers.get("Content-Type")` is `undefined` | The firmware lower-cases response header names, and `get` is case-sensitive | Ask for `"content-type"`; compare with `undefined`, not `null` |
| The second read of a body rejects | A body can be read once | Read it once and keep the value |
| A cancelled request shows the error state | The `catch` treats the cancel as a failure | Check `name === "AbortError"`; it is not an `instanceof Error` |
| `controller.abort(new Error("…"))` throws | `abort` takes only a string reason | Pass a string, or nothing |
| `HttpsAgent.setGlobalAgent` is a compile error, or a `TypeError` on device | There is no app-wide default agent | Put the agent on each request — `references/https-and-certificates.md` |
| `Request` or `AbortController` resolves in the editor with no import, and it feels like a mistake | It is a global that `@roku-sdk/native` installs | Nothing to import for the value; take the *types* from `@roku-sdk/interfaces` |
| Requests work in production and fail against staging | The staging certificate is not in the platform trust store | `references/https-and-certificates.md` |
| The app talks to the wrong environment in a release build | The base URL was chosen from a build variable, which the build removed | Read it from runtime configuration |

Request and response types are documented with TSDoc in `@roku-sdk/interfaces`. Read a field's
exact shape there rather than assuming the browser's.
