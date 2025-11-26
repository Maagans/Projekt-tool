import { config } from "../../config/index.js";
import { ensureUuid, isValidUuid, toDateOnly } from "../../utils/helpers.js";
import * as workstreamRepository from "../../repositories/workstreamRepository.js";
import * as reportRepository from "../../repositories/reportRepository.js";

export const syncProjectWorkstreams = async (client, projectId, workstreamsPayload) => {
  if (!Array.isArray(workstreamsPayload)) {
    return;
  }

  const existingIds = new Set(await workstreamRepository.getIdsByProjectId(client, projectId));
  const seenIds = new Set();

  const sanitized = workstreamsPayload
    .map((stream, index) => {
      if (!stream) {
        return null;
      }
      const name = typeof stream.name === "string" ? stream.name.trim() : "";
      if (!name) {
        return null;
      }
      return {
        id: stream.id && isValidUuid(stream.id) ? stream.id : ensureUuid(),
        name,
        order: Number.isFinite(stream.order) ? Number(stream.order) : index,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order)
    .map((stream, index) => ({ ...stream, order: index }));

  for (const stream of sanitized) {
    seenIds.add(stream.id);
    await workstreamRepository.upsert(client, projectId, stream);
  }

  const idsToDelete = [...existingIds].filter((id) => !seenIds.has(id));
  if (idsToDelete.length > 0) {
    await workstreamRepository.deleteByIds(client, projectId, idsToDelete);
  }
};

const syncReportState = async (client, reportId, state, existingState = null) => {
  const safeState = state ?? {};
  const previousState = existingState ?? {};

  const resetTables = [
    "report_status_items",
    "report_challenge_items",
    "report_next_step_items",
    "report_main_table_rows",
    "report_phases",
    "report_milestones",
    "report_deliverables",
    "report_kanban_tasks",
  ];

  if (!config.features.projectRiskAnalysisEnabled) {
    resetTables.push("report_risks");
  }

  await reportRepository.deleteItems(client, reportId, resetTables);

  const statusUsedIds = new Set((previousState.statusItems ?? []).map((item) => item?.id).filter(Boolean));
  const challengeUsedIds = new Set((previousState.challengeItems ?? []).map((item) => item?.id).filter(Boolean));
  const nextStepUsedIds = new Set((previousState.nextStepItems ?? []).map((item) => item?.id).filter(Boolean));
  const mainRowUsedIds = new Set((previousState.mainTableRows ?? []).map((item) => item?.id).filter(Boolean));
  const riskUsedIds = new Set((previousState.risks ?? []).map((item) => item?.id).filter(Boolean));
  const phaseUsedIds = new Set((previousState.phases ?? []).map((item) => item?.id).filter(Boolean));
  const milestoneUsedIds = new Set((previousState.milestones ?? []).map((item) => item?.id).filter(Boolean));
  const deliverableUsedIds = new Set((previousState.deliverables ?? []).map((item) => item?.id).filter(Boolean));
  const taskUsedIds = new Set((previousState.kanbanTasks ?? []).map((item) => item?.id).filter(Boolean));
  const deliverableChecklistUsedIds = new Set(
    (previousState.deliverables ?? [])
      .flatMap((deliverable) => (deliverable.checklist ?? []).map((item) => item?.id))
      .filter(Boolean),
  );
  const milestoneIdReference = new Map();

  const ensureStableId = (candidate, usedSet) => {
    if (typeof candidate === "string" && candidate.trim().length > 0 && !usedSet.has(candidate)) {
      usedSet.add(candidate);
      return candidate;
    }

    let candidateId = ensureUuid();
    while (usedSet.has(candidateId)) {
      candidateId = ensureUuid();
    }
    usedSet.add(candidateId);
    return candidateId;
  };

  const insertListItems = async (items, insertFn, usedSet) => {
    const list = Array.isArray(items) ? items : [];
    for (let index = 0; index < list.length; index += 1) {
      const item = list[index];
      if (!item) continue;
      let itemId = ensureStableId(item.id, usedSet);
      item.id = itemId;
      const content = typeof item.content === "string" ? item.content : "";

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await insertFn(client, reportId, {
            id: itemId,
            position: index,
            content,
            ...item,
          });
          break;
        } catch (error) {
          if (error.code === "23505" && attempt < 2) {
            usedSet.delete(itemId);
            itemId = ensureStableId(null, usedSet);
            item.id = itemId;
            continue;
          }
          throw error;
        }
      }
    }
  };

  await insertListItems(safeState.statusItems, reportRepository.insertStatusItem, statusUsedIds);
  await insertListItems(safeState.challengeItems, reportRepository.insertChallengeItem, challengeUsedIds);
  await insertListItems(safeState.nextStepItems, reportRepository.insertNextStepItem, nextStepUsedIds);

  const mainTableRows = Array.isArray(safeState.mainTableRows) ? safeState.mainTableRows : [];
  for (const row of mainTableRows) {
    if (!row) continue;
    let rowId = ensureStableId(row.id, mainRowUsedIds);
    row.id = rowId;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await reportRepository.insertMainTableRow(client, reportId, {
          id: rowId,
          position: mainTableRows.indexOf(row),
          title: row.title ?? "",
          status: row.status ?? "green",
          note: row.note ?? "",
        });
        break;
      } catch (error) {
        if (error.code === "23505" && attempt < 2) {
          mainRowUsedIds.delete(rowId);
          rowId = ensureStableId(null, mainRowUsedIds);
          row.id = rowId;
          continue;
        }
        throw error;
      }
    }
  }

  const risks = Array.isArray(safeState.risks) ? safeState.risks : [];
  for (const risk of risks) {
    if (!risk) continue;
    let riskId = ensureStableId(risk.id, riskUsedIds);
    risk.id = riskId;
    const probability = Number.isFinite(risk.s) ? risk.s : Number.isFinite(risk.probability) ? risk.probability : 1;
    const impact = Number.isFinite(risk.k) ? risk.k : Number.isFinite(risk.impact) ? risk.impact : 1;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await reportRepository.insertRisk(client, reportId, {
          id: riskId,
          position: risks.indexOf(risk),
          name: risk.name ?? risk.title ?? "",
          probability,
          consequence: impact,
        });
        break;
      } catch (error) {
        if (error.code === "23505" && attempt < 2) {
          riskUsedIds.delete(riskId);
          riskId = ensureStableId(null, riskUsedIds);
          risk.id = riskId;
          continue;
        }
        throw error;
      }
    }
  }

  const phases = Array.isArray(safeState.phases) ? safeState.phases : [];
  for (const phase of phases) {
    if (!phase) continue;
    let phaseId = ensureStableId(phase.id, phaseUsedIds);
    phase.id = phaseId;
    const start = Number.isFinite(phase.start) ? Math.max(0, Math.min(100, Number(phase.start))) : 0;
    const end = Number.isFinite(phase.end) ? Math.max(0, Math.min(100, Number(phase.end))) : start;
    const workstreamId = phase.workstreamId && isValidUuid(phase.workstreamId) ? phase.workstreamId : null;
    const startDate = toDateOnly(phase.startDate);
    const endDate = toDateOnly(phase.endDate);
    const phaseStatus = phase.status ?? null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await reportRepository.insertPhase(client, reportId, {
          id: phaseId,
          label: phase.text ?? "",
          start,
          end,
          highlight: phase.highlight ?? "blue",
          workstreamId,
          startDate,
          endDate,
          status: phaseStatus,
        });
        break;
      } catch (error) {
        if (error.code === "23505" && attempt < 2) {
          phaseUsedIds.delete(phaseId);
          phaseId = ensureStableId(null, phaseUsedIds);
          phase.id = phaseId;
          continue;
        }
        throw error;
      }
    }
  }

  const milestones = Array.isArray(safeState.milestones) ? safeState.milestones : [];
  for (const milestone of milestones) {
    if (!milestone) continue;
    const originalMilestoneId = milestone.id;
    let milestoneId = ensureStableId(milestone.id, milestoneUsedIds);
    milestone.id = milestoneId;
    milestoneIdReference.set(originalMilestoneId ?? milestoneId, milestoneId);
    const position = Number.isFinite(milestone.position) ? Math.max(0, Math.min(100, Number(milestone.position))) : 0;
    const workstreamId = milestone.workstreamId && isValidUuid(milestone.workstreamId) ? milestone.workstreamId : null;
    const dueDate = toDateOnly(milestone.date);
    const milestoneStatus = milestone.status ?? null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await reportRepository.insertMilestone(client, reportId, {
          id: milestoneId,
          label: milestone.text ?? "",
          position,
          workstreamId,
          dueDate,
          status: milestoneStatus,
        });
        break;
      } catch (error) {
        if (error.code === "23505" && attempt < 2) {
          milestoneUsedIds.delete(milestoneId);
          milestoneId = ensureStableId(null, milestoneUsedIds);
          milestone.id = milestoneId;
          continue;
        }
        throw error;
      }
    }
  }

  const deliverables = Array.isArray(safeState.deliverables) ? safeState.deliverables : [];
  for (const deliverable of deliverables) {
    if (!deliverable) continue;
    let deliverableId = ensureStableId(deliverable.id, deliverableUsedIds);
    deliverable.id = deliverableId;
    const position = Number.isFinite(deliverable.position) ? Math.max(0, Math.min(100, Number(deliverable.position))) : 0;
    const milestoneRefId = deliverable.milestoneId
      ? milestoneIdReference.get(deliverable.milestoneId) ?? (isValidUuid(deliverable.milestoneId) ? deliverable.milestoneId : null)
      : null;
    const deliverableStatus = deliverable.status ?? null;
    const ownerName = typeof deliverable.owner === "string" ? deliverable.owner.trim() || null : null;
    const ownerId = deliverable.ownerId && isValidUuid(deliverable.ownerId) ? deliverable.ownerId : null;
    const description = typeof deliverable.description === "string" ? deliverable.description : null;
    const notes = typeof deliverable.notes === "string" ? deliverable.notes : null;
    const startDate = toDateOnly(deliverable.startDate);
    const endDate = toDateOnly(deliverable.endDate);
    const progress =
      typeof deliverable.progress === "number" && Number.isFinite(deliverable.progress)
        ? Math.max(0, Math.min(100, Number(deliverable.progress)))
        : null;
    const checklistItems = Array.isArray(deliverable.checklist) ? deliverable.checklist : [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await reportRepository.insertDeliverable(client, reportId, {
          id: deliverableId,
          label: deliverable.text ?? "",
          position,
          milestoneId: milestoneRefId,
          status: deliverableStatus,
          ownerName,
          ownerId,
          description,
          notes,
          startDate,
          endDate,
          progress,
        });
        break;
      } catch (error) {
        if (error.code === "23505" && attempt < 2) {
          deliverableUsedIds.delete(deliverableId);
          deliverableId = ensureStableId(null, deliverableUsedIds);
          deliverable.id = deliverableId;
          continue;
        }
        throw error;
      }
    }

    for (const item of checklistItems) {
      if (!item) continue;
      let checklistId = ensureStableId(item.id, deliverableChecklistUsedIds);
      item.id = checklistId;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await reportRepository.insertDeliverableChecklistItem(client, {
            id: checklistId,
            deliverableId,
            position: (deliverable.checklist ?? []).indexOf(item),
            text: item.text ?? "",
            completed: item.completed ?? false,
          });
          break;
        } catch (error) {
          if (error.code === "23505" && attempt < 2) {
            deliverableChecklistUsedIds.delete(checklistId);
            checklistId = ensureStableId(null, deliverableChecklistUsedIds);
            item.id = checklistId;
            continue;
          }
          throw error;
        }
      }
    }
  }

  const tasks = Array.isArray(safeState.kanbanTasks) ? safeState.kanbanTasks : [];
  for (const task of tasks) {
    if (!task) continue;
    let taskId = ensureStableId(task.id, taskUsedIds);
    task.id = taskId;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await reportRepository.insertKanbanTask(client, reportId, {
          id: taskId,
          content: task.content ?? "",
          status: task.status ?? "todo",
          assignee: task.assignee ?? null,
          dueDate: toDateOnly(task.dueDate),
          notes: task.notes ?? null,
          createdAt: task.createdAt ?? new Date().toISOString(),
        });
        break;
      } catch (error) {
        if (error.code === "23505" && attempt < 2) {
          taskUsedIds.delete(taskId);
          taskId = ensureStableId(null, taskUsedIds);
          task.id = taskId;
          continue;
        }
        throw error;
      }
    }
  }
};

export const syncProjectReports = async (client, projectId, reportsPayload, existingProject = null) => {
  const reportsArray = Array.isArray(reportsPayload) ? reportsPayload : [];
  const existingReports = await reportRepository.getReportsByProjectId(client, projectId);
  const existingByWeek = new Map(existingReports.map((row) => [row.weekKey, row.id]));
  const existingWorkspaceReports = Array.isArray(existingProject?.reports) ? existingProject.reports : [];
  const existingWorkspaceReportByWeek = new Map(existingWorkspaceReports.map((report) => [report.weekKey, report]));
  const seenReportIds = new Set();

  for (const report of reportsArray) {
    if (!report || !report.weekKey) continue;
    const weekKey = report.weekKey;
    let reportId = existingByWeek.get(weekKey);
    if (!reportId) {
      reportId = await reportRepository.createReport(client, projectId, weekKey);
      existingByWeek.set(weekKey, reportId);
    }
    seenReportIds.add(reportId);
    await syncReportState(client, reportId, report.state, existingWorkspaceReportByWeek.get(weekKey)?.state ?? null);
  }

  const reportsToDelete = existingReports.map((row) => row.id).filter((id) => !seenReportIds.has(id));

  if (reportsToDelete.length > 0) {
    await reportRepository.deleteReports(client, projectId, reportsToDelete);
  }
};
