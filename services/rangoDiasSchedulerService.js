'use strict';

const rangoDiasService = require('./rango_diasService');

const TIME_ZONE = 'America/Bogota';
const CHECK_INTERVAL_MS = 60 * 1000;

let schedulerInterval = null;
let lastExecutionDate = null;

const getBogotaDateParts = (date = new Date()) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    });

    const parts = formatter.formatToParts(date);
    const get = (type) => Number(parts.find((part) => part.type === type)?.value || 0);

    const year = get('year');
    const month = get('month');
    const day = get('day');
    const hour = get('hour');
    const minute = get('minute');

    return {
        year,
        month,
        day,
        hour,
        minute,
        dateKey: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        fechaCorte: new Date(year, month - 1, day)
    };
};

const syncCurrentMonth = async (date = new Date(), reason = 'auto') => {
    const parts = getBogotaDateParts(date);

    await rangoDiasService.syncMonth({
        year: parts.year,
        month: parts.month,
        fechaCorte: parts.fechaCorte
    });

    if (reason === 'midnight') {
        lastExecutionDate = parts.dateKey;
    }

    console.log(`[rango_dias][${reason}] sincronizado ${parts.year}-${String(parts.month).padStart(2, '0')} (fechaCorte ${parts.dateKey})`);
};

const runMidnightCheck = async () => {
    try {
        const parts = getBogotaDateParts(new Date());

        if (parts.hour === 0 && parts.minute === 0 && lastExecutionDate !== parts.dateKey) {
            await syncCurrentMonth(new Date(), 'midnight');
        }
    } catch (error) {
        console.error('[rango_dias][scheduler] error:', error.message);
    }
};

const startRangoDiasScheduler = async () => {
    if (schedulerInterval) {
        return;
    }

    try {
        await syncCurrentMonth(new Date(), 'startup');
    } catch (error) {
        console.error('[rango_dias][startup] error:', error.message);
    }

    schedulerInterval = setInterval(runMidnightCheck, CHECK_INTERVAL_MS);
    console.log('[rango_dias][scheduler] activo: verificación cada 60 segundos (00:00 America/Bogota).');
};

module.exports = {
    startRangoDiasScheduler
};
