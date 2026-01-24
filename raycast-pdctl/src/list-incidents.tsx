import {
  List,
  Detail,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  LocalStorage,
  confirmAlert,
  Form,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import { getPagerDutyClient, getIncidentStatusColor, formatRelativeTime } from "./api/pagerduty";
import { Incident, Service } from "./api/types";
import ReassignIncident from "./reassign-incident";

const RECENT_INCIDENTS_KEY = "recent-incidents";
const MAX_RECENTS = 10;

interface Preferences {
  subdomain: string;
}

type StatusFilter = "all" | "triggered" | "acknowledged" | "resolved";
type UrgencyFilter = "all" | "high" | "low";
type TimeRangeFilter = "all" | "1h" | "24h" | "7d" | "30d";

function getTimeRange(filter: TimeRangeFilter): { since?: string; until?: string } {
  if (filter === "all") return {};
  const now = new Date();
  const until = now.toISOString();
  let since: Date;
  switch (filter) {
    case "1h":
      since = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case "24h":
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }
  return { since: since.toISOString(), until };
}

export default function ListIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [timeRangeFilter, setTimeRangeFilter] = useState<TimeRangeFilter>("all");
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    loadRecents();
    loadServices();
  }, []);

  useEffect(() => {
    loadIncidents();
  }, [statusFilter, urgencyFilter, serviceFilter, timeRangeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadIncidents();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  async function loadRecents() {
    const stored = await LocalStorage.getItem<string>(RECENT_INCIDENTS_KEY);
    if (stored) {
      setRecentIds(JSON.parse(stored));
    }
  }

  async function saveRecentIncident(id: string) {
    const updated = [id, ...recentIds.filter((i) => i !== id)].slice(0, MAX_RECENTS);
    setRecentIds(updated);
    await LocalStorage.setItem(RECENT_INCIDENTS_KEY, JSON.stringify(updated));
  }

  async function loadServices() {
    try {
      const client = getPagerDutyClient();
      const allServices = await client.listAllServices();
      setServices(allServices);
    } catch (error) {
      console.error("Failed to load services:", error);
    }
  }

  async function loadIncidents() {
    setIsLoading(true);
    try {
      const client = getPagerDutyClient();
      const statuses = statusFilter === "all" ? ["triggered", "acknowledged"] : [statusFilter];
      const urgencies = urgencyFilter === "all" ? undefined : [urgencyFilter];
      const serviceIds = serviceFilter === "all" ? undefined : [serviceFilter];
      const { since, until } = getTimeRange(timeRangeFilter);

      const response = await client.listIncidents(statuses, serviceIds, urgencies, 50, 0, since, until);
      setIncidents(response.incidents);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load incidents",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function acknowledgeIncident(incident: Incident) {
    try {
      showToast({ style: Toast.Style.Animated, title: "Acknowledging..." });
      const client = getPagerDutyClient();
      await client.acknowledgeIncident(incident.id);
      await saveRecentIncident(incident.id);
      showToast({ style: Toast.Style.Success, title: "Incident acknowledged" });
      loadIncidents();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to acknowledge",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function resolveIncident(incident: Incident) {
    const confirmed = await confirmAlert({
      title: "Resolve Incident?",
      message: `Are you sure you want to resolve "${incident.title}"?`,
      primaryAction: { title: "Resolve" },
    });

    if (!confirmed) return;

    try {
      showToast({ style: Toast.Style.Animated, title: "Resolving..." });
      const client = getPagerDutyClient();
      await client.resolveIncident(incident.id);
      await saveRecentIncident(incident.id);
      showToast({ style: Toast.Style.Success, title: "Incident resolved" });
      loadIncidents();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to resolve",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const filteredIncidents = incidents.filter((incident) => {
    if (!searchText) return true;
    const query = searchText.toLowerCase();
    return (
      incident.title.toLowerCase().includes(query) ||
      incident.id.toLowerCase().includes(query) ||
      incident.service.summary?.toLowerCase().includes(query)
    );
  });

  const sortedIncidents = [...filteredIncidents].sort((a, b) => {
    const aRecent = recentIds.indexOf(a.id);
    const bRecent = recentIds.indexOf(b.id);
    if (aRecent !== -1 && bRecent === -1) return -1;
    if (aRecent === -1 && bRecent !== -1) return 1;
    if (aRecent !== -1 && bRecent !== -1) return aRecent - bRecent;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const triggeredIncidents = sortedIncidents.filter((i) => i.status === "triggered");
  const acknowledgedIncidents = sortedIncidents.filter((i) => i.status === "acknowledged");
  const resolvedIncidents = sortedIncidents.filter((i) => i.status === "resolved");

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search incidents..."
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          onChange={(value) => {
            if (value.startsWith("status:")) {
              setStatusFilter(value.replace("status:", "") as StatusFilter);
            } else if (value.startsWith("urgency:")) {
              setUrgencyFilter(value.replace("urgency:", "") as UrgencyFilter);
            } else if (value.startsWith("service:")) {
              setServiceFilter(value.replace("service:", ""));
            } else if (value.startsWith("time:")) {
              setTimeRangeFilter(value.replace("time:", "") as TimeRangeFilter);
            }
          }}
        >
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item title="Active (Triggered + Ack)" value="status:all" />
            <List.Dropdown.Item title="Triggered" value="status:triggered" />
            <List.Dropdown.Item title="Acknowledged" value="status:acknowledged" />
            <List.Dropdown.Item title="Resolved" value="status:resolved" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Urgency">
            <List.Dropdown.Item title="All Urgencies" value="urgency:all" />
            <List.Dropdown.Item title="High" value="urgency:high" />
            <List.Dropdown.Item title="Low" value="urgency:low" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Time Range">
            <List.Dropdown.Item title="All Time" value="time:all" />
            <List.Dropdown.Item title="Last Hour" value="time:1h" />
            <List.Dropdown.Item title="Last 24 Hours" value="time:24h" />
            <List.Dropdown.Item title="Last 7 Days" value="time:7d" />
            <List.Dropdown.Item title="Last 30 Days" value="time:30d" />
          </List.Dropdown.Section>
          {services.length > 0 && (
            <List.Dropdown.Section title="Service">
              <List.Dropdown.Item title="All Services" value="service:all" />
              {services.map((service) => (
                <List.Dropdown.Item key={service.id} title={service.name} value={`service:${service.id}`} />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {sortedIncidents.length === 0 && !isLoading && (
        <List.EmptyView
          title="No incidents found"
          description={searchText ? "Try a different search" : "All clear!"}
          icon={Icon.CheckCircle}
        />
      )}

      {triggeredIncidents.length > 0 && (
        <List.Section title="🔴 Triggered" subtitle={`${triggeredIncidents.length}`}>
          {triggeredIncidents.map((incident) => (
            <IncidentListItem
              key={incident.id}
              incident={incident}
              isRecent={recentIds.includes(incident.id)}
              onAcknowledge={() => acknowledgeIncident(incident)}
              onResolve={() => resolveIncident(incident)}
              onSelect={() => saveRecentIncident(incident.id)}
              onRefresh={loadIncidents}
            />
          ))}
        </List.Section>
      )}

      {acknowledgedIncidents.length > 0 && (
        <List.Section title="🟠 Acknowledged" subtitle={`${acknowledgedIncidents.length}`}>
          {acknowledgedIncidents.map((incident) => (
            <IncidentListItem
              key={incident.id}
              incident={incident}
              isRecent={recentIds.includes(incident.id)}
              onAcknowledge={() => acknowledgeIncident(incident)}
              onResolve={() => resolveIncident(incident)}
              onSelect={() => saveRecentIncident(incident.id)}
              onRefresh={loadIncidents}
            />
          ))}
        </List.Section>
      )}

      {resolvedIncidents.length > 0 && (
        <List.Section title="🟢 Resolved" subtitle={`${resolvedIncidents.length}`}>
          {resolvedIncidents.map((incident) => (
            <IncidentListItem
              key={incident.id}
              incident={incident}
              isRecent={recentIds.includes(incident.id)}
              onAcknowledge={() => acknowledgeIncident(incident)}
              onResolve={() => resolveIncident(incident)}
              onSelect={() => saveRecentIncident(incident.id)}
              onRefresh={loadIncidents}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function IncidentListItem({
  incident,
  isRecent,
  onAcknowledge,
  onResolve,
  onSelect,
  onRefresh,
}: {
  incident: Incident;
  isRecent: boolean;
  onAcknowledge: () => void;
  onResolve: () => void;
  onSelect: () => void;
  onRefresh: () => void;
}) {
  const { subdomain } = getPreferenceValues<Preferences>();
  const serviceName = incident.service.summary || incident.service.id;
  const timeAgo = formatRelativeTime(incident.last_status_change_at || incident.created_at);

  const accessories: List.Item.Accessory[] = [];
  if (isRecent) {
    accessories.push({ tag: { value: "Recent", color: Color.Blue } });
  }
  accessories.push({ text: serviceName });
  accessories.push({ text: timeAgo });
  if (incident.urgency === "high") {
    accessories.push({ icon: { source: Icon.ExclamationMark, tintColor: Color.Red } });
  }

  return (
    <List.Item
      title={incident.title}
      subtitle={`#${incident.incident_number}`}
      accessories={accessories}
      icon={{
        source: Icon.Circle,
        tintColor: getIncidentStatusColor(incident.status),
      }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={<IncidentDetail incident={incident} onRefresh={onRefresh} />}
              onPush={onSelect}
            />
            {incident.status === "triggered" && (
              <Action
                title="Acknowledge"
                icon={Icon.CheckCircle}
                onAction={() => {
                  onSelect();
                  onAcknowledge();
                }}
              />
            )}
            {incident.status !== "resolved" && (
              <Action
                title="Resolve"
                icon={Icon.Checkmark}
                onAction={() => {
                  onSelect();
                  onResolve();
                }}
              />
            )}
            <Action.Push
              title="Add Note"
              icon={Icon.Pencil}
              target={<AddNoteForm incident={incident} onSuccess={onRefresh} />}
              onPush={onSelect}
            />
            <Action.Push
              title="Reassign"
              icon={Icon.PersonCircle}
              target={<ReassignIncident incident={incident} onSuccess={onRefresh} />}
              onPush={onSelect}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Incident Id" content={incident.id} />
            <Action.OpenInBrowser
              title="Open In PagerDuty"
              url={`https://${subdomain}.pagerduty.com/incidents/${incident.id}`}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function AddNoteForm({ incident, onSuccess }: { incident: Incident; onSuccess: () => void }) {
  const { pop } = useNavigation();
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!note.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Note cannot be empty" });
      return;
    }

    setIsSubmitting(true);
    try {
      const client = getPagerDutyClient();
      await client.addIncidentNote(incident.id, note);
      showToast({ style: Toast.Style.Success, title: "Note added" });
      onSuccess();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to add note",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Incident" text={incident.title} />
      <Form.TextArea id="note" title="Note" placeholder="Enter your note..." value={note} onChange={setNote} />
    </Form>
  );
}

function IncidentDetail({ incident: initialIncident, onRefresh }: { incident: Incident; onRefresh: () => void }) {
  const { pop } = useNavigation();
  const { subdomain } = getPreferenceValues<Preferences>();
  const [incident, setIncident] = useState<Incident>(initialIncident);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFullIncident() {
      try {
        const client = getPagerDutyClient();
        const fullIncident = await client.getIncident(initialIncident.id);
        setIncident(fullIncident);
      } catch (error) {
        console.error("Failed to load incident details:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadFullIncident();
  }, [initialIncident.id]);

  const assignees = incident.assignments
    .map((a) => a.assignee.summary || a.assignee.id)
    .join(", ") || "Unassigned";

  const customDetails = incident.body?.details;
  const cefPayload = customDetails?.__pd_cef_payload;
  const alertDetails = cefPayload?.details || {};

  let customDetailsMarkdown = "";
  if (customDetails) {
    customDetailsMarkdown = "\n## Custom Details\n\n";
    
    if (alertDetails.firing) {
      customDetailsMarkdown += "### Alert Info\n\n```\n" + alertDetails.firing + "\n```\n\n";
    }
    
    if (alertDetails.num_firing || alertDetails.num_resolved) {
      customDetailsMarkdown += `| Metric | Value |\n|--------|-------|\n`;
      if (alertDetails.num_firing) {
        customDetailsMarkdown += `| **Firing** | ${alertDetails.num_firing} |\n`;
      }
      if (alertDetails.num_resolved) {
        customDetailsMarkdown += `| **Resolved** | ${alertDetails.num_resolved} |\n`;
      }
      customDetailsMarkdown += "\n";
    }

    if (cefPayload?.client) {
      customDetailsMarkdown += `**Client:** ${cefPayload.client}\n\n`;
    }
    if (cefPayload?.client_url) {
      customDetailsMarkdown += `**Client URL:** [View in ${cefPayload.client || "Source"}](${cefPayload.client_url})\n\n`;
    }
    if (cefPayload?.dedup_key) {
      customDetailsMarkdown += `**Alert Key:** \`${cefPayload.dedup_key}\`\n\n`;
    }
  }

  const markdown = `
# ${incident.title}

**Incident #${incident.incident_number}**

---

## Status: ${incident.status.toUpperCase()}

| Field | Value |
|-------|-------|
| **Urgency** | ${incident.urgency} |
| **Service** | ${incident.service.summary || incident.service.id} |
| **Assignees** | ${assignees} |
| **Created** | ${new Date(incident.created_at).toLocaleString()} |
| **Last Updated** | ${new Date(incident.last_status_change_at || incident.created_at).toLocaleString()} |

${incident.description ? `\n## Description\n\n${incident.description}` : ""}
${customDetailsMarkdown}
`;

  async function handleAcknowledge() {
    try {
      showToast({ style: Toast.Style.Animated, title: "Acknowledging..." });
      const client = getPagerDutyClient();
      await client.acknowledgeIncident(incident.id);
      showToast({ style: Toast.Style.Success, title: "Incident acknowledged" });
      onRefresh();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to acknowledge",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleResolve() {
    const confirmed = await confirmAlert({
      title: "Resolve Incident?",
      message: `Are you sure you want to resolve "${incident.title}"?`,
      primaryAction: { title: "Resolve" },
    });
    if (!confirmed) return;

    try {
      showToast({ style: Toast.Style.Animated, title: "Resolving..." });
      const client = getPagerDutyClient();
      await client.resolveIncident(incident.id);
      showToast({ style: Toast.Style.Success, title: "Incident resolved" });
      onRefresh();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to resolve",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="ID" text={incident.id} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={incident.status}
              color={
                incident.status === "triggered"
                  ? Color.Red
                  : incident.status === "acknowledged"
                    ? Color.Orange
                    : Color.Green
              }
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Urgency" text={incident.urgency} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Service" text={incident.service.summary || incident.service.id} />
          <Detail.Metadata.Label title="Assignees" text={assignees} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Open in PagerDuty"
            target={`https://${subdomain}.pagerduty.com/incidents/${incident.id}`}
            text="View in Browser"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {incident.status === "triggered" && (
              <Action title="Acknowledge" icon={Icon.CheckCircle} onAction={handleAcknowledge} />
            )}
            {incident.status !== "resolved" && (
              <Action title="Resolve" icon={Icon.Checkmark} onAction={handleResolve} />
            )}
            <Action.Push
              title="Add Note"
              icon={Icon.Pencil}
              target={<AddNoteForm incident={incident} onSuccess={onRefresh} />}
            />
            <Action.Push
              title="Reassign"
              icon={Icon.PersonCircle}
              target={<ReassignIncident incident={incident} onSuccess={onRefresh} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Incident Id" content={incident.id} />
            <Action.OpenInBrowser
              title="Open In PagerDuty"
              url={`https://${subdomain}.pagerduty.com/incidents/${incident.id}`}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
