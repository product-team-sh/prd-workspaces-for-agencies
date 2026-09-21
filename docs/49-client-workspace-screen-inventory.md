# 49 · Client workspace: what changes, screen by screen

Written 21 Sep 2026 from Hitesh's direction the same day: *"For client workspace, it will contain everything as we have today in Saleshandy product ... plus Usage. We should work on design where screens are changing or any update; here we have built on top of the existing screen, so everything present today plus updates."*

**Decision.** A client workspace is a full Saleshandy account. Every screen the live product has today is present inside it, unchanged unless a row below says otherwise, and one screen is new: **Usage**. What the client user actually sees is still gated by the access the agency granted, but every module is now grantable. This widens decision D5 in the PRD from seven client screens to all of them; the presets keep their names and "Everything" now means everything. The design work is the third and fourth columns only; the second column is the product as it ships today and is not redrawn.

Order follows the live rail. "Prototype" says whether the vC prototype shows the change today ([`/vC/prototype/`](https://product-team-sh.github.io/prd-workspaces-for-agencies/vC/prototype/)).

| # | Module | Today, in the live product | Inside a client workspace: what changes | New | Prototype |
|---|---|---|---|---|---|
| 1 | Sequences | List, builder, steps, settings, per-sequence client tag | The client tag disappears: the workspace is the client. Everything listed is this client's. Pause and Resume, when granted to a client user, confirm with the number of people affected and leave a receipt; the agency is told | Setup guide on first arrival (four steps) until the first send | Built |
| 2 | Tasks | Task list with assignee, type, due | Scoped to the workspace. The agency's roll-up across clients is a master-level screen, not this one | Nothing | Parked (existing screen, scoped) |
| 3 | Unified Inbox | Thread list and pane, sequence and sentiment chips | Scoped to the workspace; a reply sent from here is sent as this client and says so under the message. The client filter of today is unnecessary inside a workspace | Nothing on the client side; the cross-client inbox is master-level | Built |
| 4 | Lead Finder | Search, reveal, saved searches, credits | Credits draw on the agency's pool under this workspace's cap. At the cap, the reveal is paused and the message names the agency, never Saleshandy; a Request more link opens the Usage form | Cap message and Request more | Message built; module parked |
| 5 | CRM (Prospects) | Prospect list, import, fields, activity | Prospects belong to the workspace, so a client can open a prospect's full email trail without seeing another client's activity. Duplicate detection across workspaces is a count the agency sees, never records | Nothing on screen; the model change under it is the whole project | Parked |
| 6 | Dialer | Calls, recordings, phone numbers | Scoped to the workspace; a call belongs to the workspace it was made from. The product has no workspace field on calls today | Attribution field | Parked |
| 7 | Email Verifier | Verification lists, credits | Credits under the workspace cap, same message pattern as Lead Finder | Cap message | Parked |
| 8 | Email Accounts | Mailbox list, health, settings, warm-up toggle | A mailbox belongs to one workspace. Mailboxes bought by the agency show "Assigned by Meridian Growth" and cannot be moved by the client; the client's own connected mailboxes are theirs. Reconnect leaves a receipt and clears the agency's queue item | Ownership label; Reconnect receipt | Built on the record tab; module parked |
| 9 | Templates | Library, folders, sharing | The agency's library is published into the workspace; a client may copy and edit locally, and a locked template shows as locked | Published and locked states | Built |
| 10 | Inbox Radar | Placement tests and results | Tests belong to the workspace that ran them; the seed estate is the agency's | Nothing | Parked |
| 11 | Analytics (Reports) | Account-level reports | Scoped to the workspace; for a Reports-only client this is the whole product, so the screen carries one line: "Meridian Growth shares results here. Ask them if you need more." | Restricted-client line | Built |
| 12 | **Usage** | Does not exist | The one new screen. Every allowance the agency set: used, limit, usage bar, state. One summary line ("You have used 39% of this month with 12 days left, on pace"). At a limit the banner names the agency and what still works. Request more is an inline form showing the sentence the agency will read, with a receipt and Withdraw; the request lands in the agency's Work queue | Whole screen | Built |
| 13 | Email Warm-up | Warm-up per mailbox | Follows its mailbox's workspace. No screen change | Nothing | Parked |
| 14 | Refer a Friend | Referral programme | Unchanged. Present so the rail reads as the product | Nothing | Parked |
| 15 | Settings | Profile, users and teams, company settings, integrations, API, billing | Decided per item in [`38-settings-decision.md`](38-settings-decision.md): personal items are the user's; workspace items are this workspace's copy, some locked by the agency; account items (Users and teams, Billing, Whitelabel) belong to the agency and are absent, with one line saying so. A **Workspace** item is added: the workspace ID, link requests from an agency with approve, decline and revoke, and the "see this workspace as you" switch | Workspace item; locked states | Built |

## Shell changes that are not a module

| Element | Today | In a client workspace | Prototype |
|---|---|---|---|
| Rail | Full product rail | Same items in the same order, each shown only if granted; Usage added; Settings always present. A client with one granted screen sees a rail of one | Built |
| Top bar | Account name | Workspace name and "Your workspace"; the crumb names the screen | Built |
| First arrival | Onboarding checklist | One banner, once, written from the access set in the second person ("You can see your sequences, replies ... You can also reply to prospects and pause or edit sequences.") | Built |
| Limit reached | Saleshandy upgrade prompt | The agency is named, never Saleshandy; what still works is stated; Request more goes to the agency | Built |
| Your update | Does not exist | **Phase 2 (21 Sep 2026).** A summary from the agency, with a reply address; the rail item carries an unread dot until opened. Removed from the phase-1 prototype; the master keeps it | Master only |
| Invite | Credentials emailed by the agency | Invite and accept; the client sets its own password; the invite sentence is generated from the access set | Built (J1) |

## What this changes in the PRD

- **D5** widens: the client access set covers every module, not seven screens. Presets keep their names; "Everything" spans all modules. The audience column in the module table (client versus staff) goes.
- **Feature scope matrix rows 2, 6, 7, 9, 13** (Tasks, Dialer, Email Verifier, Inbox Radar, Warm-up) change from "agency only" or "follows its mailbox" to "present in the client workspace, grantable".
- Nothing else in the PRD moves.

## Verified versus assumed

**Verified:** the "Today" column against the live product walk of 17 Sep ([`44-ui-audit.md`](44-ui-audit.md) §1.4, [`37-settings-inventory.md`](37-settings-inventory.md)); the "Prototype" column against the build published today. **Assumed:** that Refer a Friend and Email Warm-up need no client-side change beyond scoping; that the Dialer's missing workspace field is a data change, not a screen change. Neither was rendered for a client in the prototype before today; both are parked screens there now.
