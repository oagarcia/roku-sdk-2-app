// Copyright (c) 2026 Roku, Inc.
// SPDX-License-Identifier: MIT

import { onPress, ScreenControllerContext, useFocusable, useFocusActions } from "@roku-sdk/navigation";
import { type Component, onMount, useContext } from "@roku-sdk/solid";

const helloScreenId: object = {};

/**
 * Pushed over the home screen. It takes focus while it is up, so the home buttons
 * underneath (still mounted) cannot react, and Back pops it to return home.
 */
export const HelloWorldScreen: Component = () => {
    const screens = useContext(ScreenControllerContext);
    const { setFocus } = useFocusActions();
    const { ref } = useFocusable({
        focusId: helloScreenId,
        onKey: { back: onPress(() => screens.popScreen()) }
    });

    onMount(() => setFocus(helloScreenId));

    return (
        <group ref={ref} id="helloWorldScreen">
            {/* Opaque: the screen controller paints no background, so home would show through. */}
            <rectangle width={1920} height={1080} color="0x1B1B2BFF" />
            <label
                id="helloWorldLabel"
                text="Hello World"
                color="0xFFFFFFFF"
                font="font:ExtraLargeSystemFont"
                horizAlign="center"
                vertAlign="center"
                width={1920}
                height={1080}
            />
        </group>
    );
};
