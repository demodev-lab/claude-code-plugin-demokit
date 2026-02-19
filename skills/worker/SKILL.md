---
name: worker
description: Team worker protocol (ACK, mailbox, task lifecycle) for tmux-based OMX teams
---

# Worker Skill

This skill standardizes task lifecycle handling for OMX Team worker sessions (`worker-<n>`).

## Identity

`OMX_TEAM_WORKER` must be set and formatted as:

`<team-name>/worker-<n>`

Example: `xhigh-madmax/worker-3`

## 1) Startup ACK

1. Parse `OMX_TEAM_WORKER` into:
   - `teamName` (before `/`)
   - `workerName` (after `/`)
2. Send ACK to lead mailbox:
   - `to_worker`: `leader-fixed`
   - body: include worker name + ready status

MCP:
- `team_send_message({ team_name, from_worker, to_worker: "leader-fixed", body })`

## 2) Inbox / Task lifecycle

1. Read inbox:
   - `.omx/state/team/<teamName>/workers/<workerName>/inbox.md`
2. Pick first non-blocked assigned task.
3. Read task file:
   - `.omx/state/team/<teamName>/tasks/task-<id>.json`
4. Important task id format:
   - State API uses `task_id: "<id>"` (e.g. `"3"`), not `"task-3"`.
5. Claim task before work:
   - `team_claim_task`
6. Complete task work.
7. Write completion:
   - success: `{"status":"completed","result":"..."}`
   - failure: `{"status":"failed","error":"..."}`
8. Set worker status to idle:
   - `.omx/state/team/<teamName>/workers/<workerName>/status.json`

## 3) Mailbox

Mailbox path:
- `.omx/state/team/<teamName>/mailbox/<workerName>.json`

MCP:
- `team_mailbox_list`
- `team_mailbox_mark_delivered`

## 4) Shutdown

If lead requests shutdown, follow inbox instructions, write shutdown ack, and exit.
