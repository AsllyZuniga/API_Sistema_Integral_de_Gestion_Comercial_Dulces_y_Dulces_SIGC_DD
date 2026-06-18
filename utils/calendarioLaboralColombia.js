'use strict';

const Holidays = require('date-holidays');

const hd = new Holidays('CO');

const toDateOnly = (value) => {
    const date = value ? new Date(value) : new Date();
    date.setHours(0, 0, 0, 0);
    return date;
};

const formatDateOnly = (date) => {
    const safe = toDateOnly(date);
    return safe.toISOString().slice(0, 10);
};

const getMonthRange = (year, month) => {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return { start, end };
};

const getFestivosSet = (year) => {
    const holidays = hd.getHolidays(year) || [];
    const festivos = holidays
        .filter((holiday) => holiday && holiday.date)
        .map((holiday) => holiday.date.slice(0, 10));

    return new Set(festivos);
};

const isDiaLaborable = (date, festivosSet) => {
    const safe = toDateOnly(date);
    const day = safe.getDay();
    if (day === 0) return false;

    const iso = formatDateOnly(safe);
    return !festivosSet.has(iso);
};

const countDiasLaborables = (startDate, endDate, festivosSet) => {
    const start = toDateOnly(startDate);
    const end = toDateOnly(endDate);

    if (end < start) return 0;

    let count = 0;
    for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
        if (isDiaLaborable(current, festivosSet)) {
            count += 1;
        }
    }

    return count;
};

const getResumenMesLaboral = ({ year, month, fechaCorte }) => {
    const { start, end } = getMonthRange(year, month);
    const corte = fechaCorte ? toDateOnly(fechaCorte) : toDateOnly(new Date());
    const endForCorridos = corte < end ? corte : end;
    const festivosSet = getFestivosSet(year);

    const diasHabiles = countDiasLaborables(start, end, festivosSet);
    const diasCorridos = endForCorridos < start
        ? 0
        : countDiasLaborables(start, endForCorridos, festivosSet);

    return {
        fecha_inicio: formatDateOnly(start),
        fecha_fin: formatDateOnly(end),
        dias_habiles: diasHabiles,
        dias_corridos: diasCorridos
    };
};

const getResumenPeriodoLaboral = ({ fechaInicio, fechaFin, fechaCorte }) => {
    const start = toDateOnly(fechaInicio);
    const end = toDateOnly(fechaFin);
    const corte = fechaCorte ? toDateOnly(fechaCorte) : toDateOnly(new Date());
    const endForCorridos = corte < end ? corte : end;

    if (end < start) {
        return {
            dias_habiles: 0,
            dias_corridos: 0
        };
    }

    const festivosByYear = new Map();
    const getYearFestivos = (year) => {
        if (!festivosByYear.has(year)) {
            festivosByYear.set(year, getFestivosSet(year));
        }
        return festivosByYear.get(year);
    };

    const isLaborable = (date) => {
        const set = getYearFestivos(date.getFullYear());
        return isDiaLaborable(date, set);
    };

    let diasHabiles = 0;
    for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
        if (isLaborable(current)) diasHabiles += 1;
    }

    let diasCorridos = 0;
    if (endForCorridos >= start) {
        for (let current = new Date(start); current <= endForCorridos; current.setDate(current.getDate() + 1)) {
            if (isLaborable(current)) diasCorridos += 1;
        }
    }

    return {
        dias_habiles: diasHabiles,
        dias_corridos: diasCorridos
    };
};

module.exports = {
    toDateOnly,
    formatDateOnly,
    getMonthRange,
    getFestivosSet,
    isDiaLaborable,
    countDiasLaborables,
    getResumenMesLaboral,
    getResumenPeriodoLaboral
};
