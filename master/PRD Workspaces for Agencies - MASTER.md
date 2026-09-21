			
**Design of record:** [prototype/agency-admin.html](prototype/agency-admin.html) ([board](prototype/board/index.html)) 

## 1. Problem

**What users do.** An agency runs cold outreach for several clients from one account. It tags each sequence with a client in `Sequence → Settings` and each mailbox in that mailbox's General Settings, the only two client-assignable resource types ([`agency-client.ts:7`](../repos/saleshandy-webui/src/components/agency-client-management/enums/agency-client.ts)); issues each client a login at `/agency/login`, default `LimitedAccess`; and forwards the emailed credentials by hand ([01 §1](01-current-state.md)). Every agency user sees every client. Credits, sends and prospects are one account pool with no client dimension ([01 §5](01-current-state.md)).

**What actually happens.** The prospect is account-level: `clientAssociated` is an array derived from the sequences it sits on, not an assignment ([01 §6a](01-current-state.md)). A client therefore cannot be shown its own prospect's email trail without exposing that prospect's activity for every other client, so the sidebar is hidden and the agency screenshares. A sequence's client cannot be changed after activation (product copy: *"it cannot be unlinked to prevent potential data mismatches and reporting discrepancies"*), so agencies delete and recreate the client, which has already left a live sequence pointing at a deleted client ([01 §6](01-current-state.md)). No client can be capped, so one client can empty the pool for the rest ([Rajveersingh, 10 Aug 2026](https://app.basecamp.com/4378325/buckets/15549277/question_answers/10180509036#__recording_10186164656)). Two agencies (measured) that asked for a restricted client view got it as hardcoded account ids `190877` and `197372` in [`user-details.tsx`](../repos/saleshandy-webui/src/shared/utils/user-details.tsx), checked in 19 files (measured). A third agency cannot have it.

**Why they do not find out.** Nothing tells an agency that a client login is a filter over shared data rather than a container. The client dimension exists in five states (measured): assignable and filterable on Sequences and Email Accounts; a derived column that cannot be filtered on Prospects ([`prospect-list.tsx:1663`](../repos/saleshandy-webui/src/components/prospect/components/prospect-list/prospect-list.tsx)); neither shown nor filterable on Tasks ([`tasks-content.tsx:2366`](../repos/saleshandy-webui/src/components/tasks/components/tasks-content/tasks-content.tsx)); filterable in Unified Inbox; absent from Dialer (zero client references under `src/components/dialer/`, measured). When the pool empties, a client's sending stops with no message naming the agency, so the client blames Saleshandy.

**What the fix creates.** A solo operator with two clients moves from one screen to three or four contexts ([24 §1.2](24-strategic-review.md)), and that group is unsized. If migration is deferred (OQ1), two client models run in production at once ([23 §7.4](23-migration-and-signup.md)). "Workspace" already means "team" in plan copy ([`compare-plans-config.ts:147`](../repos/saleshandy-webui/src/components/settings/components/billing-subscription/components/platform-plans/config/compare-plans-config.ts)). Caps that sum past the pool mean several clients can stop at once, arriving as several tickets ([07 §8.5](07-product-direction.md)).

## 2. Why this approach

**Decision: a container per client, one account pool with a cap per workspace, access set per workspace, and work that rolls up by assignment.**

| Candidate                                                                                | Rejected on                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Patch the label model: add the client filter to Prospects and Tasks, add per-client caps | The prospect is account-level, so isolation and client visibility are mutually exclusive by construction ([01 §6a](01-current-state.md)). The association trap is a data-integrity rule, not a missing feature, in the words of the engineer who built it ([01 §6](01-current-state.md)). The hardcoded account ids are what patching this model looks like at scale |
| A subscription per workspace (Instantly's model)                                         | Contradicts the live "Unlimited Clients" claim, which is on all three tiers in-app (`[true,true,true]`, measured)                                                                                                                                                                                                                                                    |
| Sub-wallets: credits moved out of the pool into each client                              | Strands capacity, forces a redistribution on every new client, and forbids the oversubscription agency margin depends on ([07 §4.2](07-product-direction.md))                                                                                                                                                                                                        |
| **Container, one pool, cap per workspace, per-workspace access (chosen)**                | HeyReach's shape, and the only one compatible with our own pricing page ([03 §2a](03-competitor-benchmark.md))                                                                                                                                                                                                                                                       |


## 3. What we're building

1. **A client is a workspace.** Its sequences, prospects, mailboxes, settings and members belong to it; nothing in one workspace is readable from another. The agency workspace administers those client workspaces and holds the agency's own outreach alongside that administration.
2. **One pool, a cap per workspace.** Every consumable is metered to the workspace that spent it; reaching a cap stops that workspace, names the agency, and offers request-more; the agency may cap past the pool and may never reserve past it.
3. **Access is set per workspace, for staff and clients alike; membership decides which workspaces you can see at all.** A person sees only the workspaces they belong to, and within each one reaches only what their own access there grants; a client reaches only the screens and actions its agency granted; replies and tasks roll up across a person's assigned workspaces with the client on every row; records never roll up.

**Invariant in every state:** a client user never sees another workspace's name, record or count; every client-facing limit message names the agency; sending never stops mid-step for a prospect already in flight; an action taken from a roll-up row writes into that row's workspace; a client login cannot be left with zero screens.

## 4. User stories

| ID   | Story                                                                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------- |
| US1  | As an agency owner, I see what each client costs to serve and rank clients by outcome, so I price and prune on numbers |
| US2  | As an Admin, I see and act on only the clients I am assigned, so I cannot touch a client I do not run                  |
| US3  | As a Member, I work one queue across my assigned clients and every row tells me whose it is                            |
| US4  | As a client with full access, I open my own prospect and read its full email trail without the agency screensharing    |
| US5  | As a restricted client, I reach only the screens my agency granted and am told once, plainly, what I cannot do         |
| US6  | As an agency owner, I cap each client's spend, get asked when a client wants more, and approve in one action           |
| US7  | As an agency owner, I buy mailboxes centrally, assign each to one client, and take it back when the client leaves      |
| US8  | As an existing agency, on launch day every client I have becomes a workspace and nothing I could see yesterday is gone |
| US9  | As an agency owner, I restrict which staff see which client, which I want today and cannot do                          |
| US10 | As an agency, I run my own new-business outreach in a workspace of its own, on the same pool, under its own cap        |
|      |                                                                                                                        |

## 5. Decisions

l**D1 – Each client is its own workspace; workspaces never share data.** Every feature's scope answers three questions: whose records these are (stay in one workspace), who pays (one pool, capped per workspace), and whether one person must work across clients (rolls up by assignment). See [20 §1](20-feature-scope-matrix.md). *Why:* today's client label sits on one shared, account-wide prospect list, and no permission setting can truly separate that ([01 §6a](01-current-state.md)). *Cost:* the prospect record itself gains a workspace, the real cost of this project, still unpriced (OQ10). **Consequence to accept explicitly:** the same person in two clients' workspaces becomes two records. Cross-client duplicates become a count only; the agency never sees the actual records ([08 §7](08-consideration-checklist.md)). Moving a sequence or a prospect between workspaces is not in this release.

**D2 – One agency workspace, holding both its administration and its own outreach. Client work lives in client workspaces.** *Reopened 16 Sep 2026; the v1 decision is below.* *Why:* the "whose work is this" problem is created by client records and agency records sharing one list, and the client-workspace boundary already removes it. Once a client's sequences live in that client's workspace, a sequence in the agency workspace has exactly one possible owner, so no row needs a label. The two cross-workspace lists, Replies and Tasks, do name a workspace on every row, because there a row genuinely can be anyone's. *Cost:* an agency that runs no outreach of its own carries seven Outreach items it will never use. They are one rail group, and the open question is whether to let the owner hide it. **Consequence to accept explicitly:** the agency workspace holds what belongs to the whole account (Dashboard, Work queue, Client Management, Billing, the mailbox estate, the template library, both combined views) *and* the agency's own records. Its own outreach draws from the shared pool under its own cap, like a client would, and is not counted in cost to serve. Who may see it is an ordinary access grant, not a separate staff list.

> **What v1 said, and why it was reopened.** v1 (11 Sep 2026) split the two: *"The master account only administers clients; the agency's own outreach runs in its own ordinary workspace,"* on the grounds that otherwise *"every screen would first have to answer 'whose work is this,' and the answer would change row by row"* ([22 §6.1](22-prototype-refinement.md)). That argument holds only for the design it replaced, where one Sequences list carried client and agency campaigns behind a scope toggle. It does not hold once clients have workspaces. v1 also named its own reopen condition: *"Three contexts is two too many for a solo operator with two clients... If interview two says otherwise, D2 is the decision to reopen, not the switcher"* ([24 §1.2](24-strategic-review.md)). This is that reopen, on those terms.

**D2a – The agency's own outreach now shows up in the combined work views too, not just the spending cap.** *Closes OQ12.* Its replies appear in the master's combined Replies view, labelled as the agency, wherever a cross-client view exists. *Why:* it already had a spending cap like a client, but its replies were excluded from the combined views, inconsistent since replies count as work (D3). Excluding them meant the one workspace nobody else watches for missed replies was also missing from the list built to catch them. **Consequence to accept explicitly:** the combined Replies and Tasks views can no longer say simply "across your clients," since some rows won't be a client; they say "across your workspaces" and name the workspace on every row. A Member sees an own-outreach row only if granted the agency's own outreach, which is an ordinary access grant like any other (D5a).

**D3 – Work rolls up in full; numbers roll up as numbers; records never roll up.** Replies and tasks roll up as complete rows, but only from workspaces where your own access lets you see that screen, client named on every row. Counts and rates roll up only as numbers, blended on the Dashboard. The records themselves, a sequence, a prospect, a mailbox, never leave their workspace; no screen lists them across clients ([16 §0.1](16-end-to-end-flows.md), [24 §3.1](24-strategic-review.md)). *Why:* a number isn't the client's actual data, so combining it is safe. A list of replies or tasks is safe too, as long as it's limited to your own workspaces with the client named on every row, and every competitor we checked builds their inbox this way. **Consequence to accept explicitly:** the combined Replies view must match everything today's Unified Inbox filter does. The combined Tasks view is entirely new, nothing like it exists today. The Dialer can't join either yet: it has no concept of which workspace a call belongs to, so calls wait until that exists (§9).

**D4 – Assignment decides who can act where, across five roles.** Account owner, Admin, Member, and two client roles ([16 §1](16-end-to-end-flows.md)). Which workspaces you belong to is new; billing visibility is not a separate switch, it comes straight from the role, and only the owner has it. *Why:* one membership filter used to be enough to make every cross-client list safe; since D5c it is membership plus that person's own access in each workspace, the same two-part check a client's access already gets. The interviewed agency asked for staff restriction it can't get today. **Consequence to accept explicitly:** on launch day every agency user belongs to every workspace at full access, so nothing is restricted until the agency narrows it. `M1` calls this out; nothing forces it.

**D5 – Client access is set per workspace: every screen the product has, four actions, five presets.** *Amended 21 Sep 2026 (was seven screens); see D5e.* Screens: every module of the live product, scoped to the workspace, plus Usage: Sequences, Tasks, Replies, Lead Finder, Prospects, Dialer, Email Verifier, Email accounts, Templates, Inbox Radar, Reports, Usage, Email Warm-up, Refer a Friend (14 today; Settings is always present and not a grant). Presets: Reports only, Lead Finder only, Read everything, Reply and run, Everything ([22 §7.2](22-prototype-refinement.md)). An action can't be granted without its screen. The last screen can't be switched off; Disable already exists to suspend the client instead. Only an owner or Admin can set it, never a Member. *Why:* the product already hardcodes the first two presets for two paying accounts; the underlying permissions exist but have no per-workspace surface. **Consequence to accept explicitly:** the old Full, Limited and No-access levels survive only as presets.

**D5a – Access is the only permission a client user has.** *Closes OQ8. Amended 16 Sep 2026 by D5d, which reverses its set-once clause; the rest stands.* A client user has no account role and no second control of any kind: what they can reach is whatever their access set allows, and nothing else in the product decides it. *Why:* two controls over one outcome caused a real failure: an invite promised a client "see everything of your own, including the full email trail, and reply," but their actual access showed one screen and no reply button. Access wins because it is the one setting a client can actually be shown. Invite text is generated from the access set, so it can never promise more than the grant. **What has been withdrawn:** this decision used to add that access is set once per workspace and that two people from the same client therefore cannot get different access, with a second workspace offered as the answer. D5d replaces that; the workspace's set survives as the default a new client user starts from. It also used to close with "agency staff keep their own roles, a separate setting entirely," which D5c reversed on 15 Sep.

**D5d – A client user's access is their own, seeded from the workspace's default.** *Reverses D5a's set-once clause, 16 Sep 2026.* The workspace's access set stops being a single grant shared by every client user and becomes the **default a new invitee starts from**, editable for that person at invite time and afterwards. Two people at the same client can now differ: the client's founder reads everything while their SDR gets Replies and nothing else. The client's Access tab survives as the editor for that default, relabelled to say so. *Why:* the set-once rule forced an agency wanting one restricted user at a client to create a second workspace for the same company, which splits that client's prospects, mailboxes and reporting across two containers to express one permission. Agencies asked for it the other way round for staff (D5c) and the same argument reaches clients: an agency that will restrict its own colleague to one screen will be asked to do it for a client's junior too. **Consequences to accept explicitly:** (1) the permission surface is now 7 screens by 4 actions by every client user by every workspace, and support's question changes from "what does this workspace grant" to "what does this person hold here"; (2) the invite preview must derive from the individual's set, not the workspace's, or it reintroduces exactly the promise-versus-reality failure D5a exists to prevent; (3) **no agency has asked for this.** The interview and `US9` asked to restrict which *staff* see which client. This was put to Hitesh on 16 Sep against keeping D5a intact, and chosen knowingly; (4) a client user is no longer confined to one workspace either: the same real person can be invited to two of the agency's clients, with a warning at the picker that those clients then know about each other, rather than needing a second address; (5) `D5a`'s out-of-scope line and the §6.3 build spec both need the corresponding edit. The alternative considered and rejected was deleting the workspace-level set entirely, which would have stranded existing `c.access` data and made the common case, everyone at this client gets the same thing, cost a configuration per person.

**D5e – A client workspace holds the whole product.** *Decided 21 Sep 2026, Hitesh.* A client workspace contains every screen the live product has today, unchanged unless [`49-client-workspace-screen-inventory.md`](49-client-workspace-screen-inventory.md) says otherwise, plus one new screen, Usage, which shows the allowances the agency set and carries the request for more. What a client user sees is still the access set (D5), but every module is grantable; the five screens D5 had reserved for staff (Tasks, Dialer, Email Verifier, Templates, Inbox Radar) join the set, as do Email Warm-up and Refer a Friend. Presets keep their names and "Everything" now means everything. *Why:* the client rail read as a cut-down product, and the design effort belongs on the screens that change, not on deciding which existing screens a client may not have. **Consequence to accept explicitly:** the audience split in the module table goes; a Reports-only client still sees one screen, so the restriction stays available, it is simply no longer the default shape. The design scope is the third and fourth columns of the inventory; every other screen ships as it is today.

**D5b – The four actions are Reply, Pause and edit, Export, Reveal leads.** *Closes OQ9.* Inviting a colleague is removed as an action. *Why:* inviting someone is administration, not outreach, and the action that actually spends the agency's money, revealing a lead, was missing entirely. Without it, "Lead Finder only" had to be view-only, since the product could show the screen but not let anyone spend on it. **Consequence to accept explicitly:** a client can't add its own users in this release; every client user is invited by the agency. Reveal follows the same rule as the rest: no grant without the Lead Finder screen.

**D5c – Agency staff get a graded permission per workspace too, over their own 11 screens, not just membership.** *Reverses D5a's closing line and D4's membership-only clause, 15 Sep 2026.* A staff member's reach in a workspace is one of three presets, Reporting, Lead sourcing, or Everything, distinct from the client's own five presets because a staff preset grants screens only while a client preset grants screens and actions; since D5e (21 Sep 2026) the two sets cover the same modules, 13 for staff (everything but Usage) and 14 for a client. The same person can be Everything on one client and Reporting on another, the same variance D5's client access already allows. *Why:* the prototype had already built this without any decision behind it, citing D5a for authority D5a does not give; reversing it back to plain membership would delete the only control an agency has to restrict which staff see which client's actual work, not just whether the client exists to them. No agency has asked for this specific grading yet: the interview and `US9` asked only to restrict which staff see which client, which plain membership already delivers. Put to Hitesh directly as a choice between the two, and decided in favour of grading. **Consequence to accept explicitly:** account role (Owner, Admin, Member, D4) and workspace access are now two independent settings for staff too, the same split D5a already drew for clients. The two hardcoded client accounts in [22 §7.1](22-prototype-refinement.md) are the evidence this is not hypothetical: an agency that hardcodes a client down to one screen will ask to do the same to a staff member. The cost is a real permission surface, 11 modules by however many staff by however many workspaces, for the product to keep coherent, and a support case that used to be "are they a member" is now "are they a member, at what access."

**D6 – Mailboxes are bought by the agency, land unassigned, get assigned to one workspace, and return to the agency when the client leaves.** A mailbox someone already owned and connected themselves goes wherever they go ([22 §6.2](22-prototype-refinement.md)). *Why:* the first thing an agency asks before moving its mailboxes here is what happens to the ones it paid for when a client leaves. *Cost:* this reverses an earlier decision that moving mailboxes was out of scope ([07 §6](07-product-direction.md), [08 §6](08-consideration-checklist.md)). **Consequence to accept explicitly:** whether warm-up history and sender reputation survive the move is still open (OQ4). If not, this ships as "release and reconnect," not a true move. The only mailbox a client can be said to own is one it connected itself; a client workspace has no billing of its own, so anything the agency bought belongs to the agency ([24 §2.2](24-strategic-review.md)).

**D7 – The agency buys one pool; each workspace gets a capped share. A cap can exceed the pool, a reservation can't.** A new workspace starts with a suggested cap, no reservation; a stricter mode, Bifurcated, sets the reservation equal to the cap ([07 §4, §5](07-product-direction.md)). *Why:* the model the agency asked for, and the only one that lets it oversell the pool while keeping any promise enforceable. **Consequence to accept explicitly:** the pool can run out while every workspace is still under cap, so several clients can hit a wall at once. That must be surfaced loudly to the agency (§6.4). How Hemanshu's distribute-and-bifurcate decision maps onto this is still open (OQ2).

**D8 – A client sets its own password; the agency never sees it.** Invite-and-accept replaces the agency forwarding credentials ([16 §6](16-end-to-end-flows.md)). *Why:* today the agency holds the client's password, and the client never consented to that. **Consequence to accept explicitly:** every existing client user gets one forced password reset on launch.

**D9 – Migration moves pointers, not data.** Each client record becomes a workspace. Sequences and mailboxes follow whichever client they're already linked to; prospects follow their sequence. Anything linked to no client, or to two, goes into a review queue, defaulting to the agency. Rollback is available for 30 days (assumed, per [08 §9](08-consideration-checklist.md)). *Why:* the last migration like this emptied sequences and forced clients to reconnect their integrations; that can't happen again ([01 §7](01-current-state.md)). **Consequence to accept explicitly:** a prospect live in two clients' sequences at once is the one case launch day can't resolve without disrupting a campaign. Whether that case exists in real data decides OQ1, and that call belongs to Hemanshu and Dhruv, not this document.

**D10 – During the agency's payment grace period, a created client workspace stays readable and stops sending.** The client's paused state names the agency and never the reason; the agency sees the failed payment, the days left, and every client as reading but not sending. Linked workspaces are on their own plan and are untouched. *Why:* in Aug 2025 an agency's failed payment locked its clients out until the 7-day grace period was patched ([card 8972332385](https://app.basecamp.com/4378325/buckets/22269754/card_tables/cards/8972332385)); a workspace model multiplies that surface, so the behaviour is decided rather than inherited. Decided 12 Sep 2026.

**D11 – On a linked workspace, "View as client" exists only if the client granted it.** The grant is a switch on the link-approval card, off by default, and can be changed later from the client's Workspace screen. A created workspace is the agency's and needs no grant. *Why:* the client funds and owns a linked workspace; nothing in the link request asked for the right to impersonate them. Decided 12 Sep 2026.

## 6. Surfaces

Each surface links its screens. Screen IDs follow [16 §11](16-end-to-end-flows.md). Priorities: P0 blocks release, P1 blocks GA, P2 follows.

### 6.1 Shell: switcher and context

**For:** every internal user with more than one workspace, arriving from anywhere. [`S0` switcher](prototype/agency-admin.html#clients), [board: the three places to be](prototype/board/index.html#the-three-places-to-be).

**Must do:** two groups (your agency, clients), search, lands on the same module you were in. Inside a client, the page header carries the client's avatar, name and "Client workspace", and the breadcrumb reads `Client / Module`. Not rendered at all for a client user, and a client user's popover renders nothing even if the trigger is forced ([16 Flow D check](16-end-to-end-flows.md)). Below 900px the rail collapses to icons; it does not disappear.

**Why the header:** the two UX reviews' worst finding is that inside a client nothing on the page says which client you are in, and three fixture clients share sequence names ([26 #1](26-ux-review-agency.md)). The model's safety argument rests on this being obvious.

**Out of scope:** an "All clients" scope inside any module ([09 reconciliation 5](09-screens-and-flows.md)).

| ID | Case | Expected | P |
|---|---|---|---|
| SH1 | Client user, any route | No switcher trigger in the DOM; forcing the popover renders zero rows | P0 |
| SH2 | Member assigned to 1 of 7 clients opens the switcher | Exactly 1 client row plus the agency row; no other client's name anywhere in the response | P0 |
| SH3 | Enter Northwind from Vertex while on Sequences | Lands on Northwind Sequences; header shows Northwind avatar, name, "Client workspace" | P1 |
| SH4 | Viewport 899px, internal user | Icon rail visible; switcher reachable | P1 |

### 6.2 Clients and the client record

**For:** owner and Admin. [`A1` list](prototype/agency-admin.html#clients), [`A2` add](prototype/agency-admin.html#addclient), [`A3` record](prototype/agency-admin.html#client=nw), [board: managing one client](prototype/board/index.html#the-agency-managing-one-client).

**Must do:** `A1` carries open, reply and positive-reply rate per client (asked 27 Mar 2024, still absent, [01 §2](01-current-state.md)); one status vocabulary shared with the Dashboard, worst state across resources, reason in the cell. `A2` creates from step 1 with defaults; steps 2 (members, role) and 3 (caps) are skippable and skipping is visible on `A3` as a checklist. Disable, Delete and Unlink each state their consequences before confirming, using the 33-cell lifecycle table in [08 §5c](08-consideration-checklist.md); a disabled client renders as disabled everywhere; a deleted client is listed under "Recently deleted" with Restore for 30 days (assumed). Every entry point to Add Client and Credits & Limits is gated by role, including the ones the prototype initially missed ([16 §3 note](16-end-to-end-flows.md)).

| State | When | Content |
|---|---|---|
| Active | default | Status chip from worst resource or infra state, with the reason |
| Disabled | owner or Admin disabled | Row greyed, "Disabled", `Re-enable` in header; login blocked, sending paused, reservation released |
| Deleted, recoverable | within 30 days (assumed) of delete | Under "Recently deleted" with `Restore`; logins ended; mailboxes released to unassigned |
| Link pending | connect request sent (§6.9) | Only a `Link status` tab: requested when, to whom, `Resend`, `Cancel` |
| Linked | client approved | Full record with `Funding` tab; no Limits, no Access toggles |

**Out of scope:** converting a created client to linked or back ([08 §5b](08-consideration-checklist.md)).

| ID | Case | Expected | P |
|---|---|---|---|
| CL1 | Admin opens `A1` | `Add Client` and `Credits & Limits` absent or refused; capacity-request banner counts only her clients | P0 |
| CL2 | Create from step 1 only | Workspace exists, can send, caps set to the suggested default, `A3` checklist shows limits and members pending | P1 |
| CL3 | Disable Northwind, then open `A1`, `A0`, the estate and the switcher | All four show Northwind disabled; its reservation is back in the pool; tomorrow's scheduled sends held, not cancelled | P0 |
| CL4 | Delete, then restore within 30 days | Sequences, prospects, mailboxes and members as before delete; client logins re-enabled only when re-invited | P1 |

### 6.3 Access

**For:** owner or Admin setting what a client can reach; the client landing on it. [`A4` Access](prototype/agency-admin.html#client=bl) (Access tab), [`J1` invite](prototype/agency-admin.html#invite), [reports-only client](prototype/agency-admin.html#asclient=bl), [board: what a client can reach](prototype/board/index.html#what-a-client-can-reach).

**Must do:** every screen as a card (14 today, D5e), one per screen, grouped, each carrying its switch and its actions as checkboxes; the five presets as one radio group above them, with a `Custom` state when a card is edited; and, beside the cards, a live preview derived from the same access set: the client's rail as it will be, where they land, what they can and cannot do, and the invite sentence. Members are part of this same screen, not a separate tab (D5c): one list of who is in the workspace, a client-user row pointing at the access set above, a staff row opening the same editor scoped to that person, choosing one of three presets over their own 13 screens rather than the client's 14 and five; unlike the client's version it carries no live preview and no per-screen action detail, since a staff preset grants a screen, not a graded set of actions on it. Switching a screen off removes its actions and says why on the row, and the preview loses the screen at the same moment. Any change that removes a screen from a client who is signed in confirms first, naming what they lose. The client lands on the first granted screen, never an empty tab; its rail and its tabs come from one source and agree. The client is told once, dismissibly, what its agency set up, in the second person, naming only what it has. The invite sentence is derived from the granted access, not from a role. `View as client` renders the client's own header, is always one click from "Back", and is logged to that client's activity, which the client can read. A linked client gets no toggles.

**Why one source for rail and tabs:** the first build shipped with the rail hardcoded and the 442-assertion (measured) suite passed straight through it ([22 §7.3](22-prototype-refinement.md)).

| Preset | Screens | Actions |
|---|---|---|
| Reports only | Reports | none |
| Lead Finder only | Lead Finder | none granted. Revealing spends the agency's credits and is a separate grant (D5b) |
| Read everything | all seven | none |
| Reply and run | all seven | Reply, Pause and edit |
| Everything | all seven | all four |

**Out of scope:** a client inviting its own users, removed by D5b, so every client user arrives by agency invite ([08 §2c](08-consideration-checklist.md)); per-client whitelabel. *Different access for two people at the same client moved into scope by D5d, 16 Sep 2026.*

| ID | Case | Expected | P |
|---|---|---|---|
| AC1 | Switch Replies off for Alloy | Reply action off and its toggle disabled with reason on the row; Alloy's next request cannot reach Replies or reply | P0 |
| AC2 | Attempt to switch the last screen off | Refused; copy points to Disable | P0 |
| AC3 | Brightline, Reports only, logs in | Lands on Reports; rail shows one item; no navigation control reaches any agency screen; note names Reports and nothing else | P0 |
| AC4 | Invite preview for Brightline | Sentence lists Reports only; no mention of reply or email trail | P1 |
| AC5 | Member opens Access tab | Read-only or denied; no toggle mutates | P1 |
| AC6 | Owner uses View as client on Northwind, then Northwind opens its activity | Entry is present with who and when | P1 |

### 6.4 Limits, allocation and usage

**For:** owner (and Admin, without cost columns) setting caps; client reading its own. [`A7` allocation](prototype/agency-admin.html#credits), [`B1` plan usage](prototype/agency-admin.html#credits), [client at limit](prototype/agency-admin.html#asclient=al).

**Must do:** per workspace per resource, a Limit and a Reserved value; the pool shows Unallocated. Edits are drafted and applied with an after-state ("Limits total 116% → 124%", illustrative) rather than committed per keystroke. A save that puts reservations above the pool is refused, naming the numbers. A cap below current consumption saves and stops the workspace. Thresholds (assumed, [08 §4d](08-consideration-checklist.md)): consumables hard stop at 100%; throughput warns at 80%, stops at 100%, never mid-step for a prospect in flight; storage warns at 85%, blocks import at 100%. A pool exhausted with workspaces under cap is a named "starved" state at the top of the Dashboard and the queue, above every reply. Request-more from the client asks amount and reason, appears once in the queue and once in `A7`, and approve or decline notifies the client with the reason. Every client-facing message names the agency. An Admin who can approve sees the pool she approves against.

| Client-side state | When | Content |
|---|---|---|
| Fine | under warn threshold | Used of limit, renews on date |
| Close to limit | past warn threshold | Same, plus "Meridian Growth can raise this" and `Request more` |
| At limit, not asked | 100% | Amber, not red; `Request more`; renewal date stays visible |
| At limit, asked | request pending | "You asked for more on 9 Sep, waiting on Meridian Growth"; link inert and reads as such |
| Own plan | linked client | "You are on your own plan"; no allocation table, no zeros |

**Out of scope:** money shown to the client; rebilling; a second approval above a threshold.

| ID | Case | Expected | P |
|---|---|---|---|
| LM1 | Set reservations totalling 16,000 against a 15,000 pool (illustrative) | Save refused with both numbers in the message | P0 |
| LM2 | Throughput cap reached while a prospect's step is mid-send | Step completes; no further prospects start; client banner names the agency | P0 |
| LM3 | Pool empties with every workspace under cap | "Starved" item at the top of the queue and Dashboard for the owner; each affected client's banner names the agency | P0 |
| LM4 | Client requests 4,000 (illustrative) with a reason; owner approves from the queue | Cap raised, sending resumes, client notified, `A7` shows the same request as resolved | P1 |
| LM5 | Consumption via a workspace API key | Charged to that workspace, never the account or another workspace | P0 |

### 6.5 Email accounts: the estate

**For:** owner and Admin buying, assigning and reclaiming mailboxes. [Estate](prototype/agency-admin.html#mail), [`A6` record tab](prototype/agency-admin.html#client=nw), [board: the sending estate](prototype/board/index.html#the-sending-estate).

**Must do:** one row per mailbox across every workspace, stating who paid (purchased shows `domainMailboxId`, measured, [`email-accounts-table.tsx:195`](../repos/saleshandy-webui/src/components/email-accounts/components/email-accounts-content/components/email-accounts-table/email-accounts-table.tsx)), which workspace holds it, and whether it can move. Filters by workspace, payer and health; the summary chips are filters. The estate is the only writer for assignment; `A6` and the in-client module show the same rows and link to the estate to move. One modal for a move, stating that the current workspace stops sending from it immediately and any sequence using it pauses, and showing the mailbox's health, bounce and complaint history so a burnt mailbox is not handed on unseen ([08 §16b.2](08-consideration-checklist.md) Q3). A client sees its purchased mailboxes as health-only and can connect, but not remove, its own. A queue "Reconnect" lands on the row with the action inline.

**Why one writer:** the prototype had three, with two contradictory answers to what a move costs one tab apart ([26 #10](26-ux-review-agency.md)).

| Row state | Payer | On client leaving |
|---|---|---|
| Unassigned | agency | n/a, and flagged as paid for and not earning |
| Assigned, purchased | agency | Returns to unassigned |
| Assigned, connected by the client | the connector | Stays with the client |
| Disconnected | either | Agency and client both notified; `Reconnect` inline |

**Out of scope:** a client purchasing from inside its workspace (no payer in V1, [24 §2.2](24-strategic-review.md)); Inframail IPs at workspace level.

| ID | Case | Expected | P |
|---|---|---|---|
| ES1 | The same mailbox viewed in estate, `A6` and inside the client | Identical status, payer and workspace on all three | P0 |
| ES2 | Move a mailbox from Northwind to Cascade | Northwind sequences using it pause before the move completes; estate, `A6` and both clients' modules agree after | P0 |
| ES3 | Delete Northwind | Its purchased mailboxes are unassigned; its connected mailboxes are not in the estate | P0 |
| ES4 | Client user attempts to remove a purchased mailbox | Refused; can view health | P1 |

### 6.6 Roll-ups and the Dashboard

**For:** owner and Admin (Dashboard), everyone internal (queue, Replies, Tasks). [`Q1`](prototype/agency-admin.html#queue), [Replies across clients](prototype/agency-admin.html#inbox), [Tasks across clients](prototype/agency-admin.html#task), [`A0`](prototype/agency-admin.html#dash), [board: daily and weekly](prototype/board/index.html#the-agency-daily-and-weekly).

**Must do:** every roll-up is filtered by the viewer's memberships, server-side, and its footer says so. Every row names its client. A row action resolves in place: a reply opens the thread in a panel beside the list, is sent from the mailbox bound to that thread and stored in that client's workspace, and the panel offers the next reply, so the operator never leaves the roll-up; a task completes from its row. "Open in the client's workspace" stays one click away but is never the only route. Where the role does not allow the action, the row lands on the object in that client's workspace with the action inline, never on a list without the action. Every write from a roll-up row (reply, task, call) lands in that row's workspace. Queue ordering is fixed by consequence ([16 §11.1](16-end-to-end-flows.md)); near-limit warnings are one row per client. Every badge equals the count of rows under it. The Dashboard ranks clients and never blends them into one rate; the plan-pacing warning moves above the decisions when runway is under 3 days (assumed). A Member sees no Dashboard and no rail item that opens a denied page. Aggregates are precomputed, not fanned out per workspace on load.

**Out of scope:** a cross-client Sequences, CRM or Analytics list; a client seeing anything cross-workspace.

| ID | Case | Expected | P |
|---|---|---|---|
| RU1 | Member assigned to Alloy only opens queue, Replies, Tasks | Zero rows from any other client, verified on the API response, not the render | P0 |
| RU2 | Reply from a roll-up row | The thread opens in place; the reply is sent from the mailbox bound to that thread and stored in that client's workspace; the viewer is still on the roll-up afterwards and is offered the next reply | P0 |
| RU3 | Task completed from a roll-up row | Record carries that row's workspace id | P0 |
| RU4 | Queue badge, Dashboard "see all", inbox badge | Each equals the row count of the list it opens | P1 |
| RU5 | Membership removed while a row is open | Next request refused; row gone on refresh | P1 |

### 6.7 Inside a client workspace

**For:** members of that workspace, agency or client. [`C1` sequences](prototype/agency-admin.html#asclient=nw), [`C2` prospect trail](prototype/board/index.html#what-the-client-sees), [`T1` settings](prototype/agency-admin.html#settings), [board: the same screen, different people](prototype/board/index.html#the-same-screen-different-people).

**Must do:** the existing modules, scoped to the workspace, with no client picker anywhere (the `Sequence → Settings` association picker is removed). `C2` shows a client its own prospect's full email trail: this is the payoff of the project and the thing that is impossible today. Settings follow [38](38-settings-decision.md), built on a sweep of every setting in the product ([37](37-settings-inventory.md)): `T1` lists 18 items. Per workspace: Prospect Fields, Integrations (connected by a person inside a workspace, since today a CRM connection is per user and fires for every client), Webhook, API Key (no account-wide key), MCP. Account default with workspace override and an agency lock: Prospect and Call Outcomes (add only), Schedules, Out of Office, Safety Settings, and six of the seven Admin Settings groups; the Security group (SSO, authorised domain, MFA) stays account-only and is absent inside a client. Account floor a workspace can only add to: Do Not Contact and Do Not Call, which already carry a per-client scope today. Pool assigned to one workspace: Custom Tracking Domain. Agency only, never inside a client: Whitelabel, Billing. Mailbox and sequence settings travel with their resource, and both Associate Client pickers are removed. Each row shows its source and offers a three-state control (use default, override here, locked). A client's Settings show only items for screens it holds and carry no agency navigation. A prospect imported here lands here. The same person in two workspaces is two records; the agency sees the collision count, never the other record.

**Out of scope:** templates library behaviour until OQ5; moving a sequence or prospect between workspaces; a client seeing benchmarks against other clients.

| ID | Case | Expected | P |
|---|---|---|---|
| **CW1** | **Client-full user opens any prospect in its workspace** | **Full email trail visible; no event from any other workspace in the response. Sign off by name, owner: Rajat, verified at the API, not the render** | **P0** |
| CW2 | Same email address imported into Northwind and Vertex | Two records; each workspace sees one; agency sees "1 prospect in common" with no record | P0 |
| CW3 | Client user opens Settings | No item for a screen it does not hold; no control reaches Client Management, Billing or the switcher | P0 |
| CW4 | Account DNC entry, workspace attempts to remove it | Refused; workspace may add | P1 |
| CW5 | Existing API key with no workspace after launch | Acts in the account's own-outreach workspace only | P0 |

### 6.8 Launch day

**For:** the owner of an existing V3 agency account, once. Ships only if OQ1 resolves to "with V1"; the mechanism is decided (D9) either way. [`M1`](prototype/agency-admin.html#migration), [board: launch day](prototype/board/index.html#launch-day-for-an-agency-that-already-exists).

**Must do:** `M1` blocks the Dashboard once, lists only the clients that existed as V3 records, and reconciles its arithmetic on screen (assigned plus unresolved equals total). The review block for prospects on no client or on two opens `M2`, whose default is "Keep in agency" and whose destination list contains only funded, live workspaces. Shared mailboxes are flagged, not split. Every agency user is seeded as a member of every workspace and `M1` says so and offers to narrow it via a people-by-clients view. Caps default to last 30 days plus 25% (assumed, needs an agency reaction, [19 §4](19-agency-interview.md)). Rollback for 30 days from Settings (assumed). Sender accounts with no clients see nothing: no switcher, no new word. Existing CRM connections are per user today, not per account ([37 §3](37-settings-inventory.md)); where each lands on conversion is dependency 11 in §9 and is not decided here.

| ID | Case | Expected | P |
|---|---|---|---|
| LD1 | Account with clients, first owner login | `M1` shown once; Admins and Members land normally | P0 |
| LD2 | Prospect on Northwind's and Vertex's sequences | In `M2`, not in either workspace; neither sequence altered | P0 |
| LD3 | Roll back within 30 days | Account reads exactly as pre-launch, including client logins | P0 |
| LD4 | Sender with zero clients | No `M1`, no switcher, rail unchanged | P0 |

### 6.9 Connect an existing account

**For:** an agency whose client already owns Saleshandy; the client's owner approving. Gated on OQ3; until answered, `A2` shows Create only. [`A2` connect](prototype/agency-admin.html#addclient), [`C0` request](prototype/agency-admin.html#solo), [linked client](prototype/agency-admin.html#asclient=hv).

**Must do:** the agency enters a Workspace ID and the product never reveals whether it exists; the client's owner sees who is asking (the requesting person at the agency), what they get, what they do not, what the client keeps, and approves, declines or reports. Nothing changes until approval. On approval the agency owner joins as Admin, not owner. The client can revoke at any time from its own Settings, the agency is told, sending continues, and the client's post-revoke state exists. Whitelabel does not rebrand mid-session without a decision (OQ13).

| ID | Case | Expected | P |
|---|---|---|---|
| CN1 | Request sent to an unknown ID | Same response as a known one | P0 |
| CN2 | Client revokes mid-campaign | Agency access ends on next request; client's sequences continue; client Settings state it | P0 |
| CN3 | Agency opens a linked client's Access tab | No toggles; members list shows agency staff only; the client owner cannot be removed by the agency | P0 |

## 7. Reconciliation with existing behaviour

**Scope map: every path by which a client sees or is starved by another client today, and the control that closes it.**

| Path today | Behaviour today (measured) | Control in this PRD |
|---|---|---|
| Sequences | Assignable to one client, filterable; association permanent on activation | Containment; the association picker is removed; `Sequence → Settings` has no client field |
| Email Accounts | Assignable to one client, filterable | Containment plus the estate (§6.5); assignment happens in the master only |
| Prospects / CRM | Account-level; derived client column, not filterable | Workspace dimension on the prospect (§9); `C2` shown to the client |
| Tasks | Client neither shown nor filterable | Per workspace plus membership-filtered roll-up |
| Unified Inbox | Filterable by client | Per workspace plus roll-up; parity is a release condition (RU1, RU2) |
| Dialer, calls, recordings | No client field anywhere | Per workspace; a call from a roll-up row writes into that row's workspace; needs the field (§9) |
| Domains, email infra, Inframail IPs | No client dimension | Pool at the account, assigned to one workspace; IPs stay account-only |
| Client login and credentials | `/agency/login`, credentials emailed to the agency | `J1` invite; existing client users forced to reset once |
| `hideSideBarTabs()`, `leadFinderViewOnly()` | Accounts `190877` and `197372` hardcoded across 19 files | Presets Reports only and Lead Finder only; both accounts migrated to the preset; the hardcode removed in the same release |
| Fourteen company settings (measured) | One copy for the whole account | Scope per item in [08 §1](08-consideration-checklist.md); nothing stays global that names a client's data |
| Permission levels Full / Limited / No access | Per client user | Five presets over every screen (14 today) and 4 actions, held per client user and seeded from the workspace default (D5, D5a, D5d) |
| 2022 Agency Portal | Live, separate accounts, weekly manual reconciliation | Untouched; sunset is OQ14 |
| V3 Client Management, if migration is deferred | Coexists | Two models in production; the cost is priced in [23 §7.4](23-migration-and-signup.md) and the decision is OQ1 |

**The one line of copy that ships:** on the old Client Management list, for accounts not yet converted, *"Clients are becoming workspaces. Nothing changes until your account is converted."* Wording is settled at copy review; the presence of the line is required so nobody meets two models unexplained.

**Remains open:** which word the product uses ("client workspace" is proposed, [08 §14](08-consideration-checklist.md); the plan-copy collision is OQ15).

## 8. Cross-cutting

| Requirement | Release blocker |
|---|---|
| No response to a client user contains another workspace's records, names or counts. Enforced server-side; the render is not the control | **Yes** |
| Every client-facing limit, pause or block message names the agency | **Yes** |
| A write is attributed to the workspace the acting screen belongs to, never to a session-level "current workspace" | **Yes** |
| Sending never stops mid-step for a prospect in flight, whatever the cap | **Yes** |
| Every entry point to a role-gated action is gated, not just the primary one | **Yes** |
| Audit log: who entered which workspace, who changed a limit, who approved a request, who exported, who used View as client | **Yes** |
| Every badge and headline count equals the length of the list beneath it | Yes |
| Denied state names the person, the role, and who can | No |
| Empty state is one sentence and one action | No |
| No internal or prototype copy ("open with engineering", scope codes) reaches a shipped screen | Yes |
| When whitelabel is on, every client-facing email and `J1` carry the agency's brand | Yes for whitelabel accounts |
| Roll-up aggregates precomputed; no per-workspace fan-out on page load | Yes at 50 or more workspaces (assumed threshold) |
| Every list that grows with the client count (Clients, People, the estate, the switcher, the ranked Dashboard table) pages or caps, carries a search, and stays usable at forty workspaces. The prototype renders this state at `#scale=40`; sixty is the assumed V1 ceiling | Yes |

## 9. Implementation notes

**The mechanism that makes §6.7 possible is the prospect gaining a workspace dimension.** Everything else is scoping over resources that already carry a client id. Stated as outcome only: a prospect belongs to exactly one workspace; the same email in two workspaces is two prospects; the agency sees the fact and count of a collision, never the other record ([08 §7](08-consideration-checklist.md)). Existing prospects are assigned by their sequence association at conversion; the rest enter `M2`.

**The roll-up safety mechanism:** membership filter applied on the server for every cross-client list, and a binding on every row that fixes the write target: the sending mailbox for a reply, the workspace id on a task or call record. Existing API consumers sending no workspace are pinned to the account's own-outreach workspace so nothing breaks silently ([08 §12](08-consideration-checklist.md)).

**Resolve before estimation.** An estimate against any of these is wrong, not approximate.

| # | Dependency | Owner |
|---|---|---|
| 1 | Cost of the workspace dimension on the prospect | Rajat (OQ10) |
| 2 | Whether two accounts' prospect tables can coexist under one agency view, for §6.9 | Rajat (OQ3) |
| 3 | Whether a mailbox keeps warm-up state and reputation through a move | Rajat (OQ4) |
| 4 | A workspace field for calls, phone numbers and recordings; whether Dialer and CRM are seat- or account-metered | Rajat (OQ11) |
| 5 | How Inbox Radar is metered | Rajat (OQ11) |
| 6 | Whether editing a template changes an already-scheduled email, for OQ5 | Rajat |
| 7 | Whether a client user can reach the domain purchase flow today | Rajat |
| 8 | Whether sending reputation partitions at all, which gates external wording only | Rajat (OQ11) |
| 9 | The join between purchased mailboxes (`GET /v1/domain`) and connected email accounts, which share no key in the API today; D6's "who paid" rests on it | Rajat |
| 10 | A workspace id and a bound mailbox on every inbox thread and on every task, so a reply or completion from a roll-up row lands in the right workspace (RU2, RU3); today a thread carries only `fromEmail` and a task carries no client at all | Rajat |
| 11 | CRM integrations are keyed to the user today, not the account; where each existing connection lands on conversion, and whether a client workspace can hold its own | Rajat, with Hitesh, after the settings sweep in [37](37-settings-inventory.md) completes |

**Deliberately not adopted, so nobody thinks they were missed:** sub-wallets; an account-level API key acting across workspaces (consent would have to ship with it, [15 §5](15-instantly-teardown.md)); per-client whitelabel; a metadata-only inbox roll-up (reversed 9 Sep, [10](10-cross-workspace-visibility.md)); an agency workspace nested under another; migration by export and re-import; an in-sequence client picker ([24 §4](24-strategic-review.md)).

## 10. Measurement

**Privacy constraint.** No event carries a prospect's email, name or message body. Client-side events carry the acting workspace id and account id and never another workspace's id. View-as-client is written to the audit log, not to product analytics with the client's data attached.

**Instrumentation ships with the feature.** The gates in §11 cannot be read otherwise. Hitesh owns the event definitions below; Rajat owns the build, in the same to-do as the feature. Decided 12 Sep 2026.

| Event | Fires when | Properties |
|---|---|---|
| `workspace_created` | create or connect completes | mode, via (create / connect / migration), skipped_steps |
| `client_session` | client user signs in | preset, screens_count, actions_count, first_login |
| `client_blocked_nav` | client attempts a route it does not hold | route |
| `access_changed` | Access tab save | preset, screens_added, screens_removed, by_role, client_signed_in |
| `cap_set` / `cap_hit` | save; a workspace reaches 100% | resource, ratio_to_pool, starved |
| `capacity_requested` / `capacity_resolved` | client asks; agency decides | resource, amount, outcome, hours_open |
| `mailbox_assigned` / `mailbox_moved` | estate write | payer, from_kind, to_kind, health_ack |
| `rollup_action` | reply, task or call from a roll-up row | type, landed_workspace_match |
| `prospect_trail_viewed` | `C2` opened by a client user | none beyond ids |
| `membership_narrowed` | any agency user removed from a workspace | remaining_share |
| `migration_completed` / `migration_rolled_back` | `M1` shown; rollback | clients, unresolved_prospects, flagged_mailboxes, deferred |

**Leading indicators, read from day 1, decide by day 14.**

| Metric | Definition | Healthy | Investigate |
|---|---|---|---|
| **Cross-workspace leak reports** (the single most important early signal) | Support or audit finding of any client seeing another's data | 0 (target) | Any |
| Roll-up landing accuracy | `rollup_action.landed_workspace_match` = true | 100% (target) | Below 100% |
| Client second session | Client users with a second `client_session` within 14 days of the first | above 50% (target, assumed; no baseline exists) | below 30% |
| Client blocked-nav rate | `client_blocked_nav` per client session | below 0.2 (target, assumed) | above 0.5 |
| Migration rollback rate | `migration_rolled_back` / `migration_completed` | below 5% (target, assumed) | above 10% |
| Membership narrowed | Agency accounts with any `membership_narrowed` within 14 days of launch | above 30% (target, assumed) | below 10% |

**Lagging, day 30 / 90.**

| Metric | Story | Read at |
|---|---|---|
| Agency accounts with at least one client that logged in in the last 30 days | US4, US5 | 30, 90 |
| Cost-per-client view opened by owners, share of agency accounts | US1 | 30, 90 |
| Capacity requests resolved within 24h (assumed window), share | US6 | 30 |
| Mailboxes reassigned without a reconnect | US7 | 90 |
| Population B accounts churned, against the prior 90 days | US8 | 90 |
| Agency accounts with any restricted preset in use | US9 | 90 |
| Own-outreach workspaces with a sequence active | US10 | 90 |
| Agency accounts that bought a bigger pool | expansion | 90 |

**Guardrails.**

| Guardrail | Threshold | Action |
|---|---|---|
| Any confirmed cross-workspace leak | 1 | Halt the current stage; roll back the affected accounts' exposure |
| Roll-up write landed in the wrong workspace | 1 | Halt; roll back the roll-up surfaces |
| Migration rollback rate | above 10% (assumed) of converted accounts in 14 days | Halt automatic conversion |
| Simultaneous client stops from one pool ("starved") | above 3 clients (assumed) in one account in one day, at more than 5 accounts | Halt expansion; raise the starved warning threshold |
| Support tickets from population B | above 2x (assumed) the prior 14-day baseline | Halt the next stage |

**Success criteria**, judged at day 90 of stage 3 exposure.

1. Zero cross-workspace leaks (target). Non-negotiable.
2. Roll-up write accuracy 100% (target). Non-negotiable.
3. Both hardcoded accounts running on presets, hardcode removed. Non-negotiable.
4. Client second-session rate above 50% (target, assumed). Iterate below it; do not revert.
5. At least one third (target, assumed) of agency accounts narrowed membership. Iterate below it.
6. Population B churn not above the prior 90 days. Non-negotiable for stage 4.

## 11. Rollout

Staged exposure is **blast-radius control, not an A/B cohort**. No stage starts while OQ3 is unanswered with Connect visible, or while OQ10 is unanswered at all.

| Stage | Who | Gate to the next |
|---|---|---|
| 0 | Saleshandy's own account, dogfood as an agency with three fixture clients | All P0 criteria pass; CW1 signed off by Rajat |
| 1 | The interviewed agency, if willing, and accounts `190877` and `197372` (3 named accounts) | 14 days, leak guardrail clean, presets replace the hardcode |
| 2 | New agency signups only; no conversion of existing accounts | Leading indicators healthy at day 14 |
| 3 | Population B, opt-in conversion | Migration rollback below threshold; OQ1 answered |
| 4 | Population B, automatic conversion | Only if OQ1 resolves to "with V1"; otherwise stage 3 is the end state and the old model is sunset per OQ14 |

## 12. Open questions

| # | Question | Why it matters | Recommendation | Owner | Blocks |
|---|---|---|---|---|---|
| OQ1 | Does migration ship with V1? Hemanshu's recorded position: *"Migration is not part of V1. For some time we will have Old Client Management + New Workspaces"* ([card](https://app.basecamp.com/4378325/buckets/22269754/card_tables/cards/10244088475)) | Decides stages 3 and 4, and whether two models run | Pull the five counts in [23 §7.6](23-migration-and-signup.md) (a database query, not PostHog). If no account holds a prospect on two clients' sequences, ship together; if a handful, migrate those by hand; if common, defer | Hemanshu, with Dhruv | Launch scope |
| OQ2 | How does "distribute limits across workspaces, plus an option to bifurcate" map onto D7? | "Distribute" read as a hard split is the sub-wallet | Distribute = cap on a shared pool; bifurcate = reservation equal to cap as a per-workspace switch. One invoice | Hemanshu | §6.4 |
| OQ3 | Can two accounts' prospect tables coexist under one agency view? ([08 §17.1](08-consideration-checklist.md)) | Gates the entire connect path; the interviewed agency has clients who already own accounts | Answer before anything else in §6.9; until then ship Create only and hide Connect | Rajat | **§6.9, estimation** |
| OQ4 | Does a mailbox keep warm-up and reputation through a move? ([08 §312](08-consideration-checklist.md)) | Decides whether §6.5 sells a move or a release-and-reconnect | Build the estate either way; label the action by the answer. Ask the next agency how it names purchased domains: if per client, the reusable unit is the paid slot, not the address | Rajat | **§6.5, estimation** |
| OQ5 | Templates: copied ([08 §1a](08-consideration-checklist.md)) or live-linked with fork on local edit ([22 §3](22-prototype-refinement.md))? Both cannot ship | Drift across forty copies versus a client edit mutating the master | Live-linked, fork on edit, publish refuses if a merge field is missing in the target; confirm dependency 6 first | Hitesh | Templates surface |
| OQ6 | Workspaces return to the 2022 container model abandoned in 2024. Why was it abandoned? | We may be repeating a known mistake; Malav has left | Ask before design sign-off; not a build blocker | Dhruv | Sign-off |
| OQ7 | Whitelabel is Enterprise-only while Client Management is Scale | Decides whether `J1` and client emails can carry the agency's brand for most agencies | Bundle whitelabel into the agency tier, as HeyReach does | Dhruv | Branding rows in §8 |
| OQ10 | Cost of the workspace dimension on the prospect | One-quarter or three-quarter project | Walk [08 §1](08-consideration-checklist.md) row by row: cheap, expensive, schema change | Rajat | **Estimation** |
| OQ11 | Dialer and CRM metering; a workspace field for calls; Inbox Radar metering; reputation partitioning | Three rows of the scope matrix and the external wording | Answer with OQ10 in one session | Rajat | §6.6 calls, §6.4 rows |
| OQ13 | Whitelabel collides mid-session when switching from a created to a linked client ([08 §17.2](08-consideration-checklist.md)) | Disorienting or correct, undecided | Keep the agency's brand in the agency's chrome; the client's brand only in the client's own session | Hitesh | §6.9 |
| OQ14 | Sunset date for the 2022 Agency Portal | Otherwise three agency models run | Two quarters after GA | Dhruv, with Hemanshu | Stage 4 |
| OQ15 | "Workspace" means "team" in plan copy; Unlimited Teams is Scale-only, Unlimited Clients is on every tier | Same word, two meanings, on one Billing page | "Client workspace" in all agency copy; pull the Teams-usage count with OQ1 | Hitesh, with Hemanshu | Copy |
| OQ16 | Whose seats do agency staff consume inside a linked workspace? ([08 §17.3](08-consideration-checklist.md)) | Spending the client's plan without a conversation | Agency seats, never the client's | Hemanshu | §6.9 |
| OQ17 | Clients see Replies, Prospects and Reports where the product says Unified Inbox, CRM and Analytics. Does the product adopt the client vocabulary for everyone, or does the client workspace carry an alias? | An alias means two names for one screen in the codebase, in support articles and in tickets | Decide for the whole product before build; the client-side names tested better in the prototype and are the recommendation | Hitesh, with Hemanshu | Design sign-off |
| OQ18 | Which billing model: one pooled plan only, per-client budgets only, or the hybrid the prototype builds (shared pool, independent budget per client on request, linked clients on their own plan)? Hemanshu called billing the biggest decision and asked that Dhruv discuss it first | The allocation screen is polished enough to be mistaken for agreed | Hybrid, as built; present it as one of three until Dhruv has weighed in | Hitesh, with Dhruv and Hemanshu | Sign-off |

## 13. Priority & timeline

| | |
|---|---|
| Priority | High. Card handed over by Hemanshu 8 Sep 2026 ([thread](https://app.basecamp.com/4378325/buckets/22269754/card_tables/cards/10244088475#__recording_10281934025)) |
| Target | Not set. Estimation cannot start until OQ3, OQ4 and OQ10 are answered |
| Release gate | Design sign-off by Hemanshu; feasibility answers from Rajat; founder review of OQ6 and OQ7 by Dhruv; two more agency interviews with the `#present` running order ([22 §5](22-prototype-refinement.md)) |

| Work | Owner | Due |
|---|---|---|
| Design sign-off on the prototype and board | Hemanshu | Before estimation |
| OQ3, OQ4, OQ10, OQ11 and the five counts in [23 §7.6](23-migration-and-signup.md) | Rajat | Before estimation |
| OQ1, OQ2, OQ16 | Hemanshu | Before stage 3 |
| OQ6, OQ7, OQ14 | Dhruv | Before sign-off |
| OQ5, OQ13, OQ15 | Hitesh | Before estimation |
| OQ17 | Hitesh, with Hemanshu | Before design sign-off |
| OQ18 | Hitesh, with Dhruv and Hemanshu | Before sign-off |
| §10 event list | Hitesh (definitions), Rajat (build, in the implementation to-do) | Before estimation |
| Two more agency interviews | Hitesh | Before sign-off |
| QA owner and test plan from the criteria in §6 | Rajat to name | Before stage 0 |
| Instrumentation in §10 | Rajat to name | Ships with stage 0 |

## Appendix A – reference index

| Kind | Reference |
|---|---|
| Design of record | [prototype/agency-admin.html](prototype/agency-admin.html); [board of 90 screens (measured)](prototype/board/index.html); running order at `#present`; published with this document at [product-team-sh.github.io/prd-workspaces-for-agencies](https://product-team-sh.github.io/prd-workspaces-for-agencies/). Prototype is light-only, matching the product |
| Design system | `~/SD (1).html`, aligned against the cloned repo in [17 §8 to §10](17-dashboard-map.md) |
| Verification | `prototype/verify.js` and 12 harness files: 930 assertions, 0 failures, run 15 Sep 2026 (measured) |
| Current behaviour | [01](01-current-state.md); codebase facts in [24 verified table](24-strategic-review.md); the API and web-client data inventory in [35](35-data-inventory.md); the settings inventory in [37](37-settings-inventory.md) |
| Direction and model | [07](07-product-direction.md), [20](20-feature-scope-matrix.md), [22](22-prototype-refinement.md) |
| Edge cases and lifecycle | [08](08-consideration-checklist.md), notably §5c, §16b, §17 |
| Flows and screens | [16](16-end-to-end-flows.md), [09](09-screens-and-flows.md), [14](14-agency-dashboard.md), [17](17-dashboard-map.md) |
| Migration | [23](23-migration-and-signup.md) |
| Evidence | [19](19-agency-interview.md) one agency; [03](03-competitor-benchmark.md) and [15](15-instantly-teardown.md) competitors; [02](02-user-needs-vs-what-we-have.md) user asks |
| Reviews | [24](24-strategic-review.md), [26](26-ux-review-agency.md), [27](27-ux-review-client.md); open defects not promoted here are patches, not decisions |
| Project state | [21](21-execution-checklist.md) |
| Shaping card | [Workspaces for Agencies](https://app.basecamp.com/4378325/buckets/22269754/card_tables/cards/10244088475). v0 thinking; nothing was built from it, so nothing is voided |

## Appendix B – Every element: where its data comes from, why it is there, and the objection it meets

**How to read this.** One row per element the PRD asks for. *Source today* is measured from the production API spec (103 paths) and the web client on 14 Sep 2026 ([35](35-data-inventory.md)); *new* means nothing in either exposes it. *Why* names the user need and its evidence. *Pushback* is the strongest objection a reviewer or engineer will raise, and *Answer* is the reply on record, with the cases where the honest answer is "assumed" or "open" marked as such. A row with no evidence column filled is a row we should be prepared to cut.

**Two facts frame every row.** First, the client today is a person with a permission level and five roll-up counters (`AgencyClient`: `firstName, lastName, email, companyName, permission, activeSequence, totalProspects, emailSent, activeEmailAccounts`); it is not a container, and no resource except sequences and email accounts can be assigned to it. Second, the client dimension reaches exactly three places in the web client's settings, all agency-gated: the sequence's Associate Client picker, a read-only column on two email-account tables, and a filter ([37](37-settings-inventory.md)). Everything below either scopes an existing resource by a client id it already carries, or introduces the client dimension where it has never existed. The second kind is the cost.

### B.1 Shell: switcher and context (§6.1)

| Element | Source today | New or changed | Why | Pushback | Answer |
|---|---|---|---|---|---|
| The two groups: the agency, clients | Clients from `GET /v1/clients` (or `GET /client/list`); the agency context is a new concept | **New**: the agency context, which holds administration and the agency's own records | An agency runs its own new-business outreach and its clients' from one login today; separating them is what makes each list unambiguous, and the client-workspace boundary does that without a second context (D2) | "Why is the agency's own outreach a grant in Add member but not a row in the switcher?" | Access needs a name for it, navigation does not. The wobble is accepted; the alternative is a context that exists only so the vocabulary matches |
| Search over clients | `GET /v1/clients` supports sort, not search; the web client's `/client/list` takes `search` | Search param exists on the web client's endpoint | At forty clients a popover without search is unusable ([30 §8 #22](30-cpo-review.md), rendered at `#scale=40`) | "Agencies have under ten clients" (interview, [19 §1](19-agency-interview.md)) | The interviewed agency does; the ceiling is sixty (assumed). Search costs nothing to keep |
| Header: client avatar, name, "Client workspace"; breadcrumb `Client / Module` | `companyName`, `firstName` exist; avatar initials derived | Presentation only | Both UX reviews' worst finding: inside a client nothing says which client you are in, and fixture clients share sequence names ([26 #1](26-ux-review-agency.md)) | None expected | |
| No switcher for a client user, and a forced popover renders nothing | Role `client-*` from `/user/meta`; the client user has `home.client` | Server must return no other client for a client-user session | Invariant: a client never sees another workspace's name (§3) | "The render hides it, that is enough" | It is not: the release blocker is on the response, not the render (§8 row 1). SH1 tests the popover after forcing it |
| Rail collapses to icons below 900px | Product's own `.app-sidebar` behaviour (57px, hover to 240px) | Matches deployed CSS | The prototype used to hide the rail below 900px, making the switcher unreachable ([28 §8.6](28-component-inventory.md)) | None | |

### B.2 Clients and the client record (§6.2)

| Element | Source today | New or changed | Why | Pushback | Answer |
|---|---|---|---|---|---|
| Client list with open, reply, positive-reply rate per client | Per-client counters today are volume only (`emailSent, totalProspects, activeSequence, activeEmailAccounts`). Rates exist in Reports (`opened, replied {value, percentage}`, sentiments) filterable by `clientIds`, so they can be computed per client | **Changed**: rate columns added to a list that has had volume only since 2024 | Asked by Shawn on 27 Mar 2024 and never shipped ([message](https://app.basecamp.com/4378325/buckets/22269754/messages/7231330921#__recording_7231459427)); US1 | Ravi's objection in the same thread: "let's not create data redundancy" across Client Management and Reports | The Dashboard carries the ranking; the list carries one status per client and the rates the interview said agencies prioritise by. Redundancy is one number on two screens; the alternative is an agency that cannot rank its clients anywhere. Fair to be challenged on at sign-off ([29 §3.2](29-basecamp-history.md)) |
| One status vocabulary: worst state across resources with the reason | Per-mailbox `status` (Inactive, Active, Suspended) and `healthScore` exist; per-client resource state is **new** (depends on caps) | New | A client's row has to say what needs doing, not only what it has ([17](17-dashboard-map.md)) | "Worst-of hides a good client with one bad mailbox" | The reason is in the cell, and the record's tabs show every resource. Worst-of is the rule that never under-reports |
| Add Client from step 1 with defaults; steps 2 and 3 skippable and visible as a checklist | `POST /v1/clients` takes `firstName, lastName, email, companyName, permission`; caps and members are new | New: caps, members | Agencies add a client mid-call; a three-step wizard that blocks on limits loses them ([16 §3](16-end-to-end-flows.md)) | "A client with no caps can drain the pool" | It gets the suggested cap by default (last 30 days plus 25%, assumed), never no cap. The checklist on the record says what is still default |
| Disable, Delete, Unlink with consequences stated first | `POST /client/:id/toggle-status` (active, in-active), `DELETE /client/:id` exist; Unlink is new; the 33-cell lifecycle table is ours ([08 §5c](08-consideration-checklist.md)) | Changed: Disable now pauses sending and releases the reservation; Delete keeps a 30-day restore (assumed) | Today "delete and recreate" is the workaround for changing a sequence's client, and it left a live sequence pointing at a deleted client ([01 §6](01-current-state.md)) | "Restore for 30 days is storage and complexity we do not have today" | Assumed number, marked so. The cost of no restore is the 2024 incident repeating with a workspace's worth of data instead of one client record |
| Every entry point to Add Client and Credits & Limits gated by role | Permissions exist: `AGENCY.CLIENT.CREATE`, `CLIENT_UPDATE`, `CLIENT_DELETE`; the front end gates by `hasPermission` | Existing mechanism, new surfaces | The prototype's first build missed two entry points ([16 §3 note](16-end-to-end-flows.md)) | None | Release blocker §8 row 5 |
| Link pending and Linked states | **New.** No connect concept exists in the API or the client | New | Hemanshu's brief: "Onboarding becomes Connect instead of Rebuild"; the interviewed agency has clients who already own accounts | "This is gated on OQ3 and may never ship" | Correct. Until OQ3 is answered, `A2` shows Create only (§6.9). The states are specified so the design does not have to be reopened if the answer is yes |

### B.3 Access (§6.3)

| Element | Source today | New or changed | Why | Pushback | Answer |
|---|---|---|---|---|---|
| Seven screens as switches | Today: `AgencyClientPermissions` = `full-access, limited-access, no-access`, one value per client user. Screen-level gating exists only as two hardcoded account ids in `user-details.tsx` (`hideSideBarTabs` keeps Reports for `190877`; `leadFinderViewOnly` keeps Lead Finder for `197372`; 19 files, 50 call sites) | **New** as data: a per-workspace set of screens | Two paying agencies asked for a restricted view and got a deploy each; a third cannot have it ([01](01-current-state.md), measured) | "Three levels were enough for everyone else" | They were not enough for the two accounts we hardcoded, and "limited access" today still lets a client email prospects in their own name. The permission codes exist server-side (321 of them); what is missing is a per-workspace surface (D5) |
| Four actions as checkboxes, each dependent on its screen | Reply exists (`POST /v1/unified-inbox/emails/reply`); pause exists (`POST /v1/sequences/status`); export exists in the prospect UI; reveal is the Lead Finder spend. None is grantable per client today | New as grants | Revealing a lead spends the agency's credits; the product could grant the screen but not the spend, so the only safe grant was view-only (D5b) | "Why not a full permission matrix?" | 321 permissions nobody will assemble by hand; no benchmarked competitor ships custom RBAC ([03](03-competitor-benchmark.md)); the codebase already declares 15 roles with four unused, which is what an unbounded model turns into. Presets over a bounded matrix (D5) |
| Five presets, Custom when edited | New | New | Presets cover the two cases we hardcoded (Reports only, Lead Finder only) and the three levels that exist (Read everything, Reply and run, Everything) | "Custom means support tickets about odd combinations" | Custom is named on the screen and in the invite; a preset is one click away. The alternative is telling the two hardcoded agencies their case has no name |
| The last screen cannot be switched off | New rule | New | A login that reaches nothing is worse than no login; Disable already exists for suspension (D5) | None | |
| Live preview beside the cards: rail, landing screen, can and cannot, invite sentence | Derived from the access set; nothing stored | Presentation | The Access screen showed eleven switches and no picture of the result; the invite once promised what the workspace did not grant (D5a) | None | The preview and the invite come from one derivation, so they cannot disagree (asserted) |
| Client lands on the first granted screen | Derived | Presentation | A reports-only client used to open on a Sequences tab it did not have | None | |
| One dismissible orientation line; restrictions at the control | Derived | Presentation | The permanent banner led with what the client could not do ([30 §5](30-cpo-review.md)); decided 12 Sep | None | |
| View as client, logged to the client's activity, which the client can read | **No audit log exists** (searched `audit, activity-log`; only prospect engagement, webhook delivery and login sessions) | New: an audit entity | Consent without a record is not consent; the client must be able to see who looked | "An audit log is a project of its own" | It is a release blocker (§8 row 6) with five events named. The minimum is an append-only record with actor, workspace, action, time. Nothing today records an administrator's action at all, which is itself a finding |
| Members merged into Access: agency staff get a graded per-workspace preset (D5c), client users point at the access set above | `User.role` from `owner, admin, member, team-manager`; teams exist; no per-workspace staff preset exists today | New: the per-workspace staff preset itself | An admin who should not see what capacity costs can still raise a limit (D4, unchanged by this); a staff member who should only see one client's reports should not reach its replies (D5c) | "One more thing to build" | The staff preset replaces the two hardcoded client accounts ([22 §7.1](22-prototype-refinement.md)) becoming a third, then a tenth |
| Invite: client sets its own password | Today the agency receives the client's credentials by email and forwards them (`PATCH /client/reset-password/:id`) | Changed: invite-and-accept | The agency holds the client's password and the client consents to nothing (D8) | "Existing client users get a forced reset" | Accepted and stated (D8). It happens once |

### B.4 Limits, allocation and usage (§6.4)

| Element | Source today | New or changed | Why | Pushback | Answer |
|---|---|---|---|---|---|
| Pool per resource at the account | `GET /v1/credits` (`totalCredits, creditConsumedToday, creditConsumedThisMonth`); `accountUsageQuotaRemaining` keyed by feature code (`EMAIL.SEND, PROSPECT.ADD, LEAD.REVEAL, EMAIL.VERIFICATION, PROSPECT.MAX_ACTIVE, AI_CREDITS, DIALER.*`); subscription `emailSendLimit, activeProspectLimit, buckets[]` | Existing | This is the pool the whole model draws on; verified 8 Sep as one quota with no client dimension | None | |
| Limit and Reserved per workspace per resource | **New.** No per-client cap, quota or credit anywhere in the API, billing or feature limits (the only per-mailbox cap is `daily-sending-limit`) | New, and the second-largest cost after the prospect dimension | One client can empty the pool for the rest ([Rajveersingh, 10 Aug 2026](https://app.basecamp.com/4378325/buckets/15549277/question_answers/10180509036#__recording_10186164656)); the interviewed agency wants to cap each client ([19 §1](19-agency-interview.md)); US6 | "Sub-wallets are simpler to reason about" | Sub-wallets strand capacity and forbid the oversubscription agency margin depends on ([07 §4.2](07-product-direction.md)); a cap on a shared pool is the only mechanic that keeps both. Whether the model itself is agreed is OQ18, Dhruv's call |
| Caps may exceed the pool, reservations may not; the "starved" state | New rule | New | Oversubscription is the ask on record and the promise has to be enforceable (D7) | "Several clients stopping at once is a support event" | Accepted explicitly in D7 and made loud by requirement (LM3); the guardrail in §10 halts expansion if it happens at more than 5 accounts |
| Drafted edits with Apply and Discard; refusal naming both numbers | Presentation over the new caps | Presentation | A keystroke used to move the pool; a slip reallocated a client before the person finished reading the row ([30 §8 #14](30-cpo-review.md)) | None | |
| Thresholds: consumables stop at 100%, throughput warns at 80% and stops at 100% never mid-step, storage warns at 85% | New; the numbers are **assumed** ([08 §4d](08-consideration-checklist.md)) | New | A cap that stops a prospect mid-sequence corrupts the sequence's state; LM2 | "80 and 85 are made up" | They are, and marked assumed. What is not assumed is the rule underneath: never mid-step, always name the agency |
| Client requests more, with amount and reason; owner approves or declines | New | New | Today a client's sending stops with no message naming the agency, so the client blames Saleshandy (§1); US6 | "Clients will spam requests" | One open request per resource per workspace; the queue carries it once; decline carries a reason back |
| Every client-facing message names the agency | Whitelabel `AgencyConfig.agencyName` exists at account level | Existing data, new rule | Invariant (§3); release blocker (§8 row 2) | None | |
| Consumption via a workspace API key charged to that workspace | API key is **per user**, no scope field (`x-api-key`; "each team member should generate their own"); no workspace or client id on any key | New: a key bound to a workspace | LM5; an API consumer that sends no workspace today must land somewhere ([08 §12](08-consideration-checklist.md)) | "Per-user keys already exist, this is a new key type" | It is. Existing keys pin to the account's own-outreach workspace so nothing breaks silently (CW5); a workspace key is the new type |

### B.5 Email accounts: the estate (§6.5)

| Element | Source today | New or changed | Why | Pushback | Answer |
|---|---|---|---|---|---|
| One row per mailbox across every workspace | `POST /v1/email-accounts` list with `clientIds[]` filter; `emails[].client` on each row | Existing data, new master screen | The first question an agency asks before moving its estate is what happens to the mailboxes it paid for when a client walks (D6) | None | |
| Who paid: purchased vs connected | Web client: `domainMailboxId` not null means purchased (`email-account.ts:119`); delete blocked for purchased. **API: no purchased flag on the email-account object, and the purchased list (`GET /v1/domain`) shares no key with the connected list** | Existing in the client, **absent from the API**; the join is new | The whole ownership rule rests on this one bit (D6): purchased returns to the agency, connected goes where its owner goes | "The two lists were never meant to join" | Then the join is the work. Without it the estate cannot say who paid, and the rule cannot be enforced |
| Which workspace holds it, whether it can move | `client` on the mailbox row; the move is the existing assign (`POST /v1/clients/assign/emailAccount`, or bulk-update `clientId`) | Existing mechanism, new rule (one writer, the estate) | The prototype had three writers with two contradictory answers to what a move costs ([26 #10](26-ux-review-agency.md)) | None | |
| Health, bounce and complaint history shown before a move | `healthScore`, setup checks (`spf, dkim, dmarc, ptr`, blacklists), Inbox Radar score, warm-up state (`EmailWarmupStatus` 0 to 3) exist. **Bounce and complaint per mailbox do not**; `Bounce Rate` exists only in per-account analytics | Partly new: per-mailbox bounce and complaint | A burnt mailbox handed to the next client is the estate's worst outcome ([08 §16b.2](08-consideration-checklist.md) Q3) | "We do not track complaints per mailbox" | Then the modal shows what exists (health, setup, warm-up) and says bounce history is not available. Better than implying it is |
| Warm-up as a state on the mailbox | `warmupStatus`, `warmupDetails` exist | Existing | Decided 12 Sep: no warm-up screen of its own | None | |
| Domains and Inframail IPs as estate tabs | `GET /v1/domain` lists purchased domains and mailboxes; IPs are account-only | Existing data, new placement | Decided 12 Sep (IA-3): a domain is the agency's, like the mailbox on it; a client never sees the list | None | |
| Whether warm-up and reputation survive a move | **Unknown** (OQ4, Rajat) | Open | Decides whether the action is sold as a move or as release-and-reconnect (D6) | "Do not promise a move you cannot deliver" | Agreed: the label follows the answer, the screen is built either way |
| Disconnected: agency and client both notified, Reconnect inline | Webhook events `email-account-disconnected`, `email-account-paused` exist; notification type per client exists (`*-client` types) | Existing events, new inline action | The top queue item used to land on a 54-row list with no Reconnect ([30 §5.2](30-cpo-review.md)) | None | |

### B.6 Roll-ups and the Dashboard (§6.6)

| Element | Source today | New or changed | Why | Pushback | Answer |
|---|---|---|---|---|---|
| Replies across a person's workspaces | Unified Inbox already filters by `clientIds[]` and `emailAccountIds[]`; **a thread item carries no `clientId` and no `emailAccountId`**, only `fromEmail` | Changed: the filter becomes membership, and each thread has to carry its workspace and its bound mailbox | US3; 3 of 3 verifiable competitors ship the inbox this way (D3) | "The inbox client filter already does this" | The filter is by client id chosen by the viewer; membership is set by the account and enforced on the server (RU1). And a reply from the roll-up has to land in the right workspace from the right mailbox (RU2), which needs the binding on the thread that does not exist today |
| Reply in place, from the roll-up, then Next | `POST /v1/unified-inbox/emails/reply` exists | New behaviour: the thread opens beside the list; decided 14 Sep | Bouncing into the client workspace and back on every reply was the operator's worst friction; Sam does the work and had the worst experience ([30 §3.2](30-cpo-review.md)) | "Replying outside the workspace weakens the isolation story" | The write is bound to the row's workspace and mailbox, not to a session-level current workspace (§8 row 3); the panel names both before send. Open in the client stays one click away |
| Tasks across a person's workspaces, complete from the row | `GET /v1/tasks` has `sequenceId` and `taskAssignee`; **no client field; the client filter is explicitly excluded in the task UI** | **New**: a workspace id on the task | US3; D3 says work rolls up | "Tasks reach their client through the sequence today" | Only for tasks on a sequence; and RU3 needs the record to carry the workspace it was completed in, not a join at read time |
| Work queue ordered by consequence | Queue is new; its inputs exist (disconnected and paused webhook events, unread count, requests) | New | An operator does not think in categories; a dead mailbox outranks a reply ([16 §11.1](16-end-to-end-flows.md)) | "Another inbox" | It is the operator's one list; the Dashboard is the owner's. The two entry points match the interview ("mix, by role") |
| Dashboard: clients ranked by attention, cost per positive reply, plan pacing, decisions | Reports give per-client `emailSent, replied, positive sentiment, Meeting Booked` via `clientIds`; cost per positive is derived from the pool price and consumption (new) | New screen over mostly existing metrics; cost to serve is new | US1; the interview: managers and owners land on the Dashboard | "No blended rate across clients" is a constraint the screen must obey | It does: counts, money, pacing and per-client comparison only; there is no single reply rate on the screen ([14](14-agency-dashboard.md)) |
| Plan runs out in the queue and the strip under three days of runway | `accountUsageQuotaRemaining`, `accountUsageQuotaResetDate` exist; burn rate is derived | Derived | The event that stops every client was the least visible item on the page ([30 §5.2](30-cpo-review.md)) | "Three days is arbitrary" | Assumed and marked; the fixture happens to be 1.4 days out, which is what the demo shows by Hitesh's choice |
| Aggregates precomputed, no per-workspace fan-out on load | Analytics endpoints take `sequenceIds` or `userIds`, never `clientIds`, and are called per request | New: precomputation at 50 or more workspaces (assumed threshold) | Forty clients render today only because the prototype computes in memory; the product will not | "Premature" | Marked as a blocker only at 50 or more workspaces (§8) |
| Every badge equals the list beneath it | Unread count today is account-wide (`GET .../unread-email-threads-count` has no filter) | Changed: badge scoped by membership | A client with two replies saw a 9 and learned how much other work the agency has ([flow I4](prototype/flow-isolation.js)) | None | |

### B.7 Inside a client workspace (§6.7)

| Element | Source today | New or changed | Why | Pushback | Answer |
|---|---|---|---|---|---|
| The prospect belongs to one workspace | **The prospect is account-level.** `Prospect` has no client id; `clientAssociated` is a server-derived array from the prospect's sequences, and a prospect can show several clients; the API cannot filter prospects by client; import error 11000 is "already present with different owner" | **New: the workspace dimension on the prospect. This is the cost of the project (OQ10)** | Without it a client cannot be shown its own prospect's trail without exposing every other client's activity on that prospect, which is why the sidebar is hidden and the agency screenshares today ([01 §6a](01-current-state.md), [02 §1a](02-user-needs-vs-what-we-have.md)); US4 is impossible today by construction | "Add a client filter to the prospect list instead" | A filter over one account-level table is the model we have, and it is the model that produced the hardcoded account ids. Isolation and client visibility are mutually exclusive by construction under it. The engineer who built the association called permanence a data-integrity rule ([01 §6](01-current-state.md)). This row is the whole argument for containers (D1) |
| The same email in two workspaces is two prospects; the agency sees the collision count | New | New | Consequence of the dimension; the alternative is a prospect that belongs to two clients, which is today's problem restated | "Duplicates" | They are two records by design: the count crosses, the records do not ([08 §7](08-consideration-checklist.md)) |
| `C2`: a client reads its own prospect's full email trail | Engagement events exist per prospect (`MasterLog`, 59 values; `GET /sequences/:id/prospects/activity`, `/activity/emails/:id`) | Existing data, newly showable once scoped | The payoff of the project; declined by design today, not backlogged ([02 §1 row 3](02-user-needs-vs-what-we-have.md)) | "Show it filtered to the client's sequences" | The trail is per prospect, not per sequence; filtering the display leaves the response carrying the other clients' events. CW1 is verified at the API, signed off by Rajat by name |
| The existing modules, scoped, with the Associate Client picker removed | The picker is `SequenceAssociatedClient`, agency-gated, permanent once active | Changed: removed | A sequence's client is the workspace it lives in; a picker inside a workspace is the blur the model exists to remove ([24 §4](24-strategic-review.md)) | "Agencies use the picker today" | They use it because it is the only way to tag a sequence. In a workspace the tag is the room you are in |
| Settings: 18 items on `T1` with the scope codes in [38 §1](38-settings-decision.md) | The full sweep ([37](37-settings-inventory.md), about 760 settings): Prospect Fields, Outcomes, Schedules, Out of Office, Admin Settings (19 toggles) are account-level; Webhooks and API keys are account-listed but user-created, with no scope; **CRM integrations are per user** (Cobalt `config_id = userId`); **Do Not Contact and Do Not Call already take a per-client scope**; Whitelabel is one resource per account; there is no Notifications preferences page and no Email Signature page | Three items added (Schedules, Out of Office, Safety Settings), two removed (Notifications, Email Signature), Security group of Admin Settings kept account-only, Integrations rule corrected to per person inside a workspace | Custom fields shared across clients was in Hemanshu's brief; a webhook or CRM connection that fires for every client's events cannot be given to one client | "Per-workspace integrations means forty CRM connections" | Today it is one per user, invisible to the account, and each leaks across clients. Most clients have none; the ones that do get a connection that only sees their prospects. The sweep is complete, so the scope codes in `T1` are final |
| A client's Settings holds profile, password and notifications only | User profile exists; notification types exist with five client-specific ones | Changed: a client Settings that carries no agency item | The prototype once leaked agency items into it, then removed it entirely so a client could not change their own password (IA-4) | None | |
| A prospect imported here lands here | Import endpoints exist; landing is a consequence of the dimension | New | Consequence of D1 | None | |

### B.8 Launch day (§6.8)

| Element | Source today | New or changed | Why | Pushback | Answer |
|---|---|---|---|---|---|
| `M1`: each V3 client becomes a workspace; sequences and mailboxes follow their association; prospects follow their sequence | Sequence and mailbox associations exist (`client` on both); prospect association is derived | New: the conversion | US8; the precedent moved sequences empty and made clients reconnect integrations ([01 §7](01-current-state.md)) | "Migration is not V1" (Hemanshu's recorded position) | Agreed as OQ1. The mechanism is decided (D9) so it costs nothing to keep; whether it ships is the five counts in [23 §7.6](23-migration-and-signup.md), a database query |
| `M2`: prospects on no client or on two go to review, default "Keep in agency" | Derivable from today's data (`clientAssociated` array length 0 or more than 1) | New screen | The one case launch day cannot resolve without changing a running campaign | "How many such prospects are there?" | Unknown. Count 1 in the Rajat request decides it, and the consequence of each answer is written next to it |
| Every agency user seeded as a member of every workspace, and told so | Users and teams exist; membership is new | New | Nothing works on day one otherwise; narrowing is what the interview asked for and `M1` offers it | "Then the filter is empty and isolation is theatre until someone narrows" | Stated in D4 as the consequence to accept. Membership narrowed within 14 days is a leading indicator (§10) |
| Caps default to last 30 days plus 25% | Derivable from `emailSent` and consumption history | New; the number is **assumed** and needs an agency reaction ([19 §4](19-agency-interview.md)) | A client must keep sending on launch day | "Pure invention" | Yes, and named as such in the interview notes. It is the number that most needs the next interview |
| Rollback for 30 days | New | New, assumed window | The precedent could not be undone | "Rollback of a data migration is a second migration" | Pointers, not data (D9): rollback restores associations and logins. The guardrail halts automatic conversion above 10% rollback (assumed) |
| Sender accounts with no clients see nothing new | `CLIENTS.length === 0` is knowable | Rule | A solo sender must never meet the word "workspace" (LD4) | None | |

### B.9 Connect an existing account (§6.9)

| Element | Source today | New or changed | Why | Pushback | Answer |
|---|---|---|---|---|---|
| Workspace ID; the product never reveals whether it exists | **New.** No cross-account concept exists | New | Hemanshu's brief; the interviewed agency's clients own accounts | "Can two accounts' prospect tables coexist under one agency view?" (OQ3, Rajat) | This is the question that can kill the connect path, and the PRD ships Create only until it is answered. Nothing else in the design changes with the answer |
| Two-party consent: the client's owner sees who asks, what they get, what stays theirs | New | New | The pattern Instantly ships ([15](15-instantly-teardown.md)); a link the client cannot see is a takeover | None | |
| The agency owner joins as Admin, not owner | Roles exist | New membership across accounts | The client owns the workspace | "Whose seats do agency staff consume?" (OQ16) | Recommendation on record: the agency's, never the client's. Hemanshu's call |
| View as client only if granted, at approval or later | New | New; decided 12 Sep (D11) | Nothing in the link request asked for the right to impersonate the client | None expected | |
| Revoke from the client's own Settings; the agency is told, not asked | New | New | The client funds and owns the workspace | None | |
| Whitelabel mid-session | One `WhitelabelResource` per account; `AgencyConfig` per account | Open (OQ13) | A linked workspace keeps its own brand; the operator switching between a created and a linked client watches the app rebrand | Undecided | Recommendation on record: the agency's brand in the agency's chrome, the client's brand only in the client's own session |

### B.10 Cross-cutting and measurement (§8, §10)

| Element | Source today | New or changed | Why | Pushback | Answer |
|---|---|---|---|---|---|
| Server-side enforcement of workspace boundaries | Permission codes exist; per-workspace enforcement is new | New | The render is not the control; release blocker | "Expensive to test" | RU1 and CW1 are verified on the API response, and CW1 is signed off by name. This is the one place the PRD names an engineer |
| Audit log with five events | **None exists** (see B.3) | New | Consent (view as), money (limits, approvals), data (exports) all need a who and a when | "Scope creep" | Release blocker. Five events, append-only. Every one answers a question support will be asked in the first month |
| Grace period: readable, not sending, the pause names the agency | Web client knows only `PaymentAction` (initial, recurring) as a banner; **no grace-period state**; the 7-day grace period exists server-side (2025 incident) | New client-visible state | Aug 2025: a failed agency payment locked its clients out ([card](https://app.basecamp.com/4378325/buckets/22269754/card_tables/cards/8972332385)); a workspace model multiplies the surface (D10) | "Why should a client keep reading if the agency has not paid?" | Because the client did not fail to pay, and locking them out was the incident. Sending stops, which is the thing that costs us |
| Instrumentation: eleven events with an agency dimension | PostHog is installed; **50 custom events exist and none carries a client or agency id**; `isAgency` exists in app state and reaches no analytics destination ([23 §7.2](23-migration-and-signup.md)) | New events | Every gate in §11 reads a dimension that does not exist today; a staged rollout whose gates cannot be read is not staged | "Ship first, instrument later" | It is a build requirement, decided 12 Sep: Hitesh owns the definitions, Rajat the build, in the same to-do |
| Privacy: no event carries a prospect's email, name or body | Rule | Rule | Client-side events reach third-party tools (Segment-style `window.analytics`, PostHog, GTM, Intercom are all present in the client) | None | |
| Whitelabel on the invite and client emails when on | `WhitelabelResource`, `AgencyConfig.agencyName` exist; plan-gated Scale and above | Existing data, new surfaces | Under whitelabel our brand on the invite breaks the agency's story | "Whitelabel is Enterprise-only while Client Management is Scale" (OQ7) | Dhruv's call; recommendation is to bundle it into the agency tier, as HeyReach does |
| Lists page, cap and search at forty workspaces | Prototype behaviour | Requirement | Rendered at `#scale=40`: every table listed every row, the switcher showed three clients ([30 §8.0.2](30-cpo-review.md)) | "Under ten clients" | The interviewed agency, yes. The ceiling is sixty (assumed) and the cost of paging is small |

### B.11 What this appendix changes upstream

Three findings from the audits should move into the body before sign-off, and are flagged rather than silently applied:

1. **Integrations are per user today, not per account.** The scope codes in `T1` and [08 §1](08-consideration-checklist.md) assumed an account-level starting point. The per-workspace rule still stands; the migration of existing CRM connections needs a row in §6.8 once the settings sweep completes.
2. **The purchased and connected mailbox lists share no key in the API.** D6 depends on that join. It belongs in §9's dependency table for Rajat.
3. **A thread carries no workspace or mailbox id.** RU2's binding is new server work, not a filter change; it belongs in §9 alongside the prospect dimension.

