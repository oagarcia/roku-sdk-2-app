// Copyright (c) 2026 Roku, Inc.
// SPDX-License-Identifier: MIT

/// <reference types="jest" />

import { createSignal } from "@roku-sdk/solid";
import { render, TestAnchorNode } from "@roku-sdk/testing-library";

import MyFirstApp, { QUOTE_ERROR_TEXT, QUOTE_URL } from "./my-first-app";

const TestMyFirstApp = TestAnchorNode(MyFirstApp);

type FetchMock = jest.Mock<Promise<{ ok: boolean; text: () => Promise<string> }>>;

const mockFetch = (ok: boolean, body: string): FetchMock => {
    const fetchMock: FetchMock = jest.fn(() => Promise.resolve({ ok, text: () => Promise.resolve(body) }));
    (globalThis as unknown as { fetch: FetchMock }).fetch = fetchMock;
    return fetchMock;
};

// Let the pending fetch promise chain settle.
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

const originalFetch = (globalThis as unknown as { fetch?: unknown }).fetch;

type KeyEvent = { key: string; press: boolean };

/** Renders the app with a keyEvent signal so tests can press remote keys. */
const renderApp = async () => {
    const [keyEvent, setKeyEvent] = createSignal<KeyEvent>({ key: "", press: false });
    const exitApp = jest.fn();
    const view = await render(() => (
        <TestMyFirstApp keyEvent={keyEvent()} focusActive={true} handledKeys={() => undefined} exitApp={exitApp} />
    ));
    await flushPromises();
    await view.transaction();

    const press = async (key: string) => {
        setKeyEvent({ key, press: true });
        await view.transaction();
        setKeyEvent({ key, press: false });
        await view.transaction();
    };

    return { ...view, press, exitApp };
};

describe("MyFirstApp Component", () => {
    beforeEach(() => {
        mockFetch(true, JSON.stringify({ data: { content: "Test quote", author: "Tester" } }));
    });

    afterEach(() => {
        (globalThis as unknown as { fetch?: unknown }).fetch = originalFetch;
    });

    test("renders and matches snapshot", async () => {
        const { toString, getByProp, dispose } = await renderApp();

        expect(toString(2)).toMatchSnapshot();
        getByProp("text", "My First App");
        getByProp("text", "Roku RSG");

        dispose();
    });

    test("renders the labels and both buttons", async () => {
        const { getByProp, dispose } = await renderApp();

        getByProp("id", "titleLabel");
        getByProp("id", "subtitleLabel");
        getByProp("id", "quoteLabel");
        getByProp("id", "exitButton");
        getByProp("id", "helloButton");
        getByProp("text", "Exit");
        getByProp("text", "Hello World");

        dispose();
    });

    test("loads a quote from the API and shows it", async () => {
        const fetchMock = mockFetch(true, JSON.stringify({ data: { content: "Test quote", author: "Tester" } }));
        const { getByProp, dispose } = await renderApp();

        expect(fetchMock).toHaveBeenCalledWith(QUOTE_URL, expect.anything());
        getByProp("text", '"Test quote" — Tester');

        dispose();
    });

    test("shows an error message when the API responds with an error", async () => {
        mockFetch(false, "");
        const { getByProp, dispose } = await renderApp();

        getByProp("text", QUOTE_ERROR_TEXT);

        dispose();
    });

    test("shows an error message when the body is not valid JSON", async () => {
        mockFetch(true, "<html>not json</html>");
        const { getByProp, dispose } = await renderApp();

        getByProp("text", QUOTE_ERROR_TEXT);

        dispose();
    });

    test("OK on the Exit button (focused first) requests app exit", async () => {
        const { press, exitApp, dispose } = await renderApp();

        await press("OK");

        expect(exitApp).toHaveBeenCalledWith(true);

        dispose();
    });

    test("the Hello World button opens the hello screen and Back returns home", async () => {
        const { press, queryByProp, getByProp, exitApp, dispose } = await renderApp();

        expect(queryByProp("id", "helloWorldLabel")).toBeNull();

        await press("right");
        await press("OK");
        getByProp("id", "helloWorldLabel");
        getByProp("text", "Hello World");
        getByProp("id", "catalogButton");

        await press("back");
        expect(queryByProp("id", "helloWorldLabel")).toBeNull();
        expect(exitApp).not.toHaveBeenCalled();

        dispose();
    });

    test("the catalog button opens the EPG, which navigates and pops back", async () => {
        const { press, queryByProp, getByProp, exitApp, dispose } = await renderApp();
        // The details panel shows the focused program's title.
        const selectedTitle = () =>
            (getByProp("id", "programTitle") as unknown as { props: { text?: string } }).props.text;

        await press("right");
        await press("OK"); // Hello World
        await press("OK"); // Ver catálogo — must not reach the home buttons underneath
        expect(exitApp).not.toHaveBeenCalled();

        getByProp("id", "catalogScreen");
        for (const name of ["Noticias 24", "Deportes+", "Cine Clásico", "Kids TV", "Música HD"]) {
            getByProp("text", name);
        }

        // Starts on what is airing now (21:10) on the first channel.
        expect(selectedTitle()).toBe("Mundo Hoy");

        await press("right");
        expect(selectedTitle()).toBe("Debate Abierto");

        // Down keeps the time: 21:30-22:30 on Deportes+ is the live match.
        await press("down");
        expect(selectedTitle()).toBe("Fútbol en Vivo: Clásico");

        await press("back");
        expect(queryByProp("id", "catalogScreen")).toBeNull();
        getByProp("id", "helloWorldLabel");

        await press("back");
        expect(queryByProp("id", "helloWorldLabel")).toBeNull();

        dispose();
    });
});
