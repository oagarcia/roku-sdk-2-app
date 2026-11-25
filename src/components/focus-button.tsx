// Copyright (c) 2026 Roku, Inc.
// SPDX-License-Identifier: MIT

import { onPress, useFocusable } from "@roku-sdk/navigation";
import type { Component } from "@roku-sdk/solid";

export const BUTTON_WIDTH = 320;
export const BUTTON_HEIGHT = 72;

interface FocusButtonProps {
    id: string;
    text: string;
    focusId?: object;
    x?: number;
    onSelect: () => void;
}

/** A D-pad focusable button: highlighted while focused, fires `onSelect` on OK. */
export const FocusButton: Component<FocusButtonProps> = props => {
    const { ref, isFocused } = useFocusable({
        focusId: props.focusId,
        onKey: { OK: onPress(() => props.onSelect()) }
    });

    return (
        <group ref={ref} id={props.id} translation={[props.x ?? 0, 0]}>
            <rectangle width={BUTTON_WIDTH} height={BUTTON_HEIGHT} color={isFocused() ? "0x6C3BD9FF" : "0x2A2A3AFF"} />
            <label
                text={props.text}
                color={isFocused() ? "0xFFFFFFFF" : "0xAAAAAAFF"}
                font="font:MediumBoldSystemFont"
                horizAlign="center"
                vertAlign="center"
                width={BUTTON_WIDTH}
                height={BUTTON_HEIGHT}
            />
        </group>
    );
};
