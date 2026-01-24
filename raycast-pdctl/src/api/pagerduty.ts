import { getPreferenceValues } from "@raycast/api";
import {
  Incident,
  IncidentsResponse,
  Note,
  OnCallsResponse,
  ServicesResponse,
  UsersResponse,
  SchedulesResponse,
  EscalationPoliciesResponse,
  PagerDutyError,
  User,
  Service,
  EscalationPolicy,
} from "./types";

interface Preferences {
  apiToken: string;
  subdomain: string;
}

const BASE_URL = "https://api.pagerduty.com";

function getToken(): string {
  const { apiToken } = getPreferenceValues<Preferences>();
  return apiToken;
}

export class PagerDutyAPI {
  private token: string;

  constructor() {
    this.token = getToken();
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      Authorization: `Token token=${this.token}`,
      Accept: "application/vnd.pagerduty+json;version=2",
      "Content-Type": "application/json",
      ...options?.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 429) {
      const reset = response.headers.get("X-Rate-Limit-Reset");
      throw new Error(`Rate limited. Retry after ${reset || 60} seconds`);
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const err: PagerDutyError = await response.json();
        errorMessage = err.error?.message || errorMessage;
      } catch {
        // Ignore JSON parse errors, use default message
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.request<{ user: User }>("/users/me");
    return response.user;
  }

  async listIncidents(
    statuses?: string[],
    serviceIds?: string[],
    urgencies?: string[],
    limit = 25,
    offset = 0,
    since?: string,
    until?: string,
  ): Promise<IncidentsResponse> {
    let url = `/incidents?limit=${limit}&offset=${offset}`;

    if (statuses?.length) {
      statuses.forEach((s) => {
        url += `&statuses[]=${s}`;
      });
    }
    if (serviceIds?.length) {
      serviceIds.forEach((id) => {
        url += `&service_ids[]=${id}`;
      });
    }
    if (urgencies?.length) {
      urgencies.forEach((u) => {
        url += `&urgencies[]=${u}`;
      });
    }
    if (since) {
      url += `&since=${encodeURIComponent(since)}`;
    }
    if (until) {
      url += `&until=${encodeURIComponent(until)}`;
    }

    return this.request<IncidentsResponse>(url);
  }

  async getIncident(id: string): Promise<Incident> {
    const response = await this.request<{ incident: Incident }>(`/incidents/${id}?include[]=body`);
    return response.incident;
  }

  async updateIncident(
    id: string,
    status?: string,
    assignments?: { assignee: { id: string; type: string } }[],
  ): Promise<Incident> {
    const incident: Record<string, unknown> = {
      id,
      type: "incident_reference",
    };

    if (status) {
      incident.status = status;
    }
    if (assignments) {
      incident.assignments = assignments;
    }

    const response = await this.request<{ incident: Incident }>(`/incidents/${id}`, {
      method: "PUT",
      body: JSON.stringify({ incident }),
    });
    return response.incident;
  }

  async acknowledgeIncident(id: string): Promise<Incident> {
    return this.updateIncident(id, "acknowledged");
  }

  async resolveIncident(id: string): Promise<Incident> {
    return this.updateIncident(id, "resolved");
  }

  async addIncidentNote(incidentId: string, content: string): Promise<Note> {
    const response = await this.request<{ note: Note }>(`/incidents/${incidentId}/notes`, {
      method: "POST",
      body: JSON.stringify({
        note: { content },
      }),
    });
    return response.note;
  }

  async reassignIncident(
    id: string,
    assigneeId: string,
    assigneeType: "user" | "escalation_policy",
  ): Promise<Incident> {
    const refType = assigneeType === "user" ? "user_reference" : "escalation_policy_reference";
    return this.updateIncident(id, undefined, [
      {
        assignee: {
          id: assigneeId,
          type: refType,
        },
      },
    ]);
  }

  async listOncalls(scheduleIds?: string[], limit = 25, offset = 0): Promise<OnCallsResponse> {
    let url = `/oncalls?limit=${limit}&offset=${offset}`;

    if (scheduleIds?.length) {
      scheduleIds.forEach((id) => {
        url += `&schedule_ids[]=${id}`;
      });
    }

    return this.request<OnCallsResponse>(url);
  }

  async listServices(limit = 25, offset = 0): Promise<ServicesResponse> {
    return this.request<ServicesResponse>(`/services?limit=${limit}&offset=${offset}`);
  }

  async listAllServices(): Promise<Service[]> {
    const all: Service[] = [];
    let offset = 0;
    let more = true;

    while (more) {
      const response = await this.listServices(100, offset);
      all.push(...response.services);
      more = response.more;
      offset += response.limit;
    }

    return all;
  }

  async listUsers(limit = 25, offset = 0): Promise<UsersResponse> {
    return this.request<UsersResponse>(`/users?limit=${limit}&offset=${offset}`);
  }

  async listAllUsers(): Promise<User[]> {
    const all: User[] = [];
    let offset = 0;
    let more = true;

    while (more) {
      const response = await this.listUsers(100, offset);
      all.push(...response.users);
      more = response.more;
      offset += response.limit;
    }

    return all;
  }

  async listSchedules(limit = 25, offset = 0): Promise<SchedulesResponse> {
    return this.request<SchedulesResponse>(`/schedules?limit=${limit}&offset=${offset}`);
  }

  async listEscalationPolicies(limit = 25, offset = 0): Promise<EscalationPoliciesResponse> {
    return this.request<EscalationPoliciesResponse>(`/escalation_policies?limit=${limit}&offset=${offset}`);
  }

  async listAllEscalationPolicies(): Promise<EscalationPolicy[]> {
    const all: EscalationPolicy[] = [];
    let offset = 0;
    let more = true;

    while (more) {
      const response = await this.listEscalationPolicies(100, offset);
      all.push(...response.escalation_policies);
      more = response.more;
      offset += response.limit;
    }

    return all;
  }
}

let clientInstance: PagerDutyAPI | null = null;

export function getPagerDutyClient(): PagerDutyAPI {
  if (!clientInstance) {
    clientInstance = new PagerDutyAPI();
  }
  return clientInstance;
}

export function getIncidentStatusColor(status: string): string {
  switch (status) {
    case "triggered":
      return "#FF0000";
    case "acknowledged":
      return "#FFA500";
    case "resolved":
      return "#00FF00";
    default:
      return "#808080";
  }
}

export function getUrgencyIcon(urgency: string): string {
  return urgency === "high" ? "🔴" : "🟡";
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
