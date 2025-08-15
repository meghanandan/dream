import 'src/global.css';
import { Router } from 'src/routes/sections';
import { useScrollToTop } from 'src/hooks/use-scroll-to-top';
import { LocalizationProvider } from 'src/locales';
import { I18nProvider } from 'src/locales/i18n-provider';
import { ThemeProvider } from 'src/theme/theme-provider';
import { Snackbar } from 'src/components/snackbar';
import { ProgressBar } from 'src/components/progress-bar';
import { MotionLazy } from 'src/components/animate/motion-lazy';
import { SettingsDrawer, defaultSettings, SettingsProvider } from 'src/components/settings';
import { Provider } from 'react-redux';
import store from './store';

export default function App() {
  useScrollToTop();

  return (
    <I18nProvider>
      <LocalizationProvider>
        <Provider store={store}>
          <SettingsProvider settings={defaultSettings}>
            <ThemeProvider>
              <MotionLazy>
                <Snackbar />
                <ProgressBar />
                <SettingsDrawer />
                <Router />
              </MotionLazy>
            </ThemeProvider>
          </SettingsProvider>
        </Provider>
      </LocalizationProvider>
    </I18nProvider>
  );
}
