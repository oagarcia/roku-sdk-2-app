// Copyright (c) 2026 Roku, Inc.
// SPDX-License-Identifier: MIT

import { FocusBoundary, onPress, ScreenControllerContext, useFocusable, useFocusActions } from "@roku-sdk/navigation";
import { type Component, createSignal, For, onMount, useContext } from "@roku-sdk/solid";

import {
    buildEpgNavigationMap,
    EPG_CHANNELS,
    EPG_DURATION_MINUTES,
    EPG_NOW_MINUTE,
    type EpgChannel,
    type EpgProgram,
    formatEpgRange,
    formatEpgTime,
    isOnAir
} from "../data/epg-data";

const catalogScreenId: object = {};

// Layout (FHD, 1920x1080).
const MARGIN_X = 96;
const CHANNEL_COLUMN_WIDTH = 260;
const GRID_X = MARGIN_X + CHANNEL_COLUMN_WIDTH + 16;
const GRID_WIDTH = 1920 - GRID_X - MARGIN_X;
const PX_PER_MINUTE = GRID_WIDTH / EPG_DURATION_MINUTES;
const TIMELINE_Y = 380;
const ROWS_Y = 430;
const ROW_HEIGHT = 96;
const ROW_PITCH = 112;
const CELL_GAP = 6;

const minuteToX = (minute: number): number => GRID_X + minute * PX_PER_MINUTE;

const TIME_MARKS = Array.from({ length: EPG_DURATION_MINUTES / 30 }, (_, i) => i * 30);

const ProgramCell: Component<{ program: EpgProgram; onFocused: (program: EpgProgram) => void }> = props => {
    const { ref, isFocused } = useFocusable({
        focusId: props.program.focusId,
        onFocusGained: () => props.onFocused(props.program)
    });
    const width = props.program.duration * PX_PER_MINUTE - CELL_GAP;

    return (
        <group ref={ref} translation={[minuteToX(props.program.start), 0]}>
            <rectangle
                width={width}
                height={ROW_HEIGHT}
                color={isFocused() ? "0x6C3BD9FF" : isOnAir(props.program) ? "0x3A3A55FF" : "0x2A2A3AFF"}
            />
            <label
                text={props.program.title}
                color={isFocused() ? "0xFFFFFFFF" : "0xDDDDDDFF"}
                font="font:SmallBoldSystemFont"
                translation={[16, 14]}
                width={width - 32}
                height={36}
            />
            <label
                text={formatEpgRange(props.program)}
                color={isFocused() ? "0xEEEEEEFF" : "0x9A9AAAFF"}
                font="font:SmallestSystemFont"
                translation={[16, 54]}
                width={width - 32}
                height={28}
            />
        </group>
    );
};

const ChannelRow: Component<{ channel: EpgChannel; y: number; onFocused: (program: EpgProgram) => void }> = props => (
    <group translation={[0, props.y]}>
        <rectangle translation={[MARGIN_X, 0]} width={CHANNEL_COLUMN_WIDTH} height={ROW_HEIGHT} color="0x20202EFF" />
        <label
            text={`${props.channel.number}`}
            color="0x9A9AAAFF"
            font="font:SmallBoldSystemFont"
            translation={[MARGIN_X + 20, 14]}
            width={CHANNEL_COLUMN_WIDTH - 40}
            height={32}
        />
        <label
            text={props.channel.name}
            color="0xFFFFFFFF"
            font="font:SmallBoldSystemFont"
            translation={[MARGIN_X + 20, 48]}
            width={CHANNEL_COLUMN_WIDTH - 40}
            height={36}
        />
        <For each={props.channel.programs}>
            {program => <ProgramCell program={program} onFocused={props.onFocused} />}
        </For>
    </group>
);

const navigationMap = buildEpgNavigationMap(EPG_CHANNELS);
const initialProgram = EPG_CHANNELS[0].programs.find(program => isOnAir(program)) ?? EPG_CHANNELS[0].programs[0];

/**
 * Catalog with a programme guide: 5 channels over 20:00-23:00. Pushed over the
 * Hello World screen; it takes focus while up and Back pops it.
 */
export const CatalogScreen: Component = () => {
    const screens = useContext(ScreenControllerContext);
    // Resolved against the root boundary, which owns every screen's region.
    const { setFocus } = useFocusActions();
    const [selected, setSelected] = createSignal<EpgProgram>(initialProgram);

    const selectedChannel = () => EPG_CHANNELS.find(c => c.programs.includes(selected()));

    onMount(() => setFocus(catalogScreenId));

    return (
        <group id="catalogScreen">
            {/* Opaque: the screen controller paints no background, so the screen below would show through. */}
            <rectangle width={1920} height={1080} color="0x14141FFF" />

            <label
                id="catalogTitle"
                text="Catálogo · Guía de programación"
                color="0xFFFFFFFF"
                font="font:LargeBoldSystemFont"
                translation={[MARGIN_X, 48]}
                width={1200}
                height={60}
            />
            <label
                text={`Ahora: ${formatEpgTime(EPG_NOW_MINUTE)}`}
                color="0xFF4F8BFF"
                font="font:MediumBoldSystemFont"
                horizAlign="right"
                translation={[1920 - MARGIN_X - 400, 56]}
                width={400}
                height={50}
            />

            {/* Details of the focused program. */}
            <label
                id="programTitle"
                text={selected().title}
                color="0xFFFFFFFF"
                font="font:MediumBoldSystemFont"
                translation={[MARGIN_X, 140]}
                width={1728}
                height={50}
            />
            <label
                id="programInfo"
                text={`${selectedChannel()?.number ?? ""} ${selectedChannel()?.name ?? ""} · ${formatEpgRange(selected())}${isOnAir(selected()) ? " · EN VIVO" : ""}`}
                color="0xB9A4F5FF"
                font="font:SmallSystemFont"
                translation={[MARGIN_X, 196]}
                width={1728}
                height={40}
            />
            <label
                id="programDescription"
                text={selected().description}
                color="0xCCCCCCFF"
                font="font:SmallSystemFont"
                translation={[MARGIN_X, 244]}
                width={1728}
                height={90}
                wrap={true}
                maxLines={2}
            />

            {/* Timeline header. */}
            <For each={TIME_MARKS}>
                {minute => (
                    <label
                        text={formatEpgTime(minute)}
                        color="0x9A9AAAFF"
                        font="font:SmallSystemFont"
                        translation={[minuteToX(minute) + 8, TIMELINE_Y]}
                        width={120}
                        height={36}
                    />
                )}
            </For>

            <FocusBoundary
                focusId={catalogScreenId}
                initialFocus={initialProgram.focusId}
                navigationMap={navigationMap}
                onUnhandledKey={{ back: onPress(() => screens.popScreen()) }}
            >
                <group id="epgGrid" translation={[0, ROWS_Y]}>
                    <For each={EPG_CHANNELS}>
                        {(channel, index) => (
                            <ChannelRow channel={channel} y={index() * ROW_PITCH} onFocused={setSelected} />
                        )}
                    </For>
                </group>
            </FocusBoundary>

            {/* "Now" marker across the grid. */}
            <rectangle
                translation={[minuteToX(EPG_NOW_MINUTE) - 2, TIMELINE_Y + 40]}
                width={4}
                height={ROWS_Y - TIMELINE_Y - 40 + EPG_CHANNELS.length * ROW_PITCH - (ROW_PITCH - ROW_HEIGHT)}
                color="0xFF4F8BFF"
            />
        </group>
    );
};
