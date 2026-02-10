

## Moltbot UI Integration Plan — Agent Status and Enhanced Chat

### Overview

This plan adds real-time agent status indicators and enhanced chat SSE event handling for the Moltbot integration. The existing SSE streaming architecture in `useChatStream` will be extended to handle new event types (`tool_start`, `tool_end`, `memory_ref`), and a new polling hook will power status badges across Role cards and the Chat header.

---

### 1. New Hook: `useMoltbotStatus`

Create `src/hooks/useMoltbotStatus.ts` — a polling hook that calls the Moltbot status endpoint.

**Behavior:**
- Accepts `companyId`, `roleId`, and an `active` flag
- When `active` is true (chat is open), polls every 30 seconds
- When `active` is false (role cards on dashboard), polls every 5 minutes
- Returns `{ status, lastActive, pendingWorkflow, isLoading }`
- Uses `useRef` for the interval to avoid re-render loops (consistent with existing patterns)

**Endpoint:**
```
GET https://moltbot.axis.systems/api/v1/status?company_id={uuid}&role_id={uuid}
```

---

### 2. Agent Status Badge Component

Create `src/components/roles/AgentStatusBadge.tsx` — a reusable status indicator.

**States and visuals:**
| Status | Color | Icon | Label |
|--------|-------|------|-------|
| idle / ready | Green dot | Circle | Ready |
| thinking | Yellow dot (pulse) | Loader2 | Thinking... |
| executing | Blue dot (pulse) | Zap | Executing |
| awaiting_approval | Orange dot (pulse) | AlertCircle | Awaiting Approval |

**Also displays:**
- "Last active: 2m ago" using `date-fns.formatDistanceToNow`

---

### 3. Update Chat Header

Modify `src/components/chat/ChatHeader.tsx`:
- Add `agentStatus` and `lastActive` props
- Render `AgentStatusBadge` next to the role name, replacing the static "AI Role" badge
- The status will be driven by `useMoltbotStatus` from `RoleChatPage`

---

### 4. Update Role Cards

Modify `src/components/roles/RoleCard.tsx`:
- Add `useMoltbotStatus` with `active: false` (5-min polling)
- Show `AgentStatusBadge` below the role name

Modify `src/components/workflow/RoleStatusCard.tsx`:
- Replace the existing hardcoded `statusConfig` with `AgentStatusBadge` powered by `useMoltbotStatus`
- Keeps existing task/pending badges

---

### 5. Enhanced Chat SSE Handling

Extend `src/hooks/useChatStream.ts` to parse Moltbot SSE event types:
- Add new state: `activeTools` (array of `{ tool: string, status: 'running' | 'done', resultSummary?: string }`)
- Add new state: `memoryRefs` (array of `{ source: string, snippet: string }`)
- Add new state: `isThinking` (boolean, set true between message send and first `delta` event)

**SSE event parsing changes:**
- Currently the hook only handles `data:` lines. Extend to track `event:` lines to identify the event type.
- `event: tool_start` -> push to `activeTools` with status `running`
- `event: tool_end` -> update matching tool to status `done`
- `event: memory_ref` -> push to `memoryRefs`
- `event: delta` -> existing behavior (append content), clear `isThinking`
- `event: done` -> finalize message, clear `activeTools` and `memoryRefs`

**New return values from hook:**
```typescript
{
  // existing...
  messages, isLoading, isStreaming, pinnedMessageIds,
  // new...
  activeTools,    // currently running/completed tools for the active stream
  memoryRefs,     // memory references used in current response
  isThinking,     // true between send and first delta
}
```

---

### 6. Thinking Indicator Component

Create `src/components/chat/ThinkingIndicator.tsx`:
- Three bouncing dots animation (matching existing chat bubble style)
- Shows role name: "{roleName} is thinking..."
- Displayed in `ChatMessages` when `isThinking` is true

---

### 7. Tool Usage Display Component

Create `src/components/chat/ToolUsageBadge.tsx`:
- Inline badges rendered above the streaming AI message
- Running tool: animated spinner icon + tool label (e.g., "Searching web...")
- Completed tool: check icon + tool label + faded style
- Tool name mapping: `web_search` -> "Searching web", `code_execute` -> "Running code", etc. (with fallback to raw name)

---

### 8. Memory Reference Badge

Create `src/components/chat/MemoryReferenceBadge.tsx`:
- Small badge rendered alongside tool badges: "Used memory" with brain icon
- Tooltip on hover shows the snippet text
- Collapsible list if multiple memory refs

---

### 9. Update ChatMessages Component

Modify `src/components/chat/ChatMessages.tsx`:
- Accept new props: `activeTools`, `memoryRefs`, `isThinking`, `roleName`
- Render `ThinkingIndicator` at the bottom when `isThinking` is true
- Render `ToolUsageBadge` and `MemoryReferenceBadge` above the currently streaming AI message

---

### 10. Wire Everything in RoleChatPage

Modify `src/pages/RoleChatPage.tsx`:
- Add `useMoltbotStatus({ companyId, roleId, active: true })` for 30s polling
- Pass `agentStatus` and `lastActive` to `ChatHeader`
- Pass `activeTools`, `memoryRefs`, `isThinking` from `useChatStream` to `ChatMessages`

---

### Files Summary

| File | Action |
|------|--------|
| `src/hooks/useMoltbotStatus.ts` | Create — polling hook |
| `src/components/roles/AgentStatusBadge.tsx` | Create — reusable status badge |
| `src/components/chat/ThinkingIndicator.tsx` | Create — typing/thinking dots |
| `src/components/chat/ToolUsageBadge.tsx` | Create — tool usage display |
| `src/components/chat/MemoryReferenceBadge.tsx` | Create — memory ref badge |
| `src/hooks/useChatStream.ts` | Modify — parse new SSE event types |
| `src/components/chat/ChatHeader.tsx` | Modify — add AgentStatusBadge |
| `src/components/chat/ChatMessages.tsx` | Modify — render new indicators |
| `src/components/roles/RoleCard.tsx` | Modify — add AgentStatusBadge |
| `src/components/workflow/RoleStatusCard.tsx` | Modify — use AgentStatusBadge |
| `src/pages/RoleChatPage.tsx` | Modify — wire new hook + pass props |

### Graceful Degradation

Since the Moltbot API is still being built:
- `useMoltbotStatus` will catch fetch errors silently and default to `{ status: 'idle', lastActive: null }`
- SSE parsing falls back to existing `data:` line handling if no `event:` prefix is present
- All new UI elements are conditionally rendered (no tool badges if no tool events, no memory badge if no memory refs)

This ensures existing functionality continues to work identically until Moltbot is live.

