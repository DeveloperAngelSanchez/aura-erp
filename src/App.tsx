import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { CashProvider } from './context/CashContext';
import { SettingsProvider } from './context/SettingsContext';
import { EmpresaProvider } from './context/EmpresaContext';
import { PermissionsProvider } from './context/PermissionsContext';
import { AppRoutes } from './routes';

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <EmpresaProvider>
            <PermissionsProvider>
              <SettingsProvider>
                <CashProvider>
                  <AppRoutes />
                </CashProvider>
              </SettingsProvider>
            </PermissionsProvider>
          </EmpresaProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
