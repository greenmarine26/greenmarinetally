export const fbReassignContainerPosition = async (vk, mode, cn, b, r, t, by, opts) => {
  window.__calls.push({ fn: 'reassign', cn, to: `${b}-${r}-${t}`, opts: opts || null });
  return { ok: true, displaced: opts && opts.swapWith ? opts.swapWith : null };
};
export const fbCompleteContainer = async (vk, mode, cn, by, flag, note, equip) => {
  window.__calls.push({ fn: 'complete', cn, equip });
  return true;
};
export const fbCompleteContainersAtomic = async (vk, mode, cns) => { window.__calls.push({ fn: 'completeAtomic', cns }); return true; };
export const fbHoldContainers = async () => true;
export const fbReleaseHold = async () => true;
export const fbSnoozeHold = async () => true;
export const fbUpdateVoyageInfo = async () => true;
export const fbUpdateRecordSeal = async () => true;
export const fbSetXraySeal = async () => true;
export const fbAddWorkReport = async () => true;
export const fbSetActualPosition = async () => true;
export const fbBatchMoveToStorage = async () => true;
export const fbUnassignContainer = async () => true;
export const fbCancelComplete = async () => true;
export const STORAGE_BAY = '__STG__';
export const db = {};
export const fbSetInspectorActivity = async () => true;
