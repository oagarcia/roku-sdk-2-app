// Copyright (c) 2026 Roku, Inc.
// SPDX-License-Identifier: MIT

import "./compiled-components/BaseAppScene.xml";

import { enableExceptionTagging, main, registerAnchorNode } from "@roku-sdk/rsg-ts";

import MyFirstApp from "./components/my-first-app";

main(() => {
    enableExceptionTagging();
    console.log("Registering MyFirstApp");
    registerAnchorNode(MyFirstApp);
});
