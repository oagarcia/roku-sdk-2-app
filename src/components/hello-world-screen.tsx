// Copyright (c) 2026 Roku, Inc.
// SPDX-License-Identifier: MIT

import { FocusBoundary, onPress, ScreenControllerContext, useFocusActions } from "@roku-sdk/navigation";
import { type Component, onMount, useContext } from "@roku-sdk/solid";

import { CatalogScreen } from "./catalog-screen";
import { BUTTON_WIDTH, FocusButton } from "./focus-button";

const helloScreenId: object = {};
const catalogButtonId: object = {};

/**
 * Pushed over the home screen. It takes focus while it is up, so the home buttons
 * underneath (still mounted) cannot react, and Back pops it to return home.
 */
export const HelloWorldScreen: Component = () => {
    const screens = useContext(ScreenControllerContext);
    // Resolved against the root boundary, which owns every screen's region.
    const { setFocus } = useFocusActions();

    onMount(() => setFocus(helloScreenId));

    return (
        <group id="helloWorldScreen">
            {/* Opaque: the screen controller paints no background, so home would show through. */}
            <rectangle width={1920} height={1080} color="0x1B1B2BFF" />
            <label
                id="helloWorldLabel"
                text="Hello World"
                color="0xFFFFFFFF"
                font="font:ExtraLargeSystemFont"
                horizAlign="center"
                vertAlign="center"
                translation={[0, 420]}
                width={1920}
                height={120}
            />
            <FocusBoundary
                focusId={helloScreenId}
                initialFocus={catalogButtonId}
                onUnhandledKey={{ back: onPress(() => screens.popScreen()) }}
            >
                <group translation={[(1920 - BUTTON_WIDTH) / 2, 580]}>
                    <FocusButton
                        id="catalogButton"
                        text="Ver catálogo"
                        focusId={catalogButtonId}
                        onSelect={() => screens.pushScreen(() => <CatalogScreen />)}
                    />
                </group>
            </FocusBoundary>
        </group>
    );
};
