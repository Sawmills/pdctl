# PagerDuty Response with pdctl

pdctl and its Raycast extension help responders work with PagerDuty Incidents,
see who is on call, and inspect Services and Escalation Policies.

## Language

### Incident Response

**Incident**:
A PagerDuty record for a problem raised on a Service. It carries a status,
an Urgency, and any Assignments.

**Incident Number**:
The number assigned to an Incident and displayed alongside its ID.

**Triggered**:
The status of an Incident awaiting acknowledgment.

**Acknowledged**:
The status of an Incident a responder has acknowledged. The Incident remains
active while the response continues.

**Resolved**:
The status of an Incident marked complete.

**Active Incident**:
An Incident in Triggered or Acknowledged status. Raycast uses this grouping in
the default incident list and the menu bar count.

**Urgency**:
The High or Low setting on an Incident, available as a filter in the incident
list.
_Avoid_: Priority, severity

**Priority**:
An optional ranking displayed alongside Urgency in the Incident details.

**Assignment**:
A record of who is assigned to respond to an Incident.

**Reassignment**:
Changing the target responsible for an Incident. The CLI submits user
assignments, and Raycast offers a user or an Escalation Policy as the target.

**Incident Note**:
A message added to an Incident to record context about the response.

### Services and On-Call Coverage

**Service**:
The part of a system that PagerDuty uses to group Incidents for response. A
Service has its own status and may have an Escalation Policy.

**Service Status Summary**:
A tally of returned Services with counts for Active, Disabled, and Impacted
and a total for all returned Services.

**Schedule**:
A plan for who provides on-call coverage over time. A Schedule can have
multiple Schedule Layers.

**Schedule Layer**:
A rotation within a Schedule with its own participants and dates.

**Current Rotation**:
A Schedule's effective coverage, shown as responders with start and end
times. The CLI requests coverage for the upcoming seven days.

**On-Call**:
A current coverage assignment for a responder. It includes an Escalation
Level and can include a Schedule, an Escalation Policy, and coverage times.

**Escalation Policy**:
An ordered set of rules that directs an Incident to responders.

**Escalation Rule**:
A step in an Escalation Policy with notification targets and a delay before
the next escalation.

**Escalation Level**:
A responder's position in the escalation order. Level 1 is the first step.
