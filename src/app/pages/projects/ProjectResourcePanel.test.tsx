import type { ReactNode } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../constants", () => ({ RESOURCES_ANALYTICS_ENABLED: true }));

vi.mock("./ProjectLayout", () => ({
  useProjectRouteContext: vi.fn(),
}));

vi.mock("../../../hooks/useResourceAnalytics", () => ({
  useResourceAnalytics: vi.fn(),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid="chart">{children}</div>,
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Line: () => null,
  ReferenceArea: () => null,
}));

import { ProjectResourcePanel } from "./ProjectResourcePanel";
import { useProjectRouteContext } from "./ProjectLayout";
import { useResourceAnalytics } from "../../../hooks/useResourceAnalytics";

const mockRouteContext = useProjectRouteContext as unknown as Mock;
const mockAnalyticsHook = useResourceAnalytics as unknown as Mock;

const createProject = () => ({
  id: "project-1",
  config: { projectName: "Apollo", projectStartDate: "2025-01-01", projectEndDate: "2025-12-31" },
  reports: [],
});

const createManager = (overrides: Partial<ReturnType<typeof useProjectRouteContext>["projectManager"]> = {}) => ({
  canManage: true,
  isAdministrator: true,
  logout: vi.fn(),
  currentUser: { id: "user-1", name: "Admin", email: "admin@example.com", role: "Administrator" },
  isSaving: false,
  apiError: null,
  ...overrides,
});

const createAnalyticsData = () => ({
  data: {
    scope: { type: "project", id: "project-1" },
    series: [
      { week: "2025-W01", capacity: 80, planned: 70, actual: 60 },
      { week: "2025-W02", capacity: 80, planned: 90, actual: 85 },
    ],
    overAllocatedWeeks: ["2025-W02"],
    overAllocatedWeeksSet: new Set(["2025-W02"]),
    hasData: true,
    hasOverAllocation: true,
    range: { fromWeek: "2025-W01", toWeek: "2025-W02" },
    latestPoint: { week: "2025-W02", capacity: 80, planned: 90, actual: 85 },
    summary: {
      totalCapacity: 160,
      totalPlanned: 160,
      totalActual: 145,
      averageCapacity: 80,
      averagePlanned: 80,
      averageActual: 72.5,
      weeks: 2,
    },
    cumulativeSeries: [
      { week: "2025-W01", capacity: 80, planned: 70, actual: 60 },
      { week: "2025-W02", capacity: 160, planned: 160, actual: 145 },
    ],
  },
  isPending: false,
  isFetching: false,
  isError: false,
  error: undefined,
  refetch: vi.fn(),
});

describe("ProjectResourcePanel", () => {
  beforeEach(() => {
    mockRouteContext.mockReset();
    mockAnalyticsHook.mockReset();

    mockRouteContext.mockReturnValue({
      project: createProject(),
      projectManager: createManager(),
    });
    mockAnalyticsHook.mockReturnValue(createAnalyticsData());
  });

  it("renders summary cards and chart", () => {
    render(<ProjectResourcePanel />);

    expect(screen.getByText("Ressourceoverblik")).toBeInTheDocument();
    expect(screen.getByText("Planlagt (seneste uge)")).toBeInTheDocument();
    expect(screen.getByText("Faktisk (seneste uge)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Opsummeret" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kumulativ" })).toBeInTheDocument();
    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });

  it("returns null when user cannot manage project", () => {
    mockRouteContext.mockReturnValue({
      project: createProject(),
      projectManager: createManager({ canManage: false }),
    });

    const { container } = render(<ProjectResourcePanel />);
    expect(container.firstChild).toBeNull();
  });

  it("renders error state and allows retry", () => {
    const refetchSpy = vi.fn();
    mockAnalyticsHook.mockReturnValue({
      ...createAnalyticsData(),
      isError: true,
      data: undefined,
      error: new Error("Network failure"),
      refetch: refetchSpy,
    });

    render(<ProjectResourcePanel />);

    expect(screen.getByText("Kunne ikke hente data")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /pr.*igen/i }));
    expect(refetchSpy).toHaveBeenCalled();
  });

  it("shows aggregated totals when switching to summary view", () => {
    render(<ProjectResourcePanel />);

    fireEvent.click(screen.getByRole("button", { name: "Opsummeret" }));

    expect(screen.getByText("Total planlagt")).toBeInTheDocument();
    expect(screen.getByText("Total faktisk")).toBeInTheDocument();
  });

  it("switches to cumulative view and shows cumulative cards", () => {
    render(<ProjectResourcePanel />);

    fireEvent.click(screen.getByRole("button", { name: "Kumulativ" }));

    expect(screen.getByText("Kumulativ planlagt")).toBeInTheDocument();
    expect(screen.getByText("Kumulativ faktisk")).toBeInTheDocument();
  });
});


