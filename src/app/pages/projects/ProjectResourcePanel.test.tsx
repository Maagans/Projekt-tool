import type { ReactNode } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
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

const mockRouteContext = useProjectRouteContext as unknown as vi.Mock;
const mockAnalyticsHook = useResourceAnalytics as unknown as vi.Mock;

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
    expect(screen.getByText("Kapacitet")).toBeInTheDocument();
    expect(screen.getByText("Planlagt")).toBeInTheDocument();
    expect(screen.getByText("Faktisk")).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Prøv igen" }));
    expect(refetchSpy).toHaveBeenCalled();
  });
});
