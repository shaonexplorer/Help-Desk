import { apiClient } from '@/lib/api-client';

export type DashboardRange = '7d' | '30d' | '90d';

/** Key dashboard statistics (KPIs). */
export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  ticketsThisPeriod: number;
  ticketsPrevPeriod: number;
  delta: number; // percentage change vs previous period
  avgResolutionHours: number;
  activeAgents: number;
}

export interface StatsResponse {
  stats: DashboardStats;
}

/** Ticket count by status. */
export interface TicketsByStatusItem {
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  count: number;
}

export interface TicketsByStatusResponse {
  data: TicketsByStatusItem[];
}

/** Ticket count by priority. */
export interface TicketsByPriorityItem {
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  count: number;
}

export interface TicketsByPriorityResponse {
  data: TicketsByPriorityItem[];
}

/** Ticket count by category. */
export interface TicketsByCategoryItem {
  category: 'BUG' | 'FEATURE_REQUEST' | 'SUPPORT' | 'BILLING' | 'OTHER';
  count: number;
}

export interface TicketsByCategoryResponse {
  data: TicketsByCategoryItem[];
}

/** Ticket count by assignee. */
export interface TicketsByAssigneeItem {
  assigneeId: string;
  assigneeName: string;
  count: number;
}

export interface TicketsByAssigneeResponse {
  data: TicketsByAssigneeItem[];
}

/** Ticket trend over time (daily counts by status). */
export interface TicketsOverTimeItem {
  date: string; // YYYY-MM-DD
  OPEN: number;
  IN_PROGRESS: number;
  RESOLVED: number;
  CLOSED: number;
  total: number;
}

export interface TicketsOverTimeResponse {
  data: TicketsOverTimeItem[];
}

/** Average resolution time trend (daily). */
export interface ResolutionTimeTrendItem {
  date: string; // YYYY-MM-DD
  avgHours: number;
}

export interface ResolutionTimeTrendResponse {
  data: ResolutionTimeTrendItem[];
}

/** Common query parameters for dashboard endpoints. */
export interface DashboardQueryParams {
  range?: DashboardRange;
}

/**
 * Fetch key dashboard statistics (KPIs).
 */
export async function fetchDashboardStats(params?: DashboardQueryParams): Promise<StatsResponse> {
  const { data } = await apiClient.get<StatsResponse>('/api/dashboard/stats', { params });
  return data;
}

/**
 * Fetch ticket counts grouped by status.
 */
export async function fetchTicketsByStatus(params?: DashboardQueryParams): Promise<TicketsByStatusResponse> {
  const { data } = await apiClient.get<TicketsByStatusResponse>('/api/dashboard/tickets-by-status', { params });
  return data;
}

/**
 * Fetch ticket counts grouped by priority.
 */
export async function fetchTicketsByPriority(params?: DashboardQueryParams): Promise<TicketsByPriorityResponse> {
  const { data } = await apiClient.get<TicketsByPriorityResponse>('/api/dashboard/tickets-by-priority', { params });
  return data;
}

/**
 * Fetch ticket counts grouped by category.
 */
export async function fetchTicketsByCategory(params?: DashboardQueryParams): Promise<TicketsByCategoryResponse> {
  const { data } = await apiClient.get<TicketsByCategoryResponse>('/api/dashboard/tickets-by-category', { params });
  return data;
}

/**
 * Fetch ticket counts grouped by assignee (top 10).
 */
export async function fetchTicketsByAssignee(params?: DashboardQueryParams): Promise<TicketsByAssigneeResponse> {
  const { data } = await apiClient.get<TicketsByAssigneeResponse>('/api/dashboard/tickets-by-assignee', { params });
  return data;
}

/**
 * Fetch ticket trend over time (daily counts by status).
 */
export async function fetchTicketsOverTime(params?: DashboardQueryParams): Promise<TicketsOverTimeResponse> {
  const { data } = await apiClient.get<TicketsOverTimeResponse>('/api/dashboard/tickets-over-time', { params });
  return data;
}

/**
 * Fetch average resolution time trend over time.
 */
export async function fetchResolutionTimeTrend(params?: DashboardQueryParams): Promise<ResolutionTimeTrendResponse> {
  const { data } = await apiClient.get<ResolutionTimeTrendResponse>('/api/dashboard/resolution-time-trend', { params });
  return data;
}