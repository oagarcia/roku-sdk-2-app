// Copyright (c) 2026 Roku, Inc.
// SPDX-License-Identifier: MIT

import { FocusBoundary, ScreenControllerContext } from "@roku-sdk/navigation";
import { type Component, createSignal, onCleanup, onMount, useContext } from "@roku-sdk/solid";

import { BUTTON_WIDTH, FocusButton } from "./focus-button";
import { HelloWorldScreen } from "./hello-world-screen";

export const QUOTE_URL =
    "https://prod-main-api-704464-00tre1p1erm.compute.instacloud-edge.com/api/v1/public/quotes/quote/random";

export const QUOTE_LOADING_TEXT = "Cargando cita...";
export const QUOTE_ERROR_TEXT = "No se pudo cargar la cita";

/** Focus region holding the two buttons; the root boundary starts here. */
export const homeButtonsId: object = {};
const exitButtonId: object = {};

const BUTTON_GAP = 40;

interface Quote {
    content: string;
    author: string;
}

// JSON.parse checks nothing; confirm the fields the view reads.
const isQuoteResponse = (value: unknown): value is { data: Quote } => {
    const data = (value as { data?: unknown } | null)?.data as Partial<Quote> | null | undefined;
    return typeof data?.content === "string" && typeof data?.author === "string";
};

// A cancel rejects with a plain object, not an `Error`.
const isAbort = (error: unknown): boolean => (error as { name?: unknown } | null)?.name === "AbortError";

export const formatQuote = (quote: Quote): string => `"${quote.content}" — ${quote.author}`;

export const HomeScreen: Component<{ onExit: () => void }> = props => {
    const screens = useContext(ScreenControllerContext);
    const [quoteText, setQuoteText] = createSignal(QUOTE_LOADING_TEXT);

    const controller = new AbortController();
    onCleanup(() => controller.abort("unmounted"));

    const loadQuote = async () => {
        try {
            const response = await fetch(QUOTE_URL, { signal: controller.signal });

            // fetch resolves on 4xx/5xx, so this check is the error handling.
            if (!response.ok) {
                setQuoteText(QUOTE_ERROR_TEXT);
                return;
            }

            // Not `response.json()`: on a body that is not JSON it exits the app.
            const body: unknown = JSON.parse(await response.text());
            if (!isQuoteResponse(body)) {
                setQuoteText(QUOTE_ERROR_TEXT);
                return;
            }
            setQuoteText(formatQuote(body.data));
        } catch (error) {
            if (!isAbort(error)) {
                const { name, message } = (error ?? {}) as { name?: unknown; message?: unknown };
                console.log(`Quote request failed: ${String(name)} ${String(message)}`);
                setQuoteText(QUOTE_ERROR_TEXT);
            }
        }
    };

    onMount(() => void loadQuote());

    return (
        <layoutGroup
            translation={[960, 540]}
            layoutDirection="vert"
            vertAlignment="center"
            horizAlignment="center"
            itemSpacings={[0, 0, 40]}
        >
            <label
                id="titleLabel"
                color="0xFFFFFFFF"
                font="font:ExtraLargeSystemFont"
                text="My First App"
                horizAlign="center"
                vertAlign="center"
                width={1920}
                height={100}
            />
            <label
                id="subtitleLabel"
                color="0xFFFFFFFF"
                font="font:LargeSystemFont"
                text="Roku RSG"
                horizAlign="center"
                vertAlign="center"
                width={1920}
                height={80}
            />
            <scrollingLabel
                id="quoteLabel"
                color="0xCCCCCCFF"
                font="font:MediumSystemFont"
                text={quoteText()}
                horizAlign="center"
                vertAlign="center"
                maxWidth={400}
                height={60}
            />
            <group id="homeButtons">
                <FocusBoundary focusId={homeButtonsId} initialFocus={exitButtonId} navigation="horizontal">
                    <FocusButton id="exitButton" text="Exit" focusId={exitButtonId} onSelect={() => props.onExit()} />
                    <FocusButton
                        id="helloButton"
                        text="Hello World"
                        x={BUTTON_WIDTH + BUTTON_GAP}
                        onSelect={() => screens.pushScreen(() => <HelloWorldScreen />)}
                    />
                </FocusBoundary>
            </group>
        </layoutGroup>
    );
};
