import { List, ActionPanel, Action, showToast, Toast, LocalStorage, Icon, Color, useNavigation } from "@raycast/api";
import React, { useState, useEffect } from "react";
import { getPagerDutyClient } from "./api/pagerduty";
import { Incident, User, EscalationPolicy } from "./api/types";

const RECENT_ASSIGNEES_KEY = "recent-assignees";
const MAX_RECENTS = 10;

type AssigneeType = "user" | "escalation_policy";

interface Assignee {
  id: string;
  name: string;
  type: AssigneeType;
  subtitle?: string;
}

export default function ReassignIncident({ incident, onSuccess }: { incident: Incident; onSuccess: () => void }) {
  const { pop } = useNavigation();
  const [users, setUsers] = useState<User[]>([]);
  const [policies, setPolicies] = useState<EscalationPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    loadRecents();
    loadAssignees();
  }, []);

  async function loadRecents() {
    const stored = await LocalStorage.getItem<string>(RECENT_ASSIGNEES_KEY);
    if (stored) {
      setRecentIds(JSON.parse(stored));
    }
  }

  async function saveRecentAssignee(id: string) {
    const updated = [id, ...recentIds.filter((i) => i !== id)].slice(0, MAX_RECENTS);
    setRecentIds(updated);
    await LocalStorage.setItem(RECENT_ASSIGNEES_KEY, JSON.stringify(updated));
  }

  async function loadAssignees() {
    setIsLoading(true);
    try {
      const client = getPagerDutyClient();
      const [allUsers, allPolicies] = await Promise.all([client.listAllUsers(), client.listAllEscalationPolicies()]);
      setUsers(allUsers);
      setPolicies(allPolicies);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load assignees",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function reassign(assignee: Assignee) {
    try {
      showToast({ style: Toast.Style.Animated, title: "Reassigning..." });
      const client = getPagerDutyClient();
      await client.reassignIncident(incident.id, assignee.id, assignee.type);
      await saveRecentAssignee(assignee.id);
      showToast({
        style: Toast.Style.Success,
        title: "Incident reassigned",
        message: `Assigned to ${assignee.name}`,
      });
      onSuccess();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to reassign",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const allAssignees: Assignee[] = [
    ...users.map((u) => ({
      id: u.id,
      name: u.name,
      type: "user" as AssigneeType,
      subtitle: u.email,
    })),
    ...policies.map((p) => ({
      id: p.id,
      name: p.name,
      type: "escalation_policy" as AssigneeType,
      subtitle: p.description,
    })),
  ];

  const filteredAssignees = allAssignees.filter((a) => {
    if (!searchText) return true;
    const query = searchText.toLowerCase();
    return (
      a.name.toLowerCase().includes(query) ||
      a.id.toLowerCase().includes(query) ||
      a.subtitle?.toLowerCase().includes(query)
    );
  });

  const sortedAssignees = [...filteredAssignees].sort((a, b) => {
    const aRecent = recentIds.indexOf(a.id);
    const bRecent = recentIds.indexOf(b.id);
    if (aRecent !== -1 && bRecent === -1) return -1;
    if (aRecent === -1 && bRecent !== -1) return 1;
    if (aRecent !== -1 && bRecent !== -1) return aRecent - bRecent;
    return a.name.localeCompare(b.name);
  });

  const userAssignees = sortedAssignees.filter((a) => a.type === "user");
  const policyAssignees = sortedAssignees.filter((a) => a.type === "escalation_policy");

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search users or escalation policies..."
      navigationTitle={`Reassign: ${incident.title.substring(0, 30)}...`}
      throttle
    >
      {sortedAssignees.length === 0 && !isLoading && (
        <List.EmptyView
          title="No assignees found"
          description={searchText ? "Try a different search" : "No users or policies available"}
        />
      )}

      {userAssignees.length > 0 && (
        <List.Section title="Users" subtitle={`${userAssignees.length}`}>
          {userAssignees.map((assignee) => (
            <AssigneeListItem
              key={assignee.id}
              assignee={assignee}
              isRecent={recentIds.includes(assignee.id)}
              onSelect={() => reassign(assignee)}
            />
          ))}
        </List.Section>
      )}

      {policyAssignees.length > 0 && (
        <List.Section title="Escalation Policies" subtitle={`${policyAssignees.length}`}>
          {policyAssignees.map((assignee) => (
            <AssigneeListItem
              key={assignee.id}
              assignee={assignee}
              isRecent={recentIds.includes(assignee.id)}
              onSelect={() => reassign(assignee)}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function AssigneeListItem({
  assignee,
  isRecent,
  onSelect,
}: {
  assignee: Assignee;
  isRecent: boolean;
  onSelect: () => void;
}) {
  const accessories: List.Item.Accessory[] = [];
  if (isRecent) {
    accessories.push({ tag: { value: "Recent", color: Color.Blue } });
  }
  if (assignee.subtitle) {
    accessories.push({ text: assignee.subtitle.substring(0, 30) });
  }

  return (
    <List.Item
      title={assignee.name}
      subtitle={assignee.id}
      icon={assignee.type === "user" ? Icon.Person : Icon.List}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title="Reassign to This" icon={Icon.PersonCircle} onAction={onSelect} />
          <Action.CopyToClipboard title="Copy Id" content={assignee.id} />
        </ActionPanel>
      }
    />
  );
}
