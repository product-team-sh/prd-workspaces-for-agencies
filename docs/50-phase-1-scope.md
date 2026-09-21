# 50 · Phase 1 scope for Workspaces for Agencies

Written 21 Sep 2026 after stakeholder feedback that the full scope is too large for the engineering window. The full scope is frozen as the master: [PRD](https://product-team-sh.github.io/prd-workspaces-for-agencies/master/) and [prototype](https://product-team-sh.github.io/prd-workspaces-for-agencies/master/prototype/), both at commit `99a8506`. Nothing in the master is deleted; this document says what ships first and what waits.

## Decision first

**Phase 1 ships the container and the cap. It does not ship the connection, the graded permissions, the reservation or the report.** Concretely: a client is a workspace the agency creates; one pool with a cap per workspace; three roles instead of an access editor; membership decides who sees which workspace; the master's Home, Work queue, Clients and Billing allocation; and, subject to Rajat's estimate, the two roll-ups. Linking an existing account, per-screen access, independent budgets and the monthly client update move to phase 2 with user feedback to shape them.

**What this protects.** The reason the feature exists survives intact: isolation (US4, US5 in its simple form), the cap that stops one client emptying the pool (US6), and staff restriction by membership (US2, US9). What moves out is the part every stakeholder found hard to size: the connect path with its approval flow on the client's side, the fourteen-screen grant editor, and the reservation arithmetic.

## The five points, resolved

| # | Hitesh's point | Phase 1 | Phase 2 | What it removes from the build |
|---|---|---|---|---|
| 1 | Create only, no connect | Add Client creates a workspace. The wizard's "Connect an existing one" card, the link request, the client-side approval (C0), the linked state on the record, "View as client" consent switch, Revoke | Connect, with the approval flow shaped by feedback | D11 entirely; the `link` state machine; the solo account screens; the "Own plan" and "Linked" states on every list |
| 2 | Simplify roles | **Three roles.** Agency Owner (everything, billing, add and delete clients), Agency Member (works in the workspaces they are added to, no billing, no delete), Client (sees and works in their own workspace). Membership per workspace stays: it is one list per person and it is what delivers US2 and US9. See the role table below | Graded access: the fourteen-screen, four-action editor with presets, per-workspace staff presets, per-person client access, as a separate feature | D4's five roles become three; D5, D5a to D5e collapse to "a client user sees their workspace"; the Access tab, the wizard's Access step, the person page's access table, the Add member Access section, the invite preview |
| 3 | Full usage limits, independent budget later | One pool, a cap per workspace on every consumable, the client's Usage screen, the at-limit message naming the agency, Request more into the Work queue, Approve with the number | "Manage budget independently": reservations, the Reserved column, the starved-pool state, the refused-save arithmetic | D7's reservation half; the Reserved column and switch on the wizard, the record's Limits and Billing allocation; Bifurcated |
| 4 | Roll-ups in the master | **Preference: phase 1**, pending Rajat. The cross-client Unified Inbox and Tasks filtered by membership with the client on every row. The question for Rajat is below | If the estimate is large: phase 2, and the master's Home links into each client's own inbox instead | D3 stays; only the two screens are in question |
| 5 | Client update | Out | The monthly summary, its editor, send and the client's copy | The record's Client update tab, the client's "Your update" item and unread dot, the reply address |

## The three roles

| Role | Who | Can | Cannot |
|---|---|---|---|
| **Agency Owner** | The account holder, and anyone they promote | Everything: billing, plan and caps, add and delete clients, add people, enter every workspace without being a member, Home, Work queue | Nothing |
| **Agency Member** | Staff | Work inside the workspaces they are members of; the roll-ups over those workspaces; approve a client's request for more if the owner allows it (one switch per account) | Billing, adding or deleting clients, adding people, entering a workspace they are not in |
| **Client** | People at the client | Everything inside their own workspace: sequences, replies, prospects, mailboxes, reports, Usage, request more | See the agency, another client, the plan, costs or limits they were not given |

Two things this table gives up, on purpose: a "Reports only" client, which two paying accounts have hardcoded today and which phase 2's graded access brings back; and an Admin who runs the business but not billing, which phase 1 folds into Owner. If either is a hard requirement for launch, the fourth role is Client (read only), not Admin, because the two hardcoded accounts are real and the Admin case is not.

## The question for Rajat

Two screens decide point 4. Each is a list the product already renders once per workspace, rendered once across every workspace the signed-in person is a member of, with a client column, and every action on a row writing into that row's workspace.

| Screen | Today | Phase 1 needs | Estimate wanted |
|---|---|---|---|
| Unified Inbox | One list, client filter derived from sequence association | One query across N workspaces by membership; reply writes to the thread's workspace | Days, and whether the existing client filter's query can be reused |
| Tasks | One list per account | Same shape as the inbox | Days |

If the two together are under a sprint, phase 1. If not, phase 1 ships Home's per-client reply counts linking into each workspace's own inbox, and the roll-ups follow in phase 2.

## What the phase-1 prototype and PRD lose, screen by screen

| Screen | Change for phase 1 |
|---|---|
| Add Client wizard | Two steps, Details and Limits. No path chooser, no Access step. Limits shows Limit only, no Reserve switch |
| Clients list | No Linked, Link pending or Own plan states; Status is Running, Falling, At limit, Not started |
| Client record | Tabs: Overview, Members, Limits, Email Accounts, Settings. Members is a list of agency staff in the workspace plus the client's users, add and remove only. No Access tab, no Client update tab, no funding chip |
| Billing | Client limits & usage without the Reserved column and the reservation warnings; Email Accounts unchanged |
| People | Three roles; the person page lists workspaces with add and remove, no access column; Add member has Person and Workspaces, no Access section |
| Client side | Full product rail inside their workspace, Usage, Request more. No orientation banner about grants, no restricted-client line, no Your update, no Settings > Workspace link panel |
| Home | Unchanged, except decision rows for link requests go |
| Work queue | Unchanged, except link items go |
| Launch day (M1, M2) | Unchanged |
| First-client confirmation and transformation | Unchanged |

## Counter-case

- **"Three roles cannot express Reports-only, and two customers have it today."** True. Either those two keep their hardcoded state until phase 2, or the fourth role is Client (read only). Decide before dev starts, not after.
- **"Dropping connect removes the only path for a client that already pays Saleshandy."** Also true. In phase 1 such a client is created as a new workspace and migrates, or waits. The interview agency did not have this case; the two that asked for isolation did not either.
- **"Caps without reservations still let the pool starve."** Yes, and the at-limit message still names the agency, so the failure is visible and attributable. Reservations fix the economics, not the clarity.
- **"Phase 2 never comes."** The master is frozen and linkable so phase 2 has a spec on day one rather than a memory.

## Next steps, in order

1. Hitesh confirms the three roles (or four) and the phase-1 column above.
2. Rajat's estimate on the two roll-ups.
3. I cut the working PRD to phase 1 (decisions D4, D5 to D5e, D7, D11 amended with dated notes pointing at the master; user stories tagged by phase) and the working prototype to the screens above, each cut reviewed before publish, the master untouched.
