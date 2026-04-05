// ─────────────────────────────────────────────────────────────────────────────
// SFOACC API Client
// Usage:
//   const client = new SFOACCClient({ baseUrl: "https://yourapi.com" });
//   // after login, set the token:
//   client.setToken(loginResponse.access_token);
// ─────────────────────────────────────────────────────────────────────────────

import type {
  APIResponse,
  PagedData,
  PagedResponse,
  LoginResponse,
  OTPRequestBody,  // eslint-disable-line @typescript-eslint/no-unused-vars
  OTPVerifyBody,   // eslint-disable-line @typescript-eslint/no-unused-vars
  PasswordResetRequest,
  PasswordResetResponse,
  ParishDetail,
  ChurchUnit,
  ChurchUnitCreate,
  ChurchUnitUpdate,
  OutstationDetail,
  MassSchedule,
  MassScheduleCreate,
  MassScheduleUpdate,
  LeadershipCreate,
  LeadershipUpdate,
  LeadershipRead,
  ChurchEventCreate,
  ChurchEventUpdate,
  ChurchEventRead,
  EventListParams,
  EventsPagedData,
  EventMessageCreate,
  EventMessageRead,
  Society,
  SocietyCreate,
  SocietyUpdate,
  SocietyMember,
  ChurchCommunity,
  ChurchCommunityCreate,
  ChurchCommunityUpdate,
  Parishioner,
  ParishionerCreate,
  ParishionerUpdate,
  ParishionerDetailed,
  ParishionerFilters,
  User,
  UserCreate,
  UserUpdate,
  ChurchUnitAssignment,
  ChurchUnitSummary,
  RoleRead,
  RoleCreate,
  RoleUpdate,
  RolePermissionsUpdate,
  PermissionRead,
  SettingRead,
  SettingsBulkUpdate,
  AppConfigUpdate,
  AuthConfigUpdate,
  PaginationParams,
  EmergencyContactCreate,
  EmergencyContactUpdate,
  MedicalConditionCreate,
  MedicalConditionUpdate,
} from "./types";

export class APIError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "APIError";
  }
}

export interface SFOACCClientConfig {
  /** Base URL of the API, e.g. "https://api.yourdomain.com" */
  baseUrl: string;
  /** Optional initial token */
  token?: string;
  /** Called when the API returns a 401 (e.g. token expired) */
  onUnauthorized?: () => void;
  /** Scope all requests to this church unit via X-Church-Unit-Id header */
  unitId?: number;
}

export class SFOACCClient {
  private baseUrl: string;
  private token: string | null;
  private onUnauthorized?: () => void;
  private unitId: number | undefined;

  constructor(config: SFOACCClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.token = config.token ?? null;
    this.onUnauthorized = config.onUnauthorized;
    this.unitId = config.unitId;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  setUnitId(id: number | undefined) {
    this.unitId = id;
  }

  private get headers(): HeadersInit {
    return {
      "Content-Type": "application/json",
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...(this.unitId ? { "X-Church-Unit-Id": String(this.unitId) } : {}),
    };
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: { ...this.headers, ...(options.headers ?? {}) },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const detail = body?.detail ?? res.statusText;
      if (res.status === 401) {
        this.onUnauthorized?.();
      }
      throw new APIError(res.status, detail);
    }
    return res.json() as Promise<T>;
  }

  private buildQuery(params: object): string {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
      if (v !== undefined && v !== null) q.set(k, String(v));
    }
    const s = q.toString();
    return s ? `?${s}` : "";
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  // ── App info (public, no token) ────────────────────────────────────────────

  /** Public — app branding and contact config (name, description, contact_email, etc.). */
  getAppConfig(): Promise<{
    data: {
      name: string;
      description: string;
      version: string;
      church_code: string;
      currency_symbol: string;
      currency_code: string;
      contact_email: string;
      contact_phone: string;
      website: string;
      address: string;
      logo_url: string;
      support_email: string;
    };
  }> {
    return this.request("/api/v1/app/config");
  }

  /**
   * Public — everything the login page needs: enabled login methods, groups, church units.
   * Call this once on app load (before login) to drive login form rendering.
   */
  getLoginConfig(): Promise<{
    data: {
      login_methods: { password: boolean; otp_email: boolean; otp_sms: boolean };
      groups: Array<{ name: string; label: string; description: string }>;
      church_units: Array<{ id: number; name: string; type: string }>;
    };
  }> {
    return this.request("/api/v1/app/login-config");
  }

  /** Public — list available groups for dropdown population. No token required. */
  listGroups(): Promise<{ data: Array<{ name: string; label: string; description: string }> }> {
    return this.request("/api/v1/app/groups");
  }

  /** Public — list all active church units for login/user-creation dropdowns. No token required. */
  listChurchUnitsPublic(): Promise<{ data: Array<{ id: number; name: string; type: "parish" | "outstation" }> }> {
    return this.request("/api/v1/app/church-units");
  }

  /** Login and automatically store the returned token. */
  async login(email: string, password: string): Promise<LoginResponse> {
    const body = new URLSearchParams({ username: email, password });
    const res = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: "POST",
      body,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new APIError(res.status, err?.detail ?? res.statusText);
    }
    const data: LoginResponse = await res.json();
    this.token = data.access_token;
    return data;
  }

  async resetPassword(
    payload: PasswordResetRequest
  ): Promise<APIResponse<PasswordResetResponse>> {
    return this.request("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /**
   * Request an OTP code. Always resolves (202) regardless of whether the email
   * exists — do not treat a successful response as proof the user exists.
   */
  /**
   * Request a one-time login code.
   * The code is sent to ALL available channels (email + SMS) simultaneously.
   * @param identifier  Email address OR phone number with country code (e.g. 233543460633)
   */
  async requestOtp(identifier: string): Promise<APIResponse<null>> {
    const body: OTPRequestBody = { identifier };
    return this.request("/api/v1/auth/otp/request", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Verify an OTP code and receive a JWT token.
   * @param identifier  Email address OR phone number with country code
   */
  async verifyOtp(identifier: string, code: string): Promise<LoginResponse> {
    const body: OTPVerifyBody = { identifier, code };
    const res = await this.request<LoginResponse>("/api/v1/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify(body),
    });
    this.token = res.access_token;
    return res;
  }

  // ── Parish ────────────────────────────────────────────────────────────────

  /** Full parish detail including outstations, schedules, societies, communities. */
  getParish(): Promise<APIResponse<ParishDetail>> {
    return this.request("/api/v1/parish");
  }

  updateParish(data: ChurchUnitUpdate): Promise<APIResponse<ChurchUnit>> {
    return this.request("/api/v1/parish", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // ── Outstations ──────────────────────────────────────────────────────────

  listOutstations(
    params: PaginationParams = {}
  ): Promise<PagedResponse<ChurchUnit>> {
    return this.request(`/api/v1/parish/outstations${this.buildQuery(params)}`);
  }

  getOutstation(id: number): Promise<APIResponse<OutstationDetail>> {
    return this.request(`/api/v1/parish/outstations/${id}`);
  }

  createOutstation(
    data: Omit<ChurchUnitCreate, "type">
  ): Promise<APIResponse<ChurchUnit>> {
    return this.request("/api/v1/parish/outstations", {
      method: "POST",
      body: JSON.stringify({ ...data, type: "OUTSTATION" }),
    });
  }

  updateOutstation(
    id: number,
    data: ChurchUnitUpdate
  ): Promise<APIResponse<ChurchUnit>> {
    return this.request(`/api/v1/parish/outstations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  deleteOutstation(id: number): Promise<APIResponse<null>> {
    return this.request(`/api/v1/parish/outstations/${id}`, {
      method: "DELETE",
    });
  }

  // ── Mass Schedules ────────────────────────────────────────────────────────

  listParishSchedules(): Promise<APIResponse<MassSchedule[]>> {
    return this.request("/api/v1/parish/mass-schedules");
  }

  createParishSchedule(
    data: MassScheduleCreate
  ): Promise<APIResponse<MassSchedule>> {
    return this.request("/api/v1/parish/mass-schedules", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateParishSchedule(
    id: number,
    data: MassScheduleUpdate
  ): Promise<APIResponse<MassSchedule>> {
    return this.request(`/api/v1/parish/mass-schedules/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  deleteParishSchedule(id: number): Promise<APIResponse<null>> {
    return this.request(`/api/v1/parish/mass-schedules/${id}`, {
      method: "DELETE",
    });
  }

  listOutstationSchedules(
    outstationId: number
  ): Promise<APIResponse<MassSchedule[]>> {
    return this.request(
      `/api/v1/parish/outstations/${outstationId}/mass-schedules`
    );
  }

  createOutstationSchedule(
    outstationId: number,
    data: MassScheduleCreate
  ): Promise<APIResponse<MassSchedule>> {
    return this.request(
      `/api/v1/parish/outstations/${outstationId}/mass-schedules`,
      { method: "POST", body: JSON.stringify(data) }
    );
  }

  updateOutstationSchedule(
    outstationId: number,
    scheduleId: number,
    data: MassScheduleUpdate
  ): Promise<APIResponse<MassSchedule>> {
    return this.request(
      `/api/v1/parish/outstations/${outstationId}/mass-schedules/${scheduleId}`,
      { method: "PUT", body: JSON.stringify(data) }
    );
  }

  deleteOutstationSchedule(
    outstationId: number,
    scheduleId: number
  ): Promise<APIResponse<null>> {
    return this.request(
      `/api/v1/parish/outstations/${outstationId}/mass-schedules/${scheduleId}`,
      { method: "DELETE" }
    );
  }

  // ── Church Units (generic) ────────────────────────────────────────────────

  listChurchUnits(
    params: PaginationParams = {}
  ): Promise<PagedResponse<ChurchUnit>> {
    return this.request(`/api/v1/parish/units${this.buildQuery(params)}`);
  }

  getChurchUnit(id: number): Promise<APIResponse<OutstationDetail>> {
    return this.request(`/api/v1/parish/units/${id}`);
  }

  createChurchUnit(data: ChurchUnitCreate): Promise<APIResponse<ChurchUnit>> {
    return this.request("/api/v1/parish/units", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateChurchUnit(
    id: number,
    data: ChurchUnitUpdate
  ): Promise<APIResponse<ChurchUnit>> {
    return this.request(`/api/v1/parish/units/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  deleteChurchUnit(id: number): Promise<APIResponse<null>> {
    return this.request(`/api/v1/parish/units/${id}`, { method: "DELETE" });
  }

  // ── Societies ─────────────────────────────────────────────────────────────

  listSocieties(
    params: PaginationParams & {
      search?: string;
      church_unit_id?: number;
    } = {}
  ): Promise<PagedResponse<Society>> {
    return this.request(`/api/v1/societies/all${this.buildQuery(params)}`);
  }

  getSociety(id: number): Promise<APIResponse<Society>> {
    return this.request(`/api/v1/societies/${id}`);
  }

  createSociety(data: SocietyCreate): Promise<APIResponse<Society>> {
    return this.request("/api/v1/societies", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateSociety(id: number, data: SocietyUpdate): Promise<APIResponse<Society>> {
    return this.request(`/api/v1/societies/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  deleteSociety(id: number): Promise<APIResponse<null>> {
    return this.request(`/api/v1/societies/${id}`, { method: "DELETE" });
  }

  async getSocietyMembers(id: number): Promise<APIResponse<SocietyMember[]>> {
    const PAGE = 100;
    let skip = 0;
    const all: SocietyMember[] = [];
    while (true) {
      const res: APIResponse<SocietyMember[] | { items?: SocietyMember[]; total?: number }> =
        await this.request(`/api/v1/societies/${id}/members${this.buildQuery({ limit: PAGE, skip })}`);
      const raw = res.data;
      const page: SocietyMember[] = Array.isArray(raw) ? raw : ((raw as { items?: SocietyMember[] })?.items ?? []);
      all.push(...page);
      if (page.length < PAGE) break;
      skip += PAGE;
    }
    return { data: all } as APIResponse<SocietyMember[]>;
  }

  addSocietyMembers(
    id: number,
    members: Array<{ parishioner_id: string; date_joined?: string }>
  ): Promise<APIResponse<null>> {
    return this.request(`/api/v1/societies/${id}/members`, {
      method: "POST",
      body: JSON.stringify({ members }),
    });
  }

  removeSocietyMembers(
    id: number,
    parishioner_ids: string[]
  ): Promise<APIResponse<null>> {
    return this.request(`/api/v1/societies/${id}/members`, {
      method: "DELETE",
      body: JSON.stringify({ parishioner_ids }),
    });
  }

  // ── Church Communities ────────────────────────────────────────────────────

  listCommunities(
    params: PaginationParams & { search?: string; church_unit_id?: number } = {}
  ): Promise<PagedResponse<ChurchCommunity>> {
    return this.request(
      `/api/v1/church-community/all${this.buildQuery(params)}`
    );
  }

  getCommunity(id: number): Promise<APIResponse<ChurchCommunity>> {
    return this.request(`/api/v1/church-community/${id}`);
  }

  async getCommunityMembers(id: number): Promise<APIResponse<Record<string, unknown>[]>> {
    const PAGE = 100;
    let skip = 0;
    const all: Record<string, unknown>[] = [];
    while (true) {
      const res: APIResponse<Record<string, unknown>[] | { items?: Record<string, unknown>[]; total?: number }> =
        await this.request(`/api/v1/church-community/${id}/members${this.buildQuery({ limit: PAGE, skip })}`);
      const raw = res.data;
      const page: Record<string, unknown>[] = Array.isArray(raw) ? raw : ((raw as { items?: Record<string, unknown>[] })?.items ?? []);
      all.push(...page);
      if (page.length < PAGE) break;
      skip += PAGE;
    }
    return { data: all } as APIResponse<Record<string, unknown>[]>;
  }

  addCommunityMembers(
    id: number,
    members: Array<{ parishioner_id: string; date_joined?: string }>
  ): Promise<APIResponse<null>> {
    return this.request(`/api/v1/church-community/${id}/members`, {
      method: "POST",
      body: JSON.stringify({ members }),
    });
  }

  removeCommunityMembers(
    id: number,
    parishioner_ids: string[]
  ): Promise<APIResponse<null>> {
    return this.request(`/api/v1/church-community/${id}/members`, {
      method: "DELETE",
      body: JSON.stringify({ parishioner_ids }),
    });
  }

  createCommunity(
    data: ChurchCommunityCreate
  ): Promise<APIResponse<ChurchCommunity>> {
    return this.request("/api/v1/church-community", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateCommunity(
    id: number,
    data: ChurchCommunityUpdate
  ): Promise<APIResponse<ChurchCommunity>> {
    return this.request(`/api/v1/church-community/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  deleteCommunity(id: number): Promise<APIResponse<null>> {
    return this.request(`/api/v1/church-community/${id}`, {
      method: "DELETE",
    });
  }

  // ── Parishioners ──────────────────────────────────────────────────────────

  listParishioners(
    filters: ParishionerFilters = {}
  ): Promise<PagedResponse<Parishioner>> {
    return this.request(`/api/v1/parishioners/all${this.buildQuery(filters)}`);
  }

  getParishioner(id: string): Promise<APIResponse<ParishionerDetailed>> {
    return this.request(`/api/v1/parishioners/${id}`);
  }

  createParishioner(
    data: ParishionerCreate
  ): Promise<APIResponse<Parishioner>> {
    return this.request("/api/v1/parishioners", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateParishioner(
    id: string,
    data: ParishionerUpdate
  ): Promise<APIResponse<Parishioner>> {
    return this.request(`/api/v1/parishioners/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /** Upload parishioners from a CSV file. Returns a summary of the import result. */
  async uploadParishionersCsv(file: File): Promise<APIResponse<{ created: number; skipped: number; errors: string[] }>> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${this.baseUrl}/api/v1/parishioners/upload-csv`, {
      method: "POST",
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new APIError(res.status, body?.detail ?? res.statusText);
    }
    return res.json();
  }

  generateChurchId(
    id: string,
    oldChurchId: string,
    opts: { send_email?: boolean; send_sms?: boolean } = {}
  ): Promise<APIResponse<{ old_church_id: string; new_church_id: string }>> {
    return this.request(
      `/api/v1/parishioners/${id}/generate-church-id${this.buildQuery({ old_church_id: oldChurchId, ...opts })}`
    );
  }

  getParishionerLanguages(id: string): Promise<APIResponse<Array<{ id: number; name: string; description?: string | null }>>> {
    return this.request(`/api/v1/parishioners/${id}/languages`);
  }

  assignParishionerLanguages(id: string, languageIds: number[]): Promise<APIResponse<unknown>> {
    return this.request(`/api/v1/parishioners/${id}/languages/assign`, {
      method: "POST",
      body: JSON.stringify({ language_ids: languageIds }),
    });
  }

  removeParishionerLanguages(id: string, languageIds: number[]): Promise<APIResponse<unknown>> {
    return this.request(`/api/v1/parishioners/${id}/languages/remove`, {
      method: "POST",
      body: JSON.stringify({ language_ids: languageIds }),
    });
  }

  listAvailableLanguages(): Promise<APIResponse<Array<{ id: number; name: string; description?: string | null }>>> {
    return this.request("/api/v1/languages/available");
  }

  sendVerification(
    parishionerId: string,
    channel: "email" | "sms" | "both" = "both"
  ): Promise<APIResponse<unknown>> {
    return this.request(`/api/v1/parishioners/verify${this.buildQuery({ parishioner_id: parishionerId, channel })}`, {
      method: "POST",
    });
  }

  sendBatchVerification(data: {
    parishioner_ids?: string[];
    send_to_all_unverified?: boolean;
    channel?: "email" | "sms" | "both";
    church_unit_id?: number;
  }): Promise<APIResponse<{
    total: number;
    sent: number;
    skipped: number;
    details: Array<{ parishioner_id: string; status: "sent" | "skipped"; reason?: string }>;
  }>> {
    return this.request("/api/v1/parishioners/verify/batch", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  sendBulkMessage(data: {
    parishioner_ids: string[];
    channel?: "email" | "sms" | "both";
    custom_message?: string | null;
    template?: string;
    subject?: string | null;
    event_name?: string | null;
    event_date?: string | null;
    event_time?: string | null;
  }): Promise<APIResponse<unknown>> {
    return this.request("/api/v1/bulk-message/send", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  listMessageTemplates(): Promise<APIResponse<import("./types").MessageTemplatesResponse>> {
    return this.request("/api/v1/bulk-message/templates");
  }

  createMessageTemplate(data: {
    name: string;
    content: string;
    description?: string | null;
  }): Promise<APIResponse<import("./types").MessageTemplate>> {
    return this.request("/api/v1/bulk-message/templates", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateMessageTemplate(
    id: string,
    data: { name?: string; content?: string; description?: string | null }
  ): Promise<APIResponse<import("./types").MessageTemplate>> {
    return this.request(`/api/v1/bulk-message/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  deleteMessageTemplate(id: string): Promise<APIResponse<unknown>> {
    return this.request(`/api/v1/bulk-message/templates/${id}`, { method: "DELETE" });
  }

  updateParishionerFamily(
    id: string,
    data: {
      spouse_name?: string | null;
      spouse_status?: string | null;
      spouse_phone?: string | null;
      father_name?: string | null;
      father_status?: string | null;
      mother_name?: string | null;
      mother_status?: string | null;
      children?: Array<{ name: string }> | null;
    }
  ): Promise<APIResponse<unknown>> {
    return this.request(`/api/v1/parishioners/${id}/family-info/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  createParishionerOccupation(
    id: string,
    data: { role: string; employer: string }
  ): Promise<APIResponse<{ id: number; role: string; employer: string }>> {
    return this.request(`/api/v1/parishioners/${id}/occupation`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateParishionerOccupation(
    id: string,
    data: { role?: string | null; employer?: string | null }
  ): Promise<APIResponse<{ id: number; role: string; employer: string }>> {
    return this.request(`/api/v1/parishioners/${id}/occupation`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  addParishionerSacrament(
    id: string,
    data: { sacrament_id: string; date_received?: string | null; place?: string | null; minister?: string | null; notes?: string | null }
  ): Promise<APIResponse<unknown>> {
    return this.request(`/api/v1/parishioners/${id}/sacraments/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  batchAddParishionerEmergencyContacts(
    parishionerId: string,
    contacts: Array<{ name: string; relationship: string; primary_phone: string; alternative_phone?: string | null }>
  ): Promise<APIResponse<unknown>> {
    return this.request(`/api/v1/parishioners/${parishionerId}/emergency-contacts/batch`, {
      method: 'POST',
      body: JSON.stringify(contacts),
    });
  }

  batchAddParishionerMedicalConditions(
    parishionerId: string,
    conditions: Array<{ condition: string; notes?: string | null }>
  ): Promise<APIResponse<unknown>> {
    return this.request(`/api/v1/parishioners/${parishionerId}/medical-conditions/batch`, {
      method: 'POST',
      body: JSON.stringify(conditions),
    });
  }

  batchAddParishionerSacraments(
    parishionerId: string,
    sacraments: Array<{ sacrament_id: number; date_received?: string | null; place?: string | null; minister?: string | null; notes?: string | null }>
  ): Promise<APIResponse<unknown>> {
    return this.request(`/api/v1/parishioners/${parishionerId}/sacraments/batch`, {
      method: 'POST',
      body: JSON.stringify(sacraments),
    });
  }

  batchAddParishionerSkills(
    parishionerId: string,
    skills: Array<{ name: string }>
  ): Promise<APIResponse<unknown>> {
    return this.request(`/api/v1/parishioners/${parishionerId}/skills/batch`, {
      method: 'POST',
      body: JSON.stringify(skills),
    });
  }

  updateParishionerSacrament(
    parishionerId: string,
    sacramentRecordId: number,
    data: { type?: string | null; date?: string | null; place?: string | null; minister?: string | null }
  ): Promise<APIResponse<unknown>> {
    return this.request(`/api/v1/parishioners/${parishionerId}/sacraments/${sacramentRecordId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  deleteParishionerSacrament(parishionerId: string, sacramentRecordId: number): Promise<APIResponse<null>> {
    return this.request(`/api/v1/parishioners/${parishionerId}/sacraments/${sacramentRecordId}`, {
      method: "DELETE",
    });
  }

  addParishionerSkill(id: string, name: string): Promise<APIResponse<{ id: number; name: string }>> {
    return this.request(`/api/v1/parishioners/${id}/skills/`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  removeParishionerSkill(parishionerId: string, skillId: number): Promise<APIResponse<null>> {
    return this.request(`/api/v1/parishioners/${parishionerId}/skills/${skillId}`, {
      method: "DELETE",
    });
  }

  // ── Sacraments ────────────────────────────────────────────────────────────

  listSacraments(): Promise<APIResponse<unknown[]>> {
    return this.request("/api/v1/sacraments/all");
  }

  getSacrament(id: number | string): Promise<APIResponse<unknown>> {
    return this.request(`/api/v1/sacraments/${id}`);
  }

  updateSacrament(
    id: number | string,
    data: { type?: string; date?: string | null; place?: string | null; minister?: string | null }
  ): Promise<APIResponse<unknown>> {
    return this.request(`/api/v1/sacraments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ── Admin Settings ─────────────────────────────────────────────────────────

  /** Get all raw settings as a list of SettingRead. */
  getSettings(): Promise<APIResponse<SettingRead[]>> {
    return this.request("/api/v1/admin/settings");
  }

  /** Bulk-update settings by key→value map. */
  updateSettings(data: SettingsBulkUpdate): Promise<APIResponse<SettingRead[]>> {
    return this.request("/api/v1/admin/settings", { method: "PUT", body: JSON.stringify(data) });
  }

  /** Get app branding/contact config (name, description, contact_email, etc.). */
  getAppSettings(): Promise<APIResponse<Record<string, string | null>>> {
    return this.request("/api/v1/admin/settings/app");
  }

  /** Update app branding/contact config. */
  updateAppSettings(data: AppConfigUpdate): Promise<APIResponse<Record<string, string | null>>> {
    return this.request("/api/v1/admin/settings/app", { method: "PUT", body: JSON.stringify(data) });
  }

  /** Get auth method config (login methods, OTP). */
  getAuthSettings(): Promise<APIResponse<Record<string, string | null>>> {
    return this.request("/api/v1/admin/settings/auth");
  }

  /** Update auth method config. */
  updateAuthSettings(data: AuthConfigUpdate): Promise<APIResponse<Record<string, string | null>>> {
    return this.request("/api/v1/admin/settings/auth", { method: "PUT", body: JSON.stringify(data) });
  }

  // ── Roles & Permissions ────────────────────────────────────────────────────

  listPermissions(): Promise<APIResponse<PermissionRead[]>> {
    return this.request("/api/v1/admin/permissions");
  }

  listRoles(): Promise<APIResponse<RoleRead[]>> {
    return this.request("/api/v1/admin/roles");
  }

  getRole(id: number): Promise<APIResponse<RoleRead>> {
    return this.request(`/api/v1/admin/roles/${id}`);
  }

  createRole(data: RoleCreate): Promise<APIResponse<RoleRead>> {
    return this.request("/api/v1/admin/roles", { method: "POST", body: JSON.stringify(data) });
  }

  updateRole(id: number, data: RoleUpdate): Promise<APIResponse<RoleRead>> {
    return this.request(`/api/v1/admin/roles/${id}`, { method: "PUT", body: JSON.stringify(data) });
  }

  deleteRole(id: number): Promise<APIResponse<null>> {
    return this.request(`/api/v1/admin/roles/${id}`, { method: "DELETE" });
  }

  setRolePermissions(id: number, data: RolePermissionsUpdate): Promise<APIResponse<RoleRead>> {
    return this.request(`/api/v1/admin/roles/${id}/permissions`, { method: "PUT", body: JSON.stringify(data) });
  }

  // ── Statistics ─────────────────────────────────────────────────────────────

  /** Get parishioner statistics summary, optionally filtered by church unit. */
  getParishionerStats(params: { church_unit_id?: number } = {}): Promise<APIResponse<{
    total_parishioners: number;
    total_societies: number;
    total_outstations: number;
    total_church_communities: number;
    parishioners_in_societies: number;
    parishioners_without_society: number;
    gender_distribution: Record<string, number>;
    age_group_distribution: Record<string, number>;
    marital_status_distribution: Record<string, number>;
    sacraments_distribution: Record<string, number>;
    society_distribution: Record<string, number>;
    church_community_distribution: Record<string, number>;
    outstation_distribution: Record<string, number>;
    day_of_week_born_distribution: Record<string, number>;
  }>> {
    return this.request(`/api/v1/statistics/parishioners${this.buildQuery(params)}`);
  }

  /** Get system health status for all backend services. */
  getSystemHealth(): Promise<{
    status: string;
    timestamp: string;
    version: string;
    environment: string;
    services: Record<string, { status: string; latency_ms?: number; jobs?: Array<{ id: string; next_run: string }> }>;
  }> {
    return this.request("/api/v1/health");
  }

  /** Fetch the dynamic registration form schema (sections, fields, options). */
  getRegistrationSchema(): Promise<{
    message: string;
    data: {
      sections: Array<{
        key: string;
        label: string;
        type: 'fields' | 'object' | 'repeatable_section' | 'tag_input' | 'multiselect';
        description?: string;
        max_items?: number;
        fields?: Array<{
          key: string;
          label: string;
          type: string;
          required?: boolean;
          default?: unknown;
          min_length?: number;
          max_length?: number;
          placeholder?: string;
          options?: Array<{ value: unknown; label: string; description?: string; once_only?: boolean; unit_type?: string }>;
          conditional?: { field: string; value: unknown };
          fields?: Array<{ key: string; label: string; type: string; required?: boolean; min_length?: number; max_length?: number }>;
        }>;
        field?: { key: string; label: string; type: string; required?: boolean };
        options?: Array<{ value: number; label: string }>;
        existing_options?: Array<{ value: number; label: string }>;
        submit_as?: string;
      }>;
    };
  }> {
    return this.request('/api/v1/parishioners/registration-schema');
  }

  /** Get recent audit/activity log entries. */
  getAuditLogs(params: { user_id?: string; method?: string; search?: string; skip?: number; limit?: number } = {}): Promise<APIResponse<PagedData<{
    id: number;
    user_id: string | null;
    user_name: string;
    method: string;
    path: string;
    status_code: number;
    ip_address: string | null;
    summary: string;
    created_at: string;
  }>>> {
    return this.request(`/api/v1/admin/audit-logs${this.buildQuery(params)}`);
  }

  /** Registration stats — verification funnel + church ID coverage. */
  getRegistrationStats(): Promise<APIResponse<{
    total_parishioners: number;
    total_verified: number;
    total_pending_verification: number;
    total_unverified: number;
    total_with_new_church_id: number;
    total_without_new_church_id: number;
  }>> {
    return this.request("/api/v1/statistics/registration");
  }

  /** Parishioner data-quality breakdown — missing church IDs, unverified records, etc. */
  getDataQuality(): Promise<APIResponse<Record<string, unknown>>> {
    return this.request("/api/v1/parishioners/data-quality");
  }

  /** System-level dashboard stats — hierarchy, mass services, users, communications. */
  getDashboardSystemStats(): Promise<APIResponse<{
    church_hierarchy: {
      total_parishes: number;
      total_outstations: number;
      total_units: number;
      active_units: number;
      outstations: Array<{ id: number; name: string; is_active: boolean; parent: string }>;
    };
    mass_services: {
      total_schedules: number;
      active_schedules: number;
      by_mass_type: Record<string, number>;
      by_day_of_week: Record<string, number>;
    };
    users_and_access: {
      total_users: number;
      by_status: Record<string, number>;
      by_role: Record<string, number>;
      no_role_assigned: number;
    };
    communications: {
      by_status: Record<string, number>;
      total_recipients_reached: number;
    };
  }>> {
    return this.request("/api/v1/statistics/dashboard/system");
  }

  /** Station-level dashboard stats — rich demographics, society/community/sacrament detail. */
  getDashboardStationStats(churchUnitId?: number): Promise<APIResponse<{
    scoped_to_unit_id: number | null;
    overview: {
      total_parishioners: number;
      active: number;
      deceased: number;
      verified: number;
      pending_verification: number;
      unverified: number;
      with_church_id: number;
      without_church_id: number;
      verification_rate_pct: number;
      church_id_coverage_pct: number;
    };
    demographics: {
      gender: Record<string, number>;
      age_groups: {
        total: Record<string, number>;
        by_gender: Record<string, Record<string, number>>;
      };
      marital_status: {
        total: Record<string, number>;
        by_gender: Record<string, Record<string, number>>;
      };
      birth_day_of_week: {
        total: Record<string, number>;
        by_gender: Record<string, Record<string, number>>;
      };
    };
    societies: {
      total_societies: number;
      parishioners_in_at_least_one_society: number;
      parishioners_not_in_any_society: number;
      society_coverage_pct: number;
      by_society: Record<string, {
        total_members: number;
        by_gender: Record<string, number>;
        by_membership_status: Record<string, number>;
      }>;
    };
    church_communities: {
      total_communities: number;
      parishioners_without_community: number;
      community_coverage_pct: number;
      by_community: Record<string, {
        total_members: number;
        by_gender: Record<string, number>;
        by_marital_status: Record<string, number>;
      }>;
    };
    sacraments: Record<string, {
      count: number;
      percentage: number;
      by_gender: Record<string, number>;
      by_community: Record<string, number>;
      by_age_group: Record<string, number>;
    }>;
    financials: { _note?: string };
  }>> {
    const headers: Record<string, string> = churchUnitId ? { 'X-Church-Unit-Id': String(churchUnitId) } : {};
    return this.request("/api/v1/statistics/dashboard/station", { headers });
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  listUsers(
    params: PaginationParams = {}
  ): Promise<APIResponse<PagedData<User>>> {
    return this.request(
      `/api/v1/user-management${this.buildQuery(params)}`
    );
  }

  getUser(id: string): Promise<APIResponse<User>> {
    return this.request(`/api/v1/user-management/${id}`);
  }

  createUser(data: UserCreate): Promise<APIResponse<User>> {
    return this.request("/api/v1/user-management", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateUser(id: string, data: UserUpdate): Promise<APIResponse<User>> {
    return this.request(`/api/v1/user-management/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  deleteUser(id: string): Promise<APIResponse<null>> {
    return this.request(`/api/v1/user-management/${id}`, { method: "DELETE" });
  }

  getUserChurchUnits(userId: string): Promise<APIResponse<ChurchUnitSummary[]>> {
    return this.request(`/api/v1/user-management/${userId}/church-units`);
  }

  assignUserChurchUnits(userId: string, assignments: ChurchUnitAssignment[]): Promise<APIResponse<null>> {
    return this.request(`/api/v1/user-management/${userId}/church-units`, {
      method: "POST",
      body: JSON.stringify(assignments),
    });
  }

  replaceUserChurchUnits(userId: string, assignments: ChurchUnitAssignment[]): Promise<APIResponse<null>> {
    return this.request(`/api/v1/user-management/${userId}/church-units`, {
      method: "PUT",
      body: JSON.stringify(assignments),
    });
  }

  removeUserChurchUnit(userId: string, unitId: number): Promise<APIResponse<null>> {
    return this.request(`/api/v1/user-management/${userId}/church-units/${unitId}`, {
      method: "DELETE",
    });
  }

  // ── Leadership ────────────────────────────────────────────────────────────

  /** List leadership for the primary parish. currentOnly defaults to true. */
  listParishLeadership(currentOnly = true): Promise<APIResponse<LeadershipRead[]>> {
    return this.request(`/api/v1/parish/leadership${this.buildQuery({ current_only: currentOnly })}`);
  }

  createParishLeadership(data: LeadershipCreate): Promise<APIResponse<LeadershipRead>> {
    return this.request("/api/v1/parish/leadership", { method: "POST", body: JSON.stringify(data) });
  }

  updateParishLeadership(id: number, data: LeadershipUpdate): Promise<APIResponse<LeadershipRead>> {
    return this.request(`/api/v1/parish/leadership/${id}`, { method: "PUT", body: JSON.stringify(data) });
  }

  deleteParishLeadership(id: number): Promise<APIResponse<null>> {
    return this.request(`/api/v1/parish/leadership/${id}`, { method: "DELETE" });
  }

  listOutstationLeadership(outstationId: number, currentOnly = true): Promise<APIResponse<LeadershipRead[]>> {
    return this.request(`/api/v1/parish/outstations/${outstationId}/leadership${this.buildQuery({ current_only: currentOnly })}`);
  }

  createOutstationLeadership(outstationId: number, data: LeadershipCreate): Promise<APIResponse<LeadershipRead>> {
    return this.request(`/api/v1/parish/outstations/${outstationId}/leadership`, { method: "POST", body: JSON.stringify(data) });
  }

  updateOutstationLeadership(outstationId: number, id: number, data: LeadershipUpdate): Promise<APIResponse<LeadershipRead>> {
    return this.request(`/api/v1/parish/outstations/${outstationId}/leadership/${id}`, { method: "PUT", body: JSON.stringify(data) });
  }

  deleteOutstationLeadership(outstationId: number, id: number): Promise<APIResponse<null>> {
    return this.request(`/api/v1/parish/outstations/${outstationId}/leadership/${id}`, { method: "DELETE" });
  }

  listUnitLeadership(unitId: number, currentOnly = true): Promise<APIResponse<LeadershipRead[]>> {
    return this.request(`/api/v1/parish/units/${unitId}/leadership${this.buildQuery({ current_only: currentOnly })}`);
  }

  createUnitLeadership(unitId: number, data: LeadershipCreate): Promise<APIResponse<LeadershipRead>> {
    return this.request(`/api/v1/parish/units/${unitId}/leadership`, { method: "POST", body: JSON.stringify(data) });
  }

  getUnitLeadership(unitId: number, id: number): Promise<APIResponse<LeadershipRead>> {
    return this.request(`/api/v1/parish/units/${unitId}/leadership/${id}`);
  }

  updateUnitLeadership(unitId: number, id: number, data: LeadershipUpdate): Promise<APIResponse<LeadershipRead>> {
    return this.request(`/api/v1/parish/units/${unitId}/leadership/${id}`, { method: "PUT", body: JSON.stringify(data) });
  }

  deleteUnitLeadership(unitId: number, id: number): Promise<APIResponse<null>> {
    return this.request(`/api/v1/parish/units/${unitId}/leadership/${id}`, { method: "DELETE" });
  }

  // ── Church Events ─────────────────────────────────────────────────────────

  listParishEvents(params: { upcoming_only?: boolean; from_date?: string; to_date?: string } = {}): Promise<APIResponse<ChurchEventRead[]>> {
    return this.request(`/api/v1/parish/events${this.buildQuery(params)}`);
  }

  createParishEvent(data: ChurchEventCreate): Promise<APIResponse<ChurchEventRead>> {
    return this.request("/api/v1/parish/events", { method: "POST", body: JSON.stringify(data) });
  }

  updateParishEvent(id: number, data: ChurchEventUpdate): Promise<APIResponse<ChurchEventRead>> {
    return this.request(`/api/v1/parish/events/${id}`, { method: "PUT", body: JSON.stringify(data) });
  }

  deleteParishEvent(id: number): Promise<APIResponse<null>> {
    return this.request(`/api/v1/parish/events/${id}`, { method: "DELETE" });
  }

  listOutstationEvents(outstationId: number, params: { upcoming_only?: boolean; from_date?: string; to_date?: string } = {}): Promise<APIResponse<ChurchEventRead[]>> {
    return this.request(`/api/v1/parish/outstations/${outstationId}/events${this.buildQuery(params)}`);
  }

  createOutstationEvent(outstationId: number, data: ChurchEventCreate): Promise<APIResponse<ChurchEventRead>> {
    return this.request(`/api/v1/parish/outstations/${outstationId}/events`, { method: "POST", body: JSON.stringify(data) });
  }

  updateOutstationEvent(outstationId: number, id: number, data: ChurchEventUpdate): Promise<APIResponse<ChurchEventRead>> {
    return this.request(`/api/v1/parish/outstations/${outstationId}/events/${id}`, { method: "PUT", body: JSON.stringify(data) });
  }

  deleteOutstationEvent(outstationId: number, id: number): Promise<APIResponse<null>> {
    return this.request(`/api/v1/parish/outstations/${outstationId}/events/${id}`, { method: "DELETE" });
  }

  listUnitEvents(unitId: number, params: { upcoming_only?: boolean; from_date?: string; to_date?: string } = {}): Promise<APIResponse<ChurchEventRead[]>> {
    return this.request(`/api/v1/parish/units/${unitId}/events${this.buildQuery(params)}`);
  }

  createUnitEvent(unitId: number, data: ChurchEventCreate): Promise<APIResponse<ChurchEventRead>> {
    return this.request(`/api/v1/parish/units/${unitId}/events`, { method: "POST", body: JSON.stringify(data) });
  }

  getUnitEvent(unitId: number, id: number): Promise<APIResponse<ChurchEventRead>> {
    return this.request(`/api/v1/parish/units/${unitId}/events/${id}`);
  }

  updateUnitEvent(unitId: number, id: number, data: ChurchEventUpdate): Promise<APIResponse<ChurchEventRead>> {
    return this.request(`/api/v1/parish/units/${unitId}/events/${id}`, { method: "PUT", body: JSON.stringify(data) });
  }

  deleteUnitEvent(unitId: number, id: number): Promise<APIResponse<null>> {
    return this.request(`/api/v1/parish/units/${unitId}/events/${id}`, { method: "DELETE" });
  }

  // ── Global Events API ────────────────────────────────────────────────────────

  listEvents(params: EventListParams = {}): Promise<APIResponse<EventsPagedData>> {
    return this.request(`/api/v1/events${this.buildQuery(params)}`);
  }

  createEvent(data: ChurchEventCreate): Promise<APIResponse<ChurchEventRead>> {
    return this.request(`/api/v1/events`, { method: "POST", body: JSON.stringify(data) });
  }

  terminateEvent(id: number): Promise<APIResponse<ChurchEventRead>> {
    return this.request(`/api/v1/events/${id}/terminate`, { method: "POST" });
  }

  addEventMessage(id: number, data: EventMessageCreate): Promise<APIResponse<EventMessageRead>> {
    return this.request(`/api/v1/events/${id}/messages`, { method: "POST", body: JSON.stringify(data) });
  }

  listEventMessages(id: number): Promise<APIResponse<EventMessageRead[]>> {
    return this.request(`/api/v1/events/${id}/messages`);
  }

  // ── Emergency Contacts ──────────────────────────────────────────────────────

  addParishionerEmergencyContact(parishionerId: string, data: EmergencyContactCreate): Promise<APIResponse<{ id: number } & EmergencyContactCreate>> {
    return this.request(`/api/v1/parishioners/${parishionerId}/emergency-contacts`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateParishionerEmergencyContact(parishionerId: string, contactId: number, data: EmergencyContactUpdate): Promise<APIResponse<unknown>> {
    return this.request(`/api/v1/parishioners/${parishionerId}/emergency-contacts/${contactId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  deleteParishionerEmergencyContact(parishionerId: string, contactId: number): Promise<APIResponse<null>> {
    return this.request(`/api/v1/parishioners/${parishionerId}/emergency-contacts/${contactId}`, {
      method: "DELETE",
    });
  }

  // ── Medical Conditions ───────────────────────────────────────────────────────

  addParishionerMedicalCondition(parishionerId: string, data: MedicalConditionCreate): Promise<APIResponse<{ id: number; condition: string; notes?: string | null }>> {
    return this.request(`/api/v1/parishioners/${parishionerId}/medical-conditions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateParishionerMedicalCondition(parishionerId: string, conditionId: number, data: MedicalConditionUpdate): Promise<APIResponse<unknown>> {
    return this.request(`/api/v1/parishioners/${parishionerId}/medical-conditions/${conditionId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  deleteParishionerMedicalCondition(parishionerId: string, conditionId: number): Promise<APIResponse<null>> {
    return this.request(`/api/v1/parishioners/${parishionerId}/medical-conditions/${conditionId}`, {
      method: "DELETE",
    });
  }

  // ── Reports ──────────────────────────────────────────────────────────────────

  async downloadParishionerReport(parishionerId: string, format: 'pdf' | 'csv' = 'pdf'): Promise<Blob> {
    const res = await fetch(`${this.baseUrl}/api/v1/parishioners/report?parishioner_id=${parishionerId}&format=${format}`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const detail = body?.detail ?? res.statusText;
      if (res.status === 401) this.onUnauthorized?.();
      throw new APIError(res.status, detail);
    }
    return res.blob();
  }
}
