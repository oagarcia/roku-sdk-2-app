// Copyright (c) 2026 Roku, Inc.
// SPDX-License-Identifier: MIT

/**
 * Mock programme guide (EPG) data: 5 invented channels covering a 3-hour window,
 * from 20:00 to 23:00. Times are minutes from the start of the window.
 */

import type { NavigationMap } from "@roku-sdk/navigation";

export const EPG_START_HOUR = 20;
export const EPG_DURATION_MINUTES = 180;
/** Simulated "now": 21:10. */
export const EPG_NOW_MINUTE = 70;

export interface EpgProgram {
    /** Focus identity used by the guide's navigation map. */
    focusId: object;
    title: string;
    description: string;
    start: number;
    duration: number;
}

export interface EpgChannel {
    number: number;
    name: string;
    programs: EpgProgram[];
}

type ProgramSeed = [title: string, duration: number, description: string];

const channel = (number: number, name: string, seeds: ProgramSeed[]): EpgChannel => {
    let start = 0;
    const programs = seeds.map(([title, duration, description]) => {
        const program: EpgProgram = { focusId: { id: `${number}:${title}` }, title, description, start, duration };
        start += duration;
        return program;
    });
    if (start !== EPG_DURATION_MINUTES) {
        throw new Error(`EPG channel ${name} covers ${start} min, expected ${EPG_DURATION_MINUTES}`);
    }
    return { number, name, programs };
};

export const EPG_CHANNELS: EpgChannel[] = [
    channel(101, "Noticias 24", [
        ["Edición Central", 60, "Resumen de las noticias más importantes del día, con reportes en vivo."],
        ["Mundo Hoy", 30, "Lo más relevante de la actualidad internacional."],
        ["Debate Abierto", 60, "Analistas y expertos discuten los temas que marcan la agenda."],
        ["Economía al Cierre", 30, "Mercados, divisas y las claves financieras de la jornada."]
    ]),
    channel(102, "Deportes+", [
        ["Previa del Clásico", 30, "Análisis, alineaciones y la antesala del partido de la noche."],
        ["Fútbol en Vivo: Clásico", 120, "Transmisión en directo del clásico de la liga nacional."],
        ["Resumen Deportivo", 30, "Goles, jugadas y lo mejor de la jornada deportiva."]
    ]),
    channel(103, "Cine Clásico", [
        [
            "La Última Estación",
            105,
            "Drama de 1962: un jefe de estación enfrenta el cierre del ferrocarril de su pueblo."
        ],
        ["Detrás de Cámaras", 15, "Curiosidades sobre la producción de los grandes clásicos."],
        ["Noche de Misterio", 60, "Un detective retirado vuelve a un caso que nunca pudo cerrar."]
    ]),
    channel(104, "Kids TV", [
        ["Aventuras Espaciales", 30, "Tres amigos recorren la galaxia resolviendo enigmas."],
        ["Dibujos Divertidos", 30, "Cortos animados para toda la familia."],
        ["Ciencia Divertida", 30, "Experimentos sencillos para aprender jugando."],
        ["El Bosque Mágico", 45, "Los animales del bosque preparan el gran festival de otoño."],
        ["Cuentos para Dormir", 45, "Historias tranquilas para terminar el día."]
    ]),
    channel(105, "Música HD", [
        ["Top 20 Latino", 60, "Los videos más escuchados de la semana."],
        ["Concierto Acústico", 75, "Una presentación íntima con artistas invitados."],
        ["Clásicos del Rock", 45, "Los grandes himnos del rock de todos los tiempos."]
    ])
];

const pad = (value: number): string => (value < 10 ? `0${value}` : `${value}`);

/** Formats minutes from the window start as "HH:MM". */
export const formatEpgTime = (minute: number): string => {
    const total = EPG_START_HOUR * 60 + minute;
    return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
};

export const formatEpgRange = (program: EpgProgram): string =>
    `${formatEpgTime(program.start)} - ${formatEpgTime(program.start + program.duration)}`;

export const isOnAir = (program: EpgProgram): boolean =>
    program.start <= EPG_NOW_MINUTE && EPG_NOW_MINUTE < program.start + program.duration;

/** The program in `row` that is airing at `minute` (or the last one before it). */
const programAt = (row: EpgChannel, minute: number): EpgProgram =>
    row.programs.find(p => p.start <= minute && minute < p.start + p.duration) ?? row.programs[row.programs.length - 1];

/**
 * Guide navigation: left/right move along a channel's programs; up/down jump to the
 * program airing at the same time (the middle of the focused one) on the adjacent channel.
 */
export const buildEpgNavigationMap = (channels: EpgChannel[]): NavigationMap => {
    const map: NavigationMap = new Map();
    channels.forEach((row, rowIndex) => {
        row.programs.forEach((program, index) => {
            const midpoint = program.start + program.duration / 2;
            map.set(program.focusId, {
                left: row.programs[index - 1]?.focusId,
                right: row.programs[index + 1]?.focusId,
                up: rowIndex > 0 ? programAt(channels[rowIndex - 1], midpoint).focusId : undefined,
                down: rowIndex < channels.length - 1 ? programAt(channels[rowIndex + 1], midpoint).focusId : undefined
            });
        });
    });
    return map;
};
