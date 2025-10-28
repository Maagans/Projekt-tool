import { BrowserRouter } from 'react-router-dom';
import { ProjectManagerProvider } from './hooks/useProjectManager';
import { AppShell } from './app/AppShell';

const App = () => (
  <ProjectManagerProvider>
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  </ProjectManagerProvider>
);

export default App;

