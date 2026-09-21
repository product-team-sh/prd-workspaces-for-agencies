# 50 · Phase 1 scope for Workspaces for Agencies

Written 21 Sep 2026 after stakeholder feedback that the full scope is too large for the engineering window. The full scope is frozen as the master: [PRD](https://product-team-sh.github.io/prd-workspaces-for-agencies/master/) and [prototype](https://product-team-sh.github.io/prd-workspaces-for-agencies/master/prototype/), both at commit `99a8506`. Nothing in the master is deleted; this document says what ships first and what waits.

## Decision first

**Phase 1 ships the container, the cap and the reservation. It does not ship the connection, the graded permissions or the report.** Concretely: a client is a workspace the agency creates; one pool with a cap and an optional reservation per workspace; six roles instead of an access editor; membership decides who sees which workspace; the master's Home, Work queue, Clients and Billing allocation; and, subject to Rajat's estimate, the two roll-ups. Linking an existing account, per-screen access, independent budgets and the monthly client update move to phase 2 with user feedback to shape them.

**What this protects.** The reason the feature exists survives intact: isolation (US4, US5 in its simple form), the cap that stops one client emptying the pool (US6), and staff restriction by membership (US2, US9). What moves out is the part every stakeholder found hard to size: the connect path with its approval flow on the client's side, and the fourteen-screen grant editor.

## The five points, resolved

| # | Hitesh's point | Phase 1 | Phase 2 | What it removes from the build |
|---|---|---|---|---|
| 1 | Create only, no connect | Add Client creates a workspace. The wizard's "Connect an existing one" card, the link request, the client-side approval (C0), the linked state on the record, "View as client" consent switch, Revoke | Connect, with the approval flow shaped by feedback | D11 entirely; the `link` state machine; the solo account screens; the "Own plan" and "Linked" states on every list |
| 2 | Simplify roles | **Six roles, three each side.** Agency: Owner, Admin, Member. Client: Admin, Collaborator, Viewer. A role is one word on a person; there is no per-screen editor. Membership per workspace stays: it is one list per person and it is what delivers US2 and US9. Evidence and definitions below | Graded access: the fourteen-screen, four-action editor with presets, per-workspace staff presets, per-person client access, as a separate feature | D4's five roles become three; D5, D5a to D5e collapse to "a client user sees their workspace"; the Access tab, the wizard's Access step, the person page's access table, the Add member Access section, the invite preview |
| 3 | Full usage limits | **Everything in the master.** One pool, a cap and an optional reservation per workspace on every consumable, "Manage budget independently" (reservation equal to cap), the refused save that names the fix, the client's Usage screen, the at-limit message naming the agency, Request more into the Work queue, Approve with the number | Nothing | Nothing; D7 ships whole |
| 4 | Roll-ups in the master | **Preference: phase 1**, pending Rajat. The cross-client Unified Inbox and Tasks filtered by membership with the client on every row. The question for Rajat is below | If the estimate is large: phase 2, and the master's Home links into each client's own inbox instead | D3 stays; only the two screens are in question |
| 5 | Client update | Out | The monthly summary, its editor, send and the client's copy | The record's Client update tab, the client's "Your update" item and unread dot, the reply address |

## Six roles, from the evidence

**Where the competitors landed.** Instantly ships five roles, Owner, Admin, Editor, View/VA and a dedicated Client role "specifically for Agency whitelabel clients", and inside a workspace an Editor or Viewer sees every campaign, list and metric; there is no per-screen granularity ([`15 §4`](15-instantly-teardown.md), [`03`](03-competitor-benchmark.md)). HeyReach invites clients "with view-only access" and nothing finer. Smartlead's client "only sees the email accounts and campaigns associated to them", again one shape. Nobody verifiable ships a per-screen grant editor for clients; everybody ships named roles. Our master went further than the field with fourteen screens by four actions; phase 1 comes back to where the field is.

**What the users asked for.** Every recorded ask, from the sources we have (Intercom conversations could not be searched today, the read-only guard blocks the search tool; the help centre could):

| Need, in their words or ours | Who | Source | What answers it |
|---|---|---|---|
| "We can't figure out how to do it where a client isn't able to see all of the campaigns we have in our system" | Scale agency, 11 users | [`02 §2`](02-user-needs-vs-what-we-have.md) | The workspace itself; no role needed |
| Client sees its own prospect's full email trail without seeing other clients' activity | Agency | [`02` row 1](02-user-needs-vs-what-we-have.md) | The workspace; any client role |
| Cap a client's Lead Finder, verification and AI credits and prospect storage | Rajveersingh, 10 Aug 2026 | [`02` row 2](02-user-needs-vs-what-we-have.md) | Caps and reservations, Owner and Admin set them |
| Restrict which staff see which client | Interviewed agency | [`19`](19-agency-interview.md) | Membership; Member role |
| Operators want one queue, owners a dashboard | Interviewed agency | [`19`](19-agency-interview.md) | Member lands on the Work queue, Owner and Admin on Home |
| A client that only wants the numbers, and one that only sources leads | Two paying accounts, hardcoded by account id | [`22 §7.1`](22-prototype-refinement.md) | Client Viewer; Lead Finder-only waits for phase 2 |
| A client that replies and connects mailboxes but must not edit sequences, add prospects or export | Every agency on Limited access today | Help centre, [Client Permissions](https://docs.saleshandy.com/en/articles/9335104-client-permissions-for-agencies-in-saleshandy) | Client Collaborator |
| A client that edits sequences, adds prospects, adds templates and exports | Every agency on Full access today | Same article | Client Admin |
| Scope prospect visibility to the staff working that client | Agency | [`02` row 11](02-user-needs-vs-what-we-have.md) | Membership |
| Agency admin above client workspaces, one user in several workspaces | Hemanshu, Basecamp | [`29`](29-basecamp-history.md) | Owner and Admin; membership |

Nobody asked for graded actions per client; the two hardcoded accounts asked for one screen each. The help-centre article is the strongest evidence for the client side because it is what agencies have been living with since May 2024: two levels, split on editing and export, both able to reply. The three client roles below keep that split and add the results-only shape the hardcoded accounts prove.

### Agency roles

| Role | Instantly's equivalent | Can | Cannot | Story |
|---|---|---|---|---|
| **Owner** | Owner | Everything: billing and plan, caps and reservations, add and delete clients, add people and set roles, enter every workspace without being a member, Home, Work queue | Nothing | US1, US6, US7 |
| **Admin** | Admin, minus billing | Add clients, set caps and reservations, approve requests, add people up to Admin, enter every workspace, Home, Work queue | Billing and plan changes, delete a client, promote to Owner | US1, US6 |
| **Member** | Editor and View/VA merged | Work inside the workspaces they are a member of: sequences, replies, prospects, mailboxes, tasks; the roll-ups over those workspaces; request a raise for a client but not approve it | Anything account-level; any workspace they are not in | US2, US3, US9 |

Admin exists because the interview's owner does not run the day; someone else adds clients and sets caps while billing stays with the owner. Instantly welds billing into Admin; we keep it with Owner because in an agency the person who pays and the person who runs clients are usually different people ([`15 §4`](15-instantly-teardown.md)).

### Client roles

| Role | Sees | Can do | Cannot | Maps from today |
|---|---|---|---|---|
| **Client Admin** | Every screen in their workspace | Everything today's Full access can: edit sequences, add steps and prospects, add templates, export prospects, reply and forward, connect mailboxes; plus reveal leads against their cap and request more | See the agency, other clients, the plan or costs; add users (phase 2) | **Full access**, unchanged in what it can do |
| **Client Collaborator** | Every screen in their workspace | Everything today's Limited access can: read every sequence and its emails, reply and forward in the inbox, send test emails, connect and edit their mailboxes, export reports; plus request more | Edit sequences, add prospects, add templates, export prospects, reveal leads: the same four lines Limited access draws today, plus the one that spends credits | **Limited access**, unchanged in what it can do |
| **Client Viewer** | Reports and Usage | Read results, request more | Everything else | New. The two hardcoded Reports-only and Lead Finder-only accounts land here (Lead Finder-only becomes Viewer plus a note, until phase 2 brings back graded screens); also today's No access, which was a login that could see nothing |

The line between Collaborator and Admin is the line the product already draws between Limited and Full: editing what goes out and taking data off the platform. Reveal leads joins the Admin side because it spends the agency's credits. Viewer is one shape, Reports and Usage, because that is the results-only client every competitor ships and the one the hardcoded accounts prove exists.

**Migration of today's levels.** Full access becomes Client Admin and Limited access becomes Client Collaborator, each keeping exactly what it can do today, so no existing client user loses or gains a capability on launch day. No access becomes Viewer, which gains Reports and Usage; that is the one deliberate change and M1 says so. The two hardcoded accounts become Viewer by hand.

**What phase 2 adds, without breaking this.** The graded editor returns as a way to customise a role for one workspace ("Collaborator, but without pause"), so the six roles stay the vocabulary and the editor becomes the exception, the way Instantly's modular matrix sits under its Client role.

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
| Add Client wizard | Two steps, Details and Limits. No path chooser. The client user's role is one field on Details (Viewer, Collaborator, Admin; default Collaborator). Limits keeps Limit, Reserve and the live sentence |
| Clients list | No Linked, Link pending or Own plan states; Status is Running, Falling, At limit, Not started |
| Client record | Tabs: Overview, Members, Limits, Email Accounts, Settings. Members lists agency staff in the workspace and the client's users, each with a role chip and a role picker; add and remove. No per-screen editor, no Client update tab, no funding chip. Limits unchanged from the master |
| Billing | Unchanged from the master |
| People | Three agency roles with the role cards; the person page lists workspaces with add and remove, no access column; Add member has Person (with role) and Workspaces, no Access section; a client user is added from the record's Members tab with one of the three client roles |
| Client side | The rail their role gives: Viewer sees Reports and Usage; Collaborator and Admin see the full product rail. Usage and Request more for all three. The orientation banner reads from the role. No Your update, no Settings > Workspace link panel |
| Home | Unchanged, except decision rows for link requests go |
| Work queue | Unchanged, except link items go |
| Launch day (M1, M2) | Unchanged |
| First-client confirmation and transformation | Unchanged |

## Counter-case

- **"Six roles is still a permission system."** It is six words on a person and one membership list, which every competitor ships and every agency understands; the thing removed is the fourteen-by-four editor. Lead Finder-only, one paying account, is the one shape six roles cannot express until phase 2.
- **"Dropping connect removes the only path for a client that already pays Saleshandy."** Also true. In phase 1 such a client is created as a new workspace and migrates, or waits. The interview agency did not have this case; the two that asked for isolation did not either.
- **"Phase 2 never comes."** The master is frozen and linkable so phase 2 has a spec on day one rather than a memory.

## Next steps, in order

1. Hitesh confirms the six roles and the phase-1 column above.
2. Rajat's estimate on the two roll-ups.
3. I cut the working PRD to phase 1 (decisions D4, D5 to D5e and D11 amended with dated notes pointing at the master; user stories tagged by phase) and the working prototype to the screens above, each cut reviewed before publish, the master untouched.
