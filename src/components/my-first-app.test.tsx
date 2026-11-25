// Copyright (c) 2026 Roku, Inc.
// SPDX-License-Identifier: MIT

/// <reference types="jest" />

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

describe("MyFirstApp Component", () => {
    beforeEach(() => {
        mockFetch(true, JSON.stringify({ data: { content: "Test quote", author: "Tester" } }));
    });

    afterEach(() => {
        (globalThis as unknown as { fetch?: unknown }).fetch = originalFetch;
    });

    test("renders and matches snapshot", async () => {
        const { toString, getByProp, transaction, dispose } = await render(() => <TestMyFirstApp />);
        await flushPromises();
        await transaction();

        expect(toString(2)).toMatchSnapshot();

        // Verify the title and subtitle labels are rendered
        getByProp("text", "My First App");
        getByProp("text", "Roku RSG");

        dispose();
    });

    test("renders with correct text content", async () => {
        const { getByProp, dispose } = await render(() => <TestMyFirstApp />);

        // Verify the title and subtitle labels exist with correct text
        getByProp("text", "My First App");
        getByProp("text", "Roku RSG");

        // Verify labels have the expected IDs
        getByProp("id", "titleLabel");
        getByProp("id", "subtitleLabel");
        getByProp("id", "quoteLabel");

        dispose();
    });

    test("loads a quote from the API and shows it", async () => {
        const fetchMock = mockFetch(true, JSON.stringify({ data: { content: "Test quote", author: "Tester" } }));
        const { getByProp, transaction, dispose } = await render(() => <TestMyFirstApp />);
        await flushPromises();
        await transaction();

        expect(fetchMock).toHaveBeenCalledWith(QUOTE_URL, expect.anything());
        getByProp("text", '"Test quote" — Tester');

        dispose();
    });

    test("shows an error message when the API responds with an error", async () => {
        mockFetch(false, "");
        const { getByProp, transaction, dispose } = await render(() => <TestMyFirstApp />);
        await flushPromises();
        await transaction();

        getByProp("text", QUOTE_ERROR_TEXT);

        dispose();
    });

    test("shows an error message when the body is not valid JSON", async () => {
        mockFetch(true, "<html>not json</html>");
        const { getByProp, transaction, dispose } = await render(() => <TestMyFirstApp />);
        await flushPromises();
        await transaction();

        getByProp("text", QUOTE_ERROR_TEXT);

        dispose();
    });
});
