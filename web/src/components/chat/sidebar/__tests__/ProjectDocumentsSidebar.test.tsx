import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import mockTheme from "../../../../__mocks__/themeMock";

type MockDoc = {
  type: string;
  ref: string;
  name: string;
  status?: { kind: string; shots: number; stills: number; clips: number };
};
type MockResult = {
  data: { project: { id: string; name: string; isPersonal?: boolean }; documents: MockDoc[] };
  isPending: boolean;
  error: null;
};

const openTab = jest.fn();
const getProject = jest.fn((input: { id: string }): MockResult => ({
  data: {
    project: { id: input.id, name: `Project ${input.id}` },
    documents: [{
      type: "storyboard",
      ref: `${input.id}-board`,
      name: `${input.id} board`,
      status: { kind: "storyboard", shots: 4, stills: 3, clips: 2 }
    }]
  },
  isPending: false,
  error: null
}));

jest.mock("../../../../trpc/client", () => ({
  trpc: { projects: { get: { useQuery: (input: { id: string }) => getProject(input) } } }
}));

jest.mock("../../../../stores/WorkspaceTabsStore", () => ({
  useWorkspaceTabsStore: <T,>(selector: (state: { openTab: jest.Mock }) => T) =>
    selector({ openTab })
}));

import ProjectDocumentsSidebar from "../ProjectDocumentsSidebar";

const renderSidebar = (projectId: string) => render(
  <ThemeProvider theme={mockTheme}>
    <ProjectDocumentsSidebar projectId={projectId} active />
  </ThemeProvider>
);

beforeEach(() => jest.clearAllMocks());

it("lists the current project's documents and opens them in that project", async () => {
  const { rerender } = renderSidebar("p1");
  expect(screen.getByRole("complementary", { name: "Project documents" })).toBeInTheDocument();
  expect(screen.getByText("Project p1")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "p1 board" }));
  expect(openTab).toHaveBeenCalledWith({
    type: "storyboard",
    ref: "p1-board",
    title: "p1 board",
    projectId: "p1"
  });

  rerender(
    <ThemeProvider theme={mockTheme}>
      <ProjectDocumentsSidebar projectId="p2" active />
    </ThemeProvider>
  );
  expect(getProject).toHaveBeenCalledWith({ id: "p2" });
  expect(screen.getByRole("button", { name: "p2 board" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "p1 board" })).not.toBeInTheDocument();
});

it("renders the count through the catalog and seeds through seededDocDisplayName", () => {
  getProject.mockReturnValue({
    data: {
      project: { id: "p9", name: "Project p9" },
      documents: [
        { type: "script", ref: "d1", name: "New script" },
        { type: "storyboard", ref: "d2", name: "New storyboard" },
        { type: "sketch", ref: "d3", name: "My drawing" }
      ]
    },
    isPending: false,
    error: null
  });
  renderSidebar("p9");
  expect(screen.getByText("Documents · 3")).toBeInTheDocument();
  // Creation-time seeded defaults resolve at render (same map the tab bar
  // reads); a user-named document renders verbatim.
  expect(screen.getByText("Scripts")).toBeInTheDocument();
  expect(screen.getByText("Storyboards")).toBeInTheDocument();
  expect(screen.getByText("My drawing")).toBeInTheDocument();
});

it("labels the personal project through personalDisplayName", () => {
  getProject.mockReturnValue({
    data: {
      project: { id: "pers", name: "Personal", isPersonal: true },
      documents: []
    },
    isPending: false,
    error: null
  } as ReturnType<typeof getProject>);
  renderSidebar("pers");  expect(screen.getByText("Personal")).toBeInTheDocument();
  expect(screen.getByText("Documents")).toBeInTheDocument();
});
