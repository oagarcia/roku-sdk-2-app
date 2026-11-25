// Copyright (c) 2026 Roku, Inc.
// SPDX-License-Identifier: MIT

import { RootFocusBoundary, ScreenControllerContext, ScreenControllerProvider } from "@roku-sdk/navigation";
import { type AnchorNodeImplementation, defineAnchorNode, FieldType } from "@roku-sdk/rsg-ts";
import { type Component, useContext } from "@roku-sdk/solid";

import { homeButtonsId, HomeScreen } from "./home-screen";

export { formatQuote, QUOTE_ERROR_TEXT, QUOTE_LOADING_TEXT, QUOTE_URL } from "./home-screen";

const MyFirstAppDescriptor = {
    componentName: "MyFirstApp",
    extends: "FocusBoundaryBase" as const,
    inputFields: {
        keyEvent: FieldType.Object(),
        focusActive: FieldType.Boolean(true)
    },
    outputFields: {
        handledKeys: FieldType.Object(),
        // BaseAppScene.brs forwards this to m.global.exitApp; Main.brs then closes the app.
        exitApp: FieldType.Boolean()
    }
};

type RootProps = Parameters<typeof RootFocusBoundary>[0];

/** Renders whatever is on the screen stack, inside the one root focus boundary. */
const ScreenHost: Component<{
    keyEvent: RootProps["keyEvent"];
    focusActive: boolean;
    setHandledKeys: RootProps["setHandledKeys"];
}> = props => {
    const screens = useContext(ScreenControllerContext);
    return (
        <RootFocusBoundary
            keyEvent={props.keyEvent}
            focusActive={props.focusActive}
            setHandledKeys={props.setHandledKeys}
            initialFocus={homeButtonsId}
        >
            <group>{screens.getScreen()}</group>
        </RootFocusBoundary>
    );
};

const MyFirstApp: AnchorNodeImplementation<typeof MyFirstAppDescriptor> = (inputs, outputs) => (
    <ScreenControllerProvider fallback={() => <HomeScreen onExit={() => outputs.exitApp(true)} />}>
        <ScreenHost
            keyEvent={inputs.keyEvent as RootProps["keyEvent"]}
            focusActive={inputs.focusActive as boolean}
            setHandledKeys={outputs.handledKeys}
        />
    </ScreenControllerProvider>
);

export default defineAnchorNode(MyFirstAppDescriptor, MyFirstApp);
