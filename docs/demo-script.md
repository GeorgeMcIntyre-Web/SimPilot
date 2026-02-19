# SimPilot – Stakeholder Demo Script

**For:** Edwin (Developer running the demo)
**Audience:** Non-technical stakeholders — managers, project leads, decision-makers
**Duration:** 15–20 minutes
**Goal:** Show that SimPilot replaces hours of manual Excel work with seconds of information

---

## Before You Start

1. Run the app locally: `npm install && npm run dev`
2. Open it in a browser (usually `http://localhost:5173`)
3. Go to **Data Loader** (left sidebar)
4. Select **"BMW Body Shop – ROI Demo"** from the dropdown
5. Click **Load Demo** — wait for the green toast notification
6. You are ready

---

## The Setup Line (say this first)

> "Right now, when Charles walks in on a Monday morning, he opens four separate Excel spreadsheets
> and spends about three hours piecing together which simulation stations are at risk.
> Let me show you what that same Monday morning looks like with SimPilot."

---

## Scene 1 — The Manager's Monday Morning

**Navigate to: Dashboard**

### What to point at

- The coloured area cards at the top — **FRONT UNIT, REAR UNIT, UNDERBODY**
- The risk counts (red = Critical, amber = At-Risk)

### What to say

> "This is the whole BMW project on one screen. No spreadsheet open.
> You can immediately see that REAR UNIT and UNDERBODY have problems.
> The red numbers are stations that are blocked or overdue.
> Charles used to build this picture manually — it took him most of Monday morning.
> Now it's here the moment he logs in."

### Point at the stations table below the cards

> "Each row is a simulation station. The colour tells you its status instantly.
> Green means done. Amber means at risk. Red means blocked — something is stopping the engineer from progressing."

### Point at the engineer column

> "Look at Sarah Jones — she has two red stations. That used to mean Charles would
> have to call her, or dig through the spreadsheet row by row to understand why.
> We'll come back to that."

---

## Scene 2 — The Engineer's Day (Sarah's Story)

**Click on: "Front Floor OP040" (Blocked, Sarah Jones, 38%)**

This opens the Cell Detail page.

### What to say

> "This is the station that's blocking Sarah. She's stuck at 38% complete.
> Before SimPilot, Sarah's only way to communicate this was via email or a Teams message —
> and Charles would have to manually update the spreadsheet to reflect it."

### Point at the Status badge (Blocked)

> "The status is Blocked. That means Sarah has reported that something outside her control
> is stopping her from progressing."

### Point at the checklist section

> "Here are her simulation checklist items — the steps she needs to complete
> before this station is ready. You can see which ones are done and which are waiting."

### Point at the simulation percentage (38%)

> "38% complete and 10 days to the deadline. In the old process, nobody would know
> this was at risk until the weekly status meeting — by which point it might be too late
> to fix it."

### Say the punchline

> "With SimPilot, Charles can see this the moment it happens.
> He doesn't need Sarah to email him. He doesn't need to open a spreadsheet.
> He can act on it now, not next Friday."

---

## Scene 3 — The £30,000 Question (Project Manager's Story)

**Navigate to: Assets** (left sidebar)

### What to say

> "Now let me show you something that could save the project real money.
> This is the equipment register — every robot and weld gun on the job,
> where it is, and how we're planning to source it."

### Point at the Sourcing column — filter or scroll to find UNKNOWN entries

> "See the ones marked UNKNOWN? That means nobody has made a decision yet
> on whether to buy new equipment or reuse something from a previous project.
> Each of those decisions is worth between £15,000 and £80,000."

### Count the UNKNOWNs (there are 5 in the demo: G04, G07, G08, G10, G11)

> "We have five open sourcing decisions on this project.
> In Excel, you'd have to cross-reference three separate files to find these.
> Here they're all visible in one column, filterable in seconds."

### Point at G04 (Front Floor OP040)

> "This one is particularly urgent — G04 is the gun attached to Sarah's blocked station.
> The reason she's blocked is that nobody has decided whether to buy it new
> or pull one from the reuse store. That's a decision worth at least £20,000.
> SimPilot makes it impossible to miss."

---

## Scene 4 — The Tooling Bottleneck View

**Navigate to: Tooling Bottlenecks** (left sidebar)

### What to say

> "This is a view that simply doesn't exist in Excel.
> It shows you where the flow is breaking down across the whole job —
> which stations are being held up by a design gap, a sourcing gap,
> or a delivery gap."

### Point at the blocked stations

> "You can see that Rear Rail OP020 and Underbody OP010 are both past their due date
> and still blocked. In the old world, this would surface in a programme review meeting —
> weeks after the damage was done.
> Here it's visible today, with the engineer's name and the specific gun that's causing the delay."

---

## Scene 5 — The Engineer Workload (Optional, if time allows)

**Navigate to: Engineers** (left sidebar)

### What to say

> "One more thing. Charles needs to know if any of his engineers is overloaded.
> In Excel, you'd count rows by name — manually.
> Here you can see at a glance that Sarah Jones has 2 out of 3 stations blocked,
> and Mike Brown has 2 out of 3 at risk.
> That's an immediate signal to Charles that he may need to redistribute work —
> or escalate the tooling decisions that are blocking them."

---

## The Close

> "What you've just seen took about five minutes.
> The equivalent in Excel takes three hours — every single week.
> And that's before you count the errors that creep in when four people
> are editing the same spreadsheet from different locations.
>
> The data in this demo came from Excel files — the same ones the team uses today.
> SimPilot reads them and turns them into this dashboard automatically.
> No re-keying. No version conflicts. No Monday morning data archaeology.
>
> And when we're ready, we can replace the Excel upload entirely —
> and pull the data live from whatever system the project runs on."

---

## Likely Questions & Answers

| Question | Answer |
|---|---|
| "What happens to our existing Excel files?" | "Nothing changes. SimPilot reads the files you already have. You can keep using Excel to update data and just upload the new version whenever you want to refresh the dashboard." |
| "Does this store our data somewhere?" | "Right now the data stays in your browser — nothing leaves your machine. We can add a server backend when the team is ready to make it permanent." |
| "Can multiple people use it at once?" | "Today it's a single-user tool — each person loads the file on their own machine. The roadmap includes a shared live view." |
| "Who maintains it?" | "Edwin and the development team. Because it reads your existing Excel files, there's no data migration and no training required to keep using the spreadsheets alongside it." |
| "How long did this take to build?" | "The core is already built. What you're seeing today is the working product." |
| "Can it connect to our other systems?" | "Yes — the architecture already has an integration point called SimBridge. When you're ready, it can pull live data from Teamcenter, SAP, or any system with an API." |

---

## Demo Checklist (tick before you start)

- [ ] App running at localhost:5173
- [ ] BMW ROI Demo loaded (green toast showed)
- [ ] Dashboard shows area cards (FRONT UNIT, REAR UNIT, UNDERBODY)
- [ ] At least 2 red/amber stations visible in the table
- [ ] Assets page shows UNKNOWN sourcing entries
- [ ] You've done one practice run-through

---

## Screens to Visit (in order)

1. **Dashboard** — the Monday morning view
2. **Cell Detail: Front Floor OP040** — the engineer's blocked station
3. **Assets** — the sourcing gap / £30k question
4. **Tooling Bottlenecks** — the programme risk view
5. **Engineers** *(optional)* — the workload imbalance

---

*Questions about the demo? Contact George (project lead).*
