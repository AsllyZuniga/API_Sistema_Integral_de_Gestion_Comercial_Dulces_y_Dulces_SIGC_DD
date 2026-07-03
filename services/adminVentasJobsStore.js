'use strict';

const jobs = new Map();

const crear = () => {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const job = {
        jobId,
        status: 'pending',
        fechaInicio: null,
        fechaFin: null,
        ventasEliminadas: 0,
        detallesEliminados: 0,
        progress: 0,
        totalEstimado: 0,
        error: null,
        createdAt: new Date().toISOString(),
        startedAt: null,
        finishedAt: null
    };
    jobs.set(jobId, job);

    setTimeout(() => {
        if (jobs.has(jobId)) {
            jobs.delete(jobId);
        }
    }, 60 * 60 * 1000);

    return job;
};

const obtener = (jobId) => {
    return jobs.get(jobId) || null;
};

const actualizar = (jobId, patch) => {
    const job = jobs.get(jobId);
    if (!job) return null;
    Object.assign(job, patch);
    return job;
};

module.exports = { crear, obtener, actualizar };
