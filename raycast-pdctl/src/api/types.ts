export interface User {
  id: string;
  name: string;
  email: string;
  time_zone?: string;
  role?: string;
}

export interface UserRef {
  id: string;
  summary?: string;
}

export interface ServiceReference {
  id: string;
  summary?: string;
}

export interface Priority {
  id: string;
  name: string;
}

export interface Assignee {
  id: string;
  summary?: string;
}

export interface Assignment {
  assignee: Assignee;
}

export interface IncidentBody {
  details?: {
    firing?: string;
    num_firing?: string;
    num_resolved?: string;
    resolved?: string;
    client?: string;
    client_url?: string;
    description?: string;
    incident_key?: string;
    __pd_cef_payload?: {
      client?: string;
      client_url?: string;
      dedup_key?: string;
      description?: string;
      details?: Record<string, string>;
    };
    [key: string]: unknown;
  };
}

export interface Incident {
  id: string;
  incident_number: number;
  title: string;
  description?: string;
  status: string;
  urgency: string;
  priority?: Priority;
  service: ServiceReference;
  assignments: Assignment[];
  created_at: string;
  last_status_change_at?: string;
  body?: IncidentBody;
  html_url?: string;
}

export interface IncidentsResponse {
  incidents: Incident[];
  limit: number;
  offset: number;
  more: boolean;
  total?: number;
}

export interface Note {
  id: string;
  content: string;
  created_at: string;
  user?: User;
}

export interface ScheduleReference {
  id: string;
  summary?: string;
}

export interface EscalationPolicyReference {
  id: string;
  summary?: string;
}

export interface OnCall {
  user: UserRef;
  schedule?: ScheduleReference;
  escalation_policy?: EscalationPolicyReference;
  escalation_level: number;
  start?: string;
  end?: string;
}

export interface OnCallsResponse {
  oncalls: OnCall[];
  limit: number;
  offset: number;
  more: boolean;
}

export interface ScheduleSummary {
  id: string;
  name: string;
  description?: string;
  time_zone?: string;
}

export interface SchedulesResponse {
  schedules: ScheduleSummary[];
  limit: number;
  offset: number;
  more: boolean;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  status: string;
  escalation_policy?: EscalationPolicyReference;
}

export interface ServicesResponse {
  services: Service[];
  limit: number;
  offset: number;
  more: boolean;
}

export interface UsersResponse {
  users: User[];
  limit: number;
  offset: number;
  more: boolean;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  description?: string;
  num_loops?: number;
}

export interface EscalationPoliciesResponse {
  escalation_policies: EscalationPolicy[];
  limit: number;
  offset: number;
  more: boolean;
}

export interface PagerDutyError {
  error: {
    message: string;
    code?: number;
  };
}
